import { z } from "zod";
import { auditSchema, resumeSchema } from "@/lib/cv-import-handoff";
import { emptyResume, STORAGE_KEY, type ResumeData } from "@/types/resume";

// Import validation supplies legacy defaults; persistence additionally validates
// the fields which imports do not use. Never silently discard photos or advice.
const storedResume = resumeSchema.extend({
  personal: resumeSchema.shape.personal.extend({
    photo: z.string().optional(),
    photoPosition: z.enum(["top-left", "top-right", "centre"]).optional(),
  }),
  hospitality: resumeSchema.shape.hospitality.default(emptyResume.hospitality),
  targetJobDescription: z.string().optional(),
  checkerAudit: auditSchema.optional(),
  formatting: z
    .object({
      fontFamily: z.enum(["Calibri", "Cambria", "Arial", "Helvetica", "Garamond"]),
      bodyFontSize: z.number().finite(),
      headingFontSize: z.number().finite(),
      lineSpacing: z.union([z.literal(1.15), z.literal(1.2)]),
      marginInches: z.union([z.literal(0.5), z.literal(0.75), z.literal(1)]),
    })
    .optional(),
  templateColours: z
    .record(
      z.object({
        primary: z.string(),
        accent: z.string(),
        text: z.string(),
        background: z.string(),
      }),
    )
    .optional(),
});

export function validateResume(value: unknown): ResumeData {
  return storedResume.parse(value);
}

export type SaveStatus =
  | "loading"
  | "unsaved"
  | "device-saved"
  | "saving"
  | "cloud-saved"
  | "save-failed"
  | "load-failed"
  | "recovery-needed"
  | "conflict";

export interface SaveSnapshot {
  data: ResumeData;
  hydrated: boolean;
  resumeId: string | null;
  saveStatus: SaveStatus;
  saveIssue: string | null;
}

interface Draft {
  version: 2;
  data: ResumeData;
  dirty: boolean;
  revision: string;
  writer: string;
  cloudExists: boolean;
}

const draftSchema = z.object({
  version: z.literal(2),
  data: storedResume,
  dirty: z.boolean(),
  revision: z.string(),
  writer: z.string(),
  cloudExists: z.boolean().default(true),
});

export function readDraft(raw: string): Draft {
  const value: unknown = JSON.parse(raw);
  if (typeof value === "object" && value && "version" in value) {
    return draftSchema.parse(value);
  }
  return {
    version: 2,
    data: validateResume(value),
    dirty: true,
    revision: "legacy",
    writer: "legacy",
    cloudExists: false,
  };
}

export const accountDraftKey = (userId: string, resumeId: string) =>
  `${STORAGE_KEY}:user:${encodeURIComponent(userId)}:resume:${encodeURIComponent(resumeId)}`;
export const accountActiveKey = (userId: string) =>
  `${STORAGE_KEY}:user:${encodeURIComponent(userId)}:active`;

export interface CloudResume {
  id: string;
  data: unknown;
  template_id: string;
}

export interface ResumeCloud {
  load(userId: string, id: string | null, signal: AbortSignal): Promise<CloudResume | null>;
  save(userId: string, id: string, data: ResumeData, signal: AbortSignal): Promise<void>;
}

/** One controller per editor/auth identity. The header only observes its snapshot. */
export class ResumePersistence {
  private snapshot: SaveSnapshot = {
    data: emptyResume,
    hydrated: false,
    resumeId: null,
    saveStatus: "loading",
    saveIssue: null,
  };
  private listeners = new Set<() => void>();
  private active = false;
  private generation = 0;
  private abort = new AbortController();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private inFlight = false;
  private revision = "";
  private acknowledged = "";
  private key = STORAGE_KEY;
  private knownRaw: string | null = null;
  private localSaved = false;
  private storageFailed = false;
  private blocked = false;
  private recoveryRaw: string | null = null;
  private cloudExists = false;
  private readonly writer = crypto.randomUUID();

  constructor(
    private readonly owner: string | null,
    private readonly cloud: ResumeCloud,
    private readonly storage: () => Storage = () => window.localStorage,
  ) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<SaveSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private current(generation: number) {
    return this.active && generation === this.generation;
  }
  private stopTimer() {
    clearTimeout(this.timer);
  }

