"use server";

import { createClient } from "@/lib/supabase/server";
import { CONFIDENCE_LEVELS, TIME_HORIZONS } from "@/lib/views/field-options";

export type UpdateViewInput = {
  id: string;
  title: string;
  confidenceLevel: string;
  timeHorizon: string;
};

export type UpdateViewResult = { error: string } | { id: string };

function normalizeConfidenceLevel(value: string): string | null {
  return (CONFIDENCE_LEVELS as readonly string[]).includes(value)
    ? value
    : null;
}

function normalizeTimeHorizon(value: string): string | null {
  return (TIME_HORIZONS as readonly string[]).includes(value) ? value : null;
}

export async function updateView(
  input: UpdateViewInput,
): Promise<UpdateViewResult> {
  // Re-validate server-side -- the client's checks are a UX convenience
  // only, not the guarantee.
  const title = input.title.trim();
  if (!title) {
    return { error: "Thesis title is required." };
  }

  const confidence_level = normalizeConfidenceLevel(input.confidenceLevel);
  const time_horizon = normalizeTimeHorizon(input.timeHorizon);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // user_id (for the ownership check below) always comes from the
  // authenticated session, never from the client -- same reasoning as
  // app/views/new/actions.ts. The client-supplied `input.id` names which
  // row to update, but ownership of that row is re-verified here via the
  // explicit .eq("user_id", user.id), not assumed from the client. RLS's
  // "views_owner_update" policy (USING and WITH CHECK both
  // auth.uid() = user_id) is the backstop, not the primary defense
  // (CLAUDE.md #2).
  if (!user) {
    return { error: "You must be signed in to edit a view." };
  }

  const { data, error } = await supabase
    .from("views")
    .update({
      title,
      confidence_level,
      time_horizon,
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
  // reasoning as app/views/[id]/page.tsx).
  if (error || !data) {
    return { error: "Unable to update view right now." };
  }

  return { id: data.id };
}
