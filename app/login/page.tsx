"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  async function handleSignIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">Sign in to Thesis Tracker</h1>
      <button
        type="button"
        onClick={handleSignIn}
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-neutral-800"
      >
        Sign in with Google
      </button>
    </main>
  );
}
