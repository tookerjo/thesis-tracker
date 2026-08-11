"use server";

import { createClient } from "@/lib/supabase/server";
import { STANCE_OPTIONS } from "@/lib/evidence/field-options";

export type CreateEvidenceInput = {
  viewId: string;
  link: string;
  note: string;
  stance: string;
};

export type CreateEvidenceResult = { error: string } | { id: string };

function normalizeStance(value: string): string | null {
  return (STANCE_OPTIONS as readonly string[]).includes(value) ? value : null;
}

// Optional free-text fields: an empty (or whitespace-only) input is stored as
// NULL, not "". Mirrors the reconcile migration's reasoning that a raw link is
// enough at capture time and note/link may be absent.
function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createEvidence(
  input: CreateEvidenceInput,
): Promise<CreateEvidenceResult> {
  // Re-validate/normalize server-side -- the client's checks (url input,
  // stance dropdown limited to known options) are a UX convenience only, not
  // the guarantee. stance falls back to NULL unless it matches a known value.
  const link = normalizeOptionalText(input.link);
  const note = normalizeOptionalText(input.note);
  const stance = normalizeStance(input.stance);

  // Require at least one of link/note -- an evidence item with neither
  // carries no information. stance stays optional. The client pre-checks this
  // too, but this server guard is the actual gate.
  if (link === null && note === null) {
    return { error: "Add a link or a note." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in gate at the app layer. user_id itself is derived server-side
  // inside the RPC via auth.uid(), never from the client (CLAUDE.md #2); the
  // RPC runs SECURITY INVOKER so RLS re-enforces ownership on both inserts as
  // the backstop, including that the caller owns p_view_id.
  if (!user) {
    return { error: "You must be signed in to add evidence." };
  }

  // Both inserts happen inside create_view_evidence (see migration
  // 20260811154206_create_view_evidence_rpc.sql), a single server-side
  // transaction: if the view_evidence insert fails, the evidence_items insert
  // rolls back with it, so no orphaned evidence row is left behind.
  // supabase-js has no client-side multi-statement transaction, so this
  // atomicity has to live in Postgres.
  const { data, error } = await supabase.rpc("create_view_evidence", {
    p_view_id: input.viewId,
    p_link: link,
    p_note: note,
    p_stance: stance,
  });

  // error covers a failed/rolled-back transaction, which includes the caller
  // not owning the view (RLS aborts the second insert). !data guards the
  // (not expected) empty-return case.
  if (error || !data) {
    return { error: "Unable to add evidence right now." };
  }

  return { id: data as string };
}
