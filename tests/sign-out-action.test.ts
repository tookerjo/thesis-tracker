import { afterEach, describe, expect, it, vi } from "vitest";

// Pure unit test: signOut() is a thin wrapper, so both its dependencies are
// mocked and nothing touches real Supabase. vi.hoisted keeps the mocks
// reachable from the hoisted vi.mock factories (same pattern as the action
// suites). redirect() is mocked so it doesn't throw its NEXT_REDIRECT control
// signal -- the assertion is just that it was called with the right path.
const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut: mocks.signOut } }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { signOut } from "@/app/actions";

describe("signOut action", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("signs out the current session and redirects to /login", async () => {
    mocks.signOut.mockResolvedValue({ error: null });

    await signOut();

    // Called with no args -> supabase-js default scope 'global', which revokes
    // the refresh token server-side (not a local-only cookie clear).
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledWith();
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
