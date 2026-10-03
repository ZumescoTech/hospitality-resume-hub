import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyResume, STORAGE_KEY } from "@/types/resume";
import { useResumeStore } from "@/lib/resume-store";
import { AppHeader } from "@/components/ui/AppHeader";
import {
  accountActiveKey,
  accountDraftKey,
  readDraft,
  ResumePersistence,
} from "@/lib/resume-persistence";
import { SaveNotice } from "@/components/builder/SaveNotice";

const mocks = vi.hoisted(() => ({
  auth: { user: null as null | { id: string }, loading: false },
  load: vi.fn(),
  save: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/hooks/use-user", () => ({ useUser: () => mocks.auth }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/components/ui/LogoLockup", () => ({ LogoLockup: () => <span>GetHired</span> }));

function named(name: string) {
  return { ...emptyResume, personal: { ...emptyResume.personal, fullName: name } };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function Editor() {
  const store = useResumeStore();
  return (
    <>
      <AppHeader saveStatus={store.saveStatus} />
      <input
        aria-label="Test name"
        value={store.data.personal.fullName}
        onChange={(e) => store.setData(named(e.target.value))}
      />
    </>
  );
}
beforeEach(() => {
  localStorage.clear();
  mocks.auth = { user: null, loading: false };
  mocks.load.mockReset().mockResolvedValue({ data: null, error: null });
  mocks.save.mockReset().mockResolvedValue({ error: null });
  mocks.from.mockReset().mockImplementation(() => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      abortSignal: () => chain,
      maybeSingle: mocks.load,
      upsert: (...args: unknown[]) => {
        const promise = mocks.save(...args);
        return { abortSignal: () => promise };
      },
    };
    return chain;
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("reliable resume saving", () => {
  it("header consumes the editor status without starting another cloud load", async () => {
    mocks.auth.user = { id: "alice" };
    mocks.load.mockResolvedValue({
      data: { id: "cv-a", data: named("Original"), template_id: "vintage" },
      error: null,
    });
    render(<Editor />);
    await screen.findByDisplayValue("Original");
    expect(mocks.load).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Latest" } });
    expect(screen.queryByText("Saved to cloud")).not.toBeInTheDocument();
  });

  it("persists anonymous edits before unmount and restores them on remount", async () => {
    const first = renderHook(() => useResumeStore());
    await waitFor(() => expect(first.result.current.hydrated).toBe(true));
    act(() => first.result.current.setData(named("Recover me")));
    first.unmount();
    const second = renderHook(() => useResumeStore());
    await waitFor(() => expect(second.result.current.data.personal.fullName).toBe("Recover me"));
    expect(second.result.current.saveStatus).toBe("device-saved");
  });

  it("preserves malformed storage and offers recovery instead of overwriting it", async () => {
    localStorage.setItem(STORAGE_KEY, "{broken");
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.saveStatus).toBe("recovery-needed"));
    expect(localStorage.getItem(STORAGE_KEY)).toBe("{broken");
    expect(result.current.saveIssue).toBeTruthy();
  });

  it("does not claim a device save when storage writes fail", async () => {
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    act(() => result.current.setData(named("Still editable")));
    expect(result.current.saveStatus).toBe("save-failed");
    expect(result.current.data.personal.fullName).toBe("Still editable");
  });

  it("ignores a late cloud load after changing accounts", async () => {
    const late = deferred<{
      data: { id: string; data: ReturnType<typeof named>; template_id: string };
      error: null;
    }>();
    mocks.auth.user = { id: "alice" };
    mocks.load.mockReturnValueOnce(late.promise);
    const { result, rerender } = renderHook(() => useResumeStore());
    mocks.auth = { user: { id: "bob" }, loading: false };
    rerender();
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () =>
      late.resolve({
        data: { id: "alice-cv", data: named("Private Alice"), template_id: "vintage" },
        error: null,
      }),
    );
    expect(result.current.data.personal.fullName).not.toBe("Private Alice");
  });

  it.each(["returned", "thrown"])(
    "handles %s cloud errors, preserves recovery and retries the latest edit",
    async (failure) => {
      mocks.auth.user = { id: "alice" };
      mocks.load.mockResolvedValue({
        data: { id: "cv-a", data: named("Original"), template_id: "vintage" },
        error: null,
      });
      if (failure === "returned") mocks.save.mockResolvedValueOnce({ error: new Error("denied") });
      else mocks.save.mockRejectedValueOnce(new Error("offline"));
      const { result } = renderHook(() => useResumeStore());
      await waitFor(() => expect(result.current.hydrated).toBe(true));
      vi.useFakeTimers();
      act(() => result.current.setData(named("Latest")));
      expect(
        readDraft(localStorage.getItem(accountDraftKey("alice", "cv-a"))!).data.personal.fullName,
      ).toBe("Latest");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      expect(result.current.saveStatus).toBe("save-failed");
      expect(result.current.saveIssue).toContain("saved on this device");
      await act(async () => {
        result.current.retrySave();
      });
      expect(result.current.saveStatus).toBe("cloud-saved");
      expect(mocks.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          user_id: "alice",
          data: expect.objectContaining({
            personal: expect.objectContaining({ fullName: "Latest" }),
          }),
        }),
        expect.anything(),
      );
    },
  );

  it("serialises cloud saves and never acknowledges newer edits with an older response", async () => {
    mocks.auth.user = { id: "alice" };
    mocks.load.mockResolvedValue({
      data: { id: "cv-a", data: named("Original"), template_id: "vintage" },
      error: null,
    });
    const first = deferred<{ error: null }>();
    mocks.save.mockReturnValueOnce(first.promise);
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    vi.useFakeTimers();
    act(() => result.current.setData(named("First edit")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    act(() => result.current.setData(named("Second edit")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => first.resolve({ error: null }));
    expect(result.current.saveStatus).not.toBe("cloud-saved");
    expect(readDraft(localStorage.getItem(accountDraftKey("alice", "cv-a"))!).dirty).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(result.current.saveStatus).toBe("cloud-saved");
    expect(result.current.data.personal.fullName).toBe("Second edit");
  });

  it("restores account edits after immediate remount before the cloud debounce", async () => {
    mocks.auth.user = { id: "alice" };
    mocks.load.mockResolvedValue({
      data: { id: "cv-a", data: named("Cloud original"), template_id: "vintage" },
      error: null,
    });
    const first = renderHook(() => useResumeStore());
    await waitFor(() => expect(first.result.current.hydrated).toBe(true));
    act(() => first.result.current.setData(named("Recovered account edit")));
    first.unmount();
    const second = renderHook(() => useResumeStore());
    await waitFor(() => expect(second.result.current.hydrated).toBe(true));
    expect(second.result.current.data.personal.fullName).toBe("Recovered account edit");
    expect(second.result.current.saveStatus).not.toBe("cloud-saved");
  });

  it("restores a new account document that has not reached the cloud yet", async () => {
    mocks.auth.user = { id: "alice" };
    const first = renderHook(() => useResumeStore());
    await waitFor(() => expect(first.result.current.hydrated).toBe(true));
    const id = first.result.current.resumeId;
    act(() => first.result.current.setData(named("New unsynced CV")));
    first.unmount();
    const second = renderHook(() => useResumeStore());
    await waitFor(() => expect(second.result.current.hydrated).toBe(true));
    expect(second.result.current.resumeId).toBe(id);
    expect(second.result.current.data.personal.fullName).toBe("New unsynced CV");
  });

  it("does not recreate a previously synced document deleted elsewhere", async () => {
    localStorage.setItem(accountActiveKey("alice"), "cv-a");
    localStorage.setItem(
      accountDraftKey("alice", "cv-a"),
      JSON.stringify({
        version: 2,
        data: named("Deleted"),
        dirty: true,
        cloudExists: true,
        revision: "r",
        writer: "w",
      }),
    );
    mocks.auth.user = { id: "alice" };
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.saveStatus).toBe("load-failed"));
    expect(result.current.hydrated).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("does not expose or save a previous account after sign-out during a save", async () => {
    mocks.auth.user = { id: "alice" };
    mocks.load.mockResolvedValue({
      data: { id: "cv-a", data: named("Alice"), template_id: "vintage" },
      error: null,
    });
    const save = deferred<{ error: null }>();
    mocks.save.mockReturnValueOnce(save.promise);
    const { result, rerender } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    vi.useFakeTimers();
    act(() => result.current.setData(named("Private Alice edit")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    const staleSetter = result.current.setData;
    mocks.auth = { user: null, loading: false };
    rerender();
    await act(async () => {
      save.resolve({ error: null });
      staleSetter(named("Late import"));
    });
    expect(result.current.data.personal.fullName).toBe("");
    expect(readDraft(localStorage.getItem(STORAGE_KEY)!).data.personal.fullName).toBe("");
    expect(
      readDraft(localStorage.getItem(accountDraftKey("alice", "cv-a"))!).data.personal.fullName,
    ).toBe("Private Alice edit");
  });

  it("rejects structurally corrupt nested drafts without overwriting them", async () => {
    const raw = JSON.stringify({ ...named("Bad"), experience: [{ role: 123 }] });
    localStorage.setItem(STORAGE_KEY, raw);
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.saveStatus).toBe("recovery-needed"));
    act(() => result.current.resolveRecovery());
    expect(result.current.hydrated).toBe(true);
    const backups = Object.keys(localStorage).filter((key) => key.includes(":recovery:"));
    expect(backups).toHaveLength(1);
    expect(localStorage.getItem(backups[0])).toBe(raw);
    expect(result.current.data.personal.fullName).toBe("");
    expect(result.current.saveStatus).toBe("device-saved");
    expect(readDraft(localStorage.getItem(STORAGE_KEY)!).data.personal.fullName).toBe("");
  });

  it("does not edit or overwrite a draft when storage cannot be read", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.saveStatus).toBe("load-failed"));
    expect(result.current.hydrated).toBe(false);
    act(() => result.current.setData(named("Must not overwrite")));
    expect(result.current.data.personal.fullName).toBe("");
  });

  it("keeps a known device copy editable if loading cloud fails", async () => {
    mocks.auth.user = { id: "alice" };
    localStorage.setItem(accountActiveKey("alice"), "cv-a");
    localStorage.setItem(
      accountDraftKey("alice", "cv-a"),
      JSON.stringify({
        version: 2,
        data: named("Offline draft"),
        dirty: true,
        revision: "r",
        writer: "w",
      }),
    );
    mocks.load.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.data.personal.fullName).toBe("Offline draft");
    expect(result.current.saveStatus).toBe("save-failed");
  });

  it("pauses on another tab change and preserves this copy before loading the other one", async () => {
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => result.current.setData(named("This tab")));
    const other = JSON.stringify(named("Other tab"));
    localStorage.setItem(STORAGE_KEY, other);
    act(() =>
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: other })),
    );
    expect(result.current.saveStatus).toBe("conflict");
    act(() => result.current.setData(named("This tab continued")));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(other);
    act(() => result.current.resolveRecovery());
    expect(result.current.data.personal.fullName).toBe("Other tab");
    const backups = Object.keys(localStorage).filter((key) => key.includes(":recovery:"));
    expect(JSON.parse(localStorage.getItem(backups[0])!).personal.fullName).toBe(
      "This tab continued",
    );
  });

  it("detects a second writer before overwriting even if the storage event has not arrived", async () => {
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(named("Unannounced edit")));
    act(() => result.current.setData(named("My conflicting edit")));
    expect(result.current.saveStatus).toBe("conflict");
    expect(readDraft(localStorage.getItem(STORAGE_KEY)!).data.personal.fullName).toBe(
      "Unannounced edit",
    );
    expect(result.current.data.personal.fullName).toBe("My conflicting edit");
  });

  it("does not publish stale controller work after disposal", async () => {
    const load = deferred<null>();
    const controller = new ResumePersistence("alice", {
      load: () => load.promise,
      save: async () => {},
    });
    const stop = controller.start();
    stop();
    await load.resolve(null);
    expect(controller.getSnapshot().hydrated).toBe(false);
    expect(localStorage.getItem(accountActiveKey("alice"))).toBeNull();
  });

  it("requires confirmation before resetting unreadable data", () => {
    const resolve = vi.fn();
    render(
      <SaveNotice
        status="recovery-needed"
        issue="Unreadable"
        onRetry={vi.fn()}
        onDownload={vi.fn()}
        onResolve={resolve}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /start fresh/i }));
    expect(resolve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /back up original and start fresh/i }));
    expect(resolve).toHaveBeenCalledOnce();
  });
});
