import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useUser } from "@/hooks/use-user";

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { auth } }));
let emit: (event: string, session: { user: { id: string } } | null) => void;
beforeEach(() => {
  auth.getUser.mockReset();
  auth.onAuthStateChange.mockImplementation((callback) => {
    emit = callback;
    return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
  });
});
afterEach(cleanup);

it("ignores stale initial getUser data after a sign-out event", async () => {
  let resolve!: (value: unknown) => void;
  auth.getUser.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { result } = renderHook(() => useUser());
  act(() => emit("SIGNED_OUT", null));
  await act(async () => resolve({ data: { user: { id: "previous-user" } } }));
  expect(result.current.user).toBeNull();
  expect(result.current.loading).toBe(false);
});

it("uses the newest auth event rather than a delayed initial lookup", async () => {
  let resolve!: (value: unknown) => void;
  auth.getUser.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { result } = renderHook(() => useUser());
  act(() => emit("SIGNED_IN", { user: { id: "new-user" } }));
  await act(async () => resolve({ data: { user: { id: "old-user" } } }));
  expect(result.current.user?.id).toBe("new-user");
});

it("ends loading on a failed initial auth lookup", async () => {
  auth.getUser.mockRejectedValue(new Error("offline"));
  const { result } = renderHook(() => useUser());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.user).toBeNull();
});