  start = () => {
    this.active = true;
    window.addEventListener("storage", this.onStorage);
    void this.hydrate();
    return () => {
      this.active = false;
      this.generation++;
      this.abort.abort();
      this.stopTimer();
      window.removeEventListener("storage", this.onStorage);
    };
  };

  private async hydrate() {
    const generation = ++this.generation;
    this.abort.abort();
    this.abort = new AbortController();
    this.stopTimer();
    this.inFlight = false;
    this.blocked = false;
    this.storageFailed = false;
    this.localSaved = false;
    this.publish({
      data: emptyResume,
      hydrated: false,
      resumeId: null,
      saveStatus: "loading",
      saveIssue: null,
    });
    let id: string | null = null;
    let row: CloudResume | null = null;
    if (this.owner) {
      try {
        id = this.storage().getItem(accountActiveKey(this.owner));
        if (id && (id.length > 128 || !/^[\w-]+$/.test(id)))
          throw new Error("Invalid document pointer");
      } catch {
        // Do not accidentally select a different document when the pointer cannot be read.
        this.publish({
          saveStatus: "load-failed",
          saveIssue: "Could not read your saved document. Allow browser storage, then retry.",
        });
        return;
      }
      try {
        row = await this.cloud.load(this.owner, id, this.abort.signal);
        if (!this.current(generation)) return;
      } catch {
        if (!this.current(generation)) return;
        // A known document's device copy is safe to edit offline. Unknown identity
        // must not create a replacement for an existing, temporarily unavailable CV.
        if (id) {
          this.key = accountDraftKey(this.owner, id);
          try {
            const raw = this.storage().getItem(this.key);
            if (raw) {
              this.adopt(readDraft(raw), raw, id);
              this.publish({
                saveStatus: "save-failed",
                saveIssue:
                  "Cloud is unavailable. Your device copy is open; retry to save to cloud.",
              });
              return;
            }
          } catch {
            /* Retain unreadable recovery data; retry hydration. */
          }
        }
        this.publish({
          saveStatus: "load-failed",
          saveIssue:
            "Could not load your cloud CV. Retry before editing so existing work stays safe.",
        });
        return;
      }
      // A missing known ID may have been deleted elsewhere. Never recreate it automatically.
      if (id && !row) {
        try {
          const raw = this.storage().getItem(accountDraftKey(this.owner, id));
          if (!raw || readDraft(raw).cloudExists) {
            this.publish({
              saveStatus: "load-failed",
              saveIssue:
                "This saved CV is no longer available. Your device recovery copy has been kept.",
            });
            return;
          }
        } catch {
          this.publish({
            saveStatus: "load-failed",
            saveIssue: "Could not read the device recovery copy. The original has been kept.",
          });
          return;
        }
      }
      id = row?.id ?? id ?? crypto.randomUUID();
      this.key = accountDraftKey(this.owner, id);
    } else {
      this.key = STORAGE_KEY;
    }

    let raw: string | null;
    try {
      raw = this.storage().getItem(this.key);
    } catch {
      this.publish({
        resumeId: id,
        saveStatus: "load-failed",
        saveIssue:
          "Browser storage is unavailable. Allow it and retry to recover your draft safely.",
      });
      return;
    }
    this.knownRaw = raw;
    this.publish({ resumeId: id });
    try {
      let draft = raw ? readDraft(raw) : null;
      // Only a genuinely new account document may inherit the anonymous draft.
      // Existing cloud CVs never replace it or consume another user's recovery key.
      if (this.owner && !row && !draft) {
        const anonymous = this.storage().getItem(STORAGE_KEY);
        if (anonymous) draft = readDraft(anonymous);
      }
      const cloudData = row
        ? validateResume({ ...validateResume(row.data), templateId: row.template_id })
        : null;
      // Dirty recovery always wins over the cloud snapshot; a clean cached copy
      // must not roll back updates saved from another device.
      const data = draft && (!cloudData || draft.dirty) ? draft.data : (cloudData ?? emptyResume);
      const dirty = !!this.owner && (!cloudData || !!draft?.dirty);
      this.adopt(
        {
          version: 2,
          data,
          dirty,
          revision: draft?.revision ?? crypto.randomUUID(),
          writer: this.writer,
          cloudExists: !!row,
        },
        raw,
        id,
      );
      if (this.persistLocal() && !this.owner) this.publish({ saveStatus: "device-saved" });
      this.schedule();
    } catch {
      this.blocked = true;
      this.recoveryRaw = raw ?? JSON.stringify(row?.data);
      this.publish({
        saveStatus: "recovery-needed",
        saveIssue:
          "This saved CV could not be read. Download the recovery file before starting fresh. The original has not been changed.",
      });
    }
  }

