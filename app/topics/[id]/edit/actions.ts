"use server";

import { createClient } from "@/lib/supabase/server";

export type UpdateTopicInput = {
  id: string;
  name: string;
  framingNote: string;
};

export type UpdateTopicResult = { error: string } | { id: string };

export async function updateTopic(
  input: UpdateTopicInput,
): Promise<UpdateTopicResult> {
  // Re-validate server-side -- the client's checks are a UX convenience
  // only, not the guarantee.
  const name = input.name.trim();
  if (!name) {
    return { error: "Topic name is required." };
  }

  const framing_note = input.framingNote.trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // user_id (for the ownership check below) always comes from the
  // authenticated session, never from the client -- same reasoning as
  // app/topics/new/actions.ts. The client-supplied `input.id` names which
  // row to update, but ownership of that row is re-verified here via the
  // explicit .eq("user_id", user.id), not assumed from the client. RLS's
  // "topics_owner_update" policy (USING and WITH CHECK both
  // auth.uid() = user_id) is the backstop, not the primary defense
  // (CLAUDE.md #2).
  if (!user) {
    return { error: "You must be signed in to edit a topic." };
  }

  const { data, error } = await supabase
    .from("topics")
    .update({
      name,
      framing_note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  // error covers malformed ids; !data covers both "doesn't exist" and
  // "belongs to another user" -- the explicit .eq("user_id", ...) above and
  // RLS both make those two cases produce the identical zero-row result,
  // so this branch can't distinguish them even if it wanted to (same
  // reasoning as app/topics/[id]/page.tsx).
  if (error || !data) {
    return { error: "Unable to update topic right now." };
  }

  return { id: data.id };
}
