"use server";

import { createClient } from "@/lib/supabase/server";

export type LinkTopicInput = { viewId: string; topicId: string };
export type LinkTopicResult = { error: string } | { ok: true };

// Postgres unique_violation -- the view_topics unique (view_id, topic_id)
// constraint tripped because the link already exists.
const UNIQUE_VIOLATION = "23505";

export async function linkTopic(
  input: LinkTopicInput,
): Promise<LinkTopicResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in gate at the app layer. Ownership of BOTH the view and the topic
  // is enforced by view_topics' two-sided RLS WITH CHECK (each parent must
  // belong to auth.uid()), which is the fail-closed backstop (CLAUDE.md #2) --
  // user_id is never taken from the client.
  if (!user) {
    return { error: "You must be signed in to link a topic." };
  }

  const { error } = await supabase
    .from("view_topics")
    .insert({ view_id: input.viewId, topic_id: input.topicId });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: "That topic is already linked." };
    }
    return { error: "Unable to link topic right now." };
  }

  return { ok: true };
}

export async function unlinkTopic(
  input: LinkTopicInput,
): Promise<LinkTopicResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to unlink a topic." };
  }

  // RLS's view_topics_owner_delete USING clause scopes the delete to rows the
  // user owns both sides of, so a non-owned (or already-gone) pair simply
  // matches zero rows -- a no-op success, not an error.
  const { error } = await supabase
    .from("view_topics")
    .delete()
    .eq("view_id", input.viewId)
    .eq("topic_id", input.topicId);

  if (error) {
    return { error: "Unable to unlink topic right now." };
  }

  return { ok: true };
}