  private adopt(draft: Draft, raw: string | null, id: string | null) {
    this.knownRaw = raw;
    this.revision = draft.revision;
    this.acknowledged = draft.dirty ? "" : draft.revision;
    this.cloudExists = draft.cloudExists;
    this.localSaved = !!raw;
    this.publish({
      data: draft.data,
      hydrated: true,
      resumeId: id,
      saveStatus: this.owner
        ? draft.dirty
          ? "unsaved"
          : "cloud-saved"
        : raw
          ? "device-saved"
          : "unsaved",
      saveIssue: null,
    });
  }

  private envelope(): Draft {
    return {
      version: 2,
      data: this.snapshot.data,
      dirty: !!this.owner && this.revision !== this.acknowledged,
      revision: this.revision,
      writer: this.writer,
      cloudExists: this.cloudExists,
    };
  }

  private conflict() {
    this.blocked = true;
    this.stopTimer();
    // Let any already-submitted save settle while holding the cross-tab lock.
    // Aborting a fetch cannot undo a write the server has already accepted.
    this.publish({
      saveStatus: "conflict",
      saveIssue:
        "Another tab changed this CV. Saving is paused. Download this copy before loading the other tab's version.",
    });
  }

  private persistLocal(): boolean {
    if (this.blocked || !this.active) return false;
    try {
      if (this.storage().getItem(this.key) !== this.knownRaw) {
        this.conflict();
        return false;
      }
      // Account pointer is written before its data: failure cannot make an orphan
      // recovery draft look safely saved under an undiscoverable document ID.
      if (this.owner && this.snapshot.resumeId)
        this.storage().setItem(accountActiveKey(this.owner), this.snapshot.resumeId);
      const raw = JSON.stringify(this.envelope());
      let existing: Draft | null = null;
      try {
        existing = this.knownRaw ? readDraft(this.knownRaw) : null;
      } catch {
        // Hydration blocks unreadable drafts. This path is reachable only after
        // the user explicitly backed up the original and chose to start fresh.
      }
      if (
        !existing ||
        JSON.stringify(existing.data) !== JSON.stringify(this.snapshot.data) ||
        existing.dirty !== this.envelope().dirty ||
        existing.cloudExists !== this.cloudExists
      ) {
        this.storage().setItem(this.key, raw);
        this.knownRaw = raw;
      }
      this.localSaved = true;
      this.storageFailed = false;
      return true;
    } catch {
      this.localSaved = false;
      this.storageFailed = true;
      this.publish({
        saveStatus: "save-failed",
        saveIssue:
          "Could not save on this device. Keep this page open, download a recovery copy, or free browser storage and retry.",
      });
      return false;
    }
  }

  setData = (action: ResumeData | ((data: ResumeData) => ResumeData)) => {
    if (!this.active || !this.snapshot.hydrated) return;
    const data = typeof action === "function" ? action(this.snapshot.data) : action;
    this.revision = crypto.randomUUID();
    this.localSaved = false;
    this.publish({ data, saveStatus: this.blocked ? this.snapshot.saveStatus : "unsaved" });
    if (this.persistLocal()) {
      this.publish({
        saveStatus: this.owner ? (this.inFlight ? "saving" : "unsaved") : "device-saved",
        saveIssue: null,
      });
    }
    this.schedule();
  };

  private schedule() {
    this.stopTimer();
    if (
      !this.owner ||
      !this.active ||
      this.blocked ||
      this.storageFailed ||
      this.inFlight ||
      this.revision === this.acknowledged
    )
      return;
    this.timer = setTimeout(() => {
      void this.flush();
    }, 1500);
  }

