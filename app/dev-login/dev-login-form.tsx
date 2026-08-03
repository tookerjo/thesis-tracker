"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DevLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    // isSingleton: false -- this file's own opt-out, not the shared default in
    // lib/supabase/client.ts. Without it, @supabase/ssr's createBrowserClient
    // caches the first browser client it ever creates in this tab and ignores
    // the URL/key on every later call. When .env.local's Supabase URL is
    // swapped during local dev (e.g. hosted <-> `supabase start`) without a
    // hard refresh, that stale singleton keeps signing in against the old
    // project and surfaces as a misleading "Invalid login credentials".
    const supabase = createClient({ isSingleton: false });
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    router.push("/views");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">Dev login</h1>
      <p className="max-w-sm text-center text-sm text-neutral-500">
        Email/password sign-in for local testing only. Run{" "}
        <code>npm run seed:dev-user</code> against a local `supabase start`
        instance to create the test account.
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-3"
      >
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
          className="rounded-md border border-neutral-300 px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          required
          className="rounded-md border border-neutral-300 px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
