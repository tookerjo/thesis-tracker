"use server";

import { createClient } from "@/lib/supabase/server";

export type CreateTopicInput = {
  name: string;
  framingNote: string;
};

export type CreateTopicResult = { error: string } | { id: string };

export async function createTopic(
  input: CreateTopicInput,
): Promise<CreateTopicResult> {
  // Re-validate server-side -- the client's checks (required name) are a
  // UX convenience only, not the guarantee.
  const name = input.name.trim();
  if (!name) {
    return { error: "Topic name is required." };
  }

  const framing_note = input.framingNote.trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // user_id always comes from the authenticated session, never from the
  // client -- RLS's `with check (auth.uid() = user_id)` is the backstop,
  // not the primary defense (CLAUDE.md #2).
  if (!user) {
    return { error: "You must be signed in to create a topic." };
  }

  const { data, error } = await supabase
    .from("topics")
    .insert({
      user_id: user.id,
      name,
      framing_note,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Unable to create topic right now." };
  }

  return { id: data.id };
}