  private async flush() {
    if (!this.owner || !this.snapshot.resumeId || !this.active || this.blocked || this.inFlight)
      return;
    const generation = this.generation;
    this.inFlight = true;
    const save = async () => {
      if (!this.current(generation) || this.blocked) return;
      await this.saveLatest(generation);
    };
    try {
      // Prevent requests from two tabs being committed in the wrong order.
      // Storage checks/events still protect drafts on browsers without Web Locks.
      if (navigator.locks)
        await navigator.locks.request(
          `gethired-save:${this.key}`,
          { signal: this.abort.signal },
          save,
        );
      else await save();
    } catch {
      if (this.current(generation) && !this.blocked)
        this.publish({
          saveStatus: "save-failed",
          saveIssue: "Could not start cloud saving. Your device copy is kept. Retry to save.",
        });
    } finally {
      if (this.current(generation)) {
        this.inFlight = false;
        if (this.snapshot.saveStatus !== "save-failed") this.schedule();
      }
    }
  }

  private async saveLatest(generation: number) {
    if (!this.owner || !this.snapshot.resumeId) return;
    try {
      if (this.storage().getItem(this.key) !== this.knownRaw) {
        this.conflict();
        return;
      }
    } catch {
      this.persistLocal();
      return;
    }
    const revision = this.revision;
    const data = this.snapshot.data;
    this.publish({ saveStatus: "saving", saveIssue: null });
    try {
      await this.cloud.save(this.owner, this.snapshot.resumeId, data, this.abort.signal);
      if (!this.current(generation) || this.blocked) return;
      this.acknowledged = revision;
      this.cloudExists = true;
      if (this.persistLocal())
        this.publish({
          saveStatus: this.revision === revision ? "cloud-saved" : "unsaved",
          saveIssue: null,
        });
    } catch {
      if (!this.current(generation) || this.blocked) return;
      this.publish({
        saveStatus: "save-failed",
        saveIssue: this.localSaved
          ? "Cloud save failed. Your changes are saved on this device. Retry to save to cloud."
          : "Save failed. Keep this page open and download a recovery copy before retrying.",
      });
    }
  }

  retrySave = () => {
    if (!this.active || this.blocked) return;
    if (!this.snapshot.hydrated) {
      void this.hydrate();
      return;
    }
    if (this.inFlight) return;
    this.abort = new AbortController();
    if (this.persistLocal()) {
      this.publish({ saveStatus: this.owner ? "unsaved" : "device-saved", saveIssue: null });
      if (this.owner) void this.flush();
    }
  };

  private onStorage = (event: StorageEvent) => {
    if (!this.active || !this.snapshot.hydrated || (event.key !== this.key && event.key !== null))
      return;
    // Read current storage rather than a possibly superseded event payload.
    try {
      if (this.storage().getItem(this.key) !== this.knownRaw) this.conflict();
    } catch {
      this.conflict();
    }
  };

  downloadRecovery = () => {
    const raw = this.recoveryRaw ?? JSON.stringify(this.snapshot.data, null, 2);
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "GetHired-CV-recovery.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /** Explicit resolution preserves the current copy before replacing the editor. */
  resolveRecovery = () => {
    if (!this.active || !this.blocked) return;
    try {
      this.storage().setItem(
        `${this.key}:recovery:${crypto.randomUUID()}`,
        this.recoveryRaw ?? JSON.stringify(this.snapshot.data),
      );
      const raw = this.storage().getItem(this.key);
      if (this.snapshot.saveStatus === "conflict") {
        if (!raw) throw new Error("The other draft was removed");
        const draft = readDraft(raw);
        this.generation++;
        this.inFlight = false;
        this.blocked = false;
        this.abort = new AbortController();
        this.adopt(draft, raw, this.snapshot.resumeId);
        // The other tab owns any cloud write; wait for a new user edit here.
      } else {
        this.blocked = false;
        this.recoveryRaw = null;
        this.knownRaw = raw;
        this.adopt(
          {
            version: 2,
            data: emptyResume,
            dirty: true,
            revision: crypto.randomUUID(),
            writer: this.writer,
            cloudExists: this.cloudExists,
          },
          raw,
          this.snapshot.resumeId,
        );
        if (this.persistLocal()) {
          this.publish({ saveStatus: this.owner ? "unsaved" : "device-saved", saveIssue: null });
          this.schedule();
        }
      }
    } catch {
      this.publish({
        saveIssue:
          "Could not preserve a recovery copy or load the other draft. Download your copy and keep this page open.",
      });
    }
  };
}
