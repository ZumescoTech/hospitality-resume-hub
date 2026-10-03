import type { SaveStatus } from "@/lib/resume-persistence";
import { LogoLockup } from "@/components/ui/LogoLockup";

const SAVE_LABELS: Record<SaveStatus, string> = {
  loading: "Loading draft…",
  unsaved: "Changes waiting to save",
  "device-saved": "Saved on this device",
  saving: "Saving to cloud…",
  "cloud-saved": "Saved to cloud",
  "save-failed": "Save needs attention",
  "load-failed": "Could not load draft",
  "recovery-needed": "Draft recovery needed",
  conflict: "Saving paused: another tab changed this CV",
};

export function AppHeader({ saveStatus }: { saveStatus: SaveStatus }) {
  const dotColour =
    saveStatus === "device-saved" || saveStatus === "cloud-saved" ? "#4cd6a0" : "#f0a500";
  const label = SAVE_LABELS[saveStatus];

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--brand)",
        color: "white",
        padding: "0 16px",
        height: "var(--header-h)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}
    >
      <LogoLockup variant="light" height={28} showWordmark={true} />
      <div
        style={{
          fontSize: "11px",
          color: "rgba(255,255,255,0.75)",
          display: "flex",
          alignItems: "center",
          gap: "5px",
        }}
      >
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: dotColour,
            flexShrink: 0,
            transition: "background 300ms ease",
          }}
        />
        <span role="status" aria-live="polite">
          {label}
        </span>
      </div>
    </header>
  );
}
