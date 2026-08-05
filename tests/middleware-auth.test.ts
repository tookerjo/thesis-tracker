import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { updateSession } from "../lib/supabase/middleware";

// Same guard as rls-tenancy.test.ts: this points the app's own
// NEXT_PUBLIC_SUPABASE_* vars at whatever SUPABASE_TEST_URL resolves to, so
// refuse to run at all against anything that isn't obviously local.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(process.env.SUPABASE_TEST_URL ?? "")) {
  throw new Error(
    `Refusing to run middleware tests against non-local Supabase URL: ${process.env.SUPABASE_TEST_URL}`,
  );
}

// middleware.ts reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// (the app's real env var names) -- .env.test.local deliberately uses
// separately-named SUPABASE_TEST_* vars instead, so they're not set here by
// default. Pointing the app's own var names at the same local instance,
// process-local to this test file only, keeps that separation intact (no
// edit to .env.local or .env.test.local).
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_TEST_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY;

// Unlike rls-tenancy.test.ts, this exercises lib/supabase/middleware.ts's
// redirect-to-/login gate directly -- a different layer than Supabase RLS.
// No auth cookie is attached to the request, so updateSession()'s own
// supabase.auth.getUser() call (against the real local Supabase instance
// from .env.test.local) resolves to user: null, and its redirect logic is
// what this test is actually checking.
describe("updateSession auth gate", () => {
  it("redirects unauthenticated requests to /login for /views", async () => {
    const request = new NextRequest(new URL("http://localhost:3000/views"));
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/views");
  });

  it("redirects unauthenticated requests to /login for /topics", async () => {
    const request = new NextRequest(new URL("http://localhost:3000/topics"));
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/topics");
  });
});
