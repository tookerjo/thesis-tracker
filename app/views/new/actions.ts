"use server";

import { createClient } from "@/lib/supabase/server";
import { CONFIDENCE_LEVELS, TIME_HORIZONS } from "@/lib/views/field-options";

export type CreateViewInput = {
  title: string;
  confidenceLevel: string;
  timeHorizon: string;
};

export type CreateViewResult = { error: string } | { id: string };

function normalizeConfidenceLevel(value: string): string | null {
  return (CONFIDENCE_LEVELS as readonly string[]).includes(value)
    ? value
    : null;
}

function normalizeTimeHorizon(value: string): string | null {
  return (TIME_HORIZONS as readonly string[]).includes(value) ? value : null;
}

export async function createView(
  input: CreateViewInput,
): Promise<CreateViewResult> {
  // Re-validate server-side -- the client's checks (required title, dropdowns
  // limited to known options) are a UX convenience only, not the guarantee.
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

  // user_id always comes from the authenticated session, never from the
  // client -- RLS's `with check (auth.uid() = user_id)` is the backstop,
  // not the primary defense (CLAUDE.md #2).
  if (!user) {
    return { error: "You must be signed in to create a view." };
  }

  const { data, error } = await supabase
    .from("views")
    .insert({
      user_id: user.id,
      title,
      confidence_level,
      time_horizon,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Unable to create view right now." };
  }

  return { id: data.id };
}
