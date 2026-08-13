"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Global-scope sign-out (the supabase-js default): the server client's
// signOut() calls Supabase's /auth/v1/logout endpoint to revoke the user's
// refresh tokens server-side, then clears the auth cookies via the cookie
// adapter in @/lib/supabase/server -- not a local-only cookie wipe. redirect()
// runs after signOut() and outside any try/catch, since it works by throwing a
// control-flow signal that Next.js handles.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
