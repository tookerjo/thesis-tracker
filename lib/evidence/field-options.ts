// Mirrors the CHECK constraint added in
// supabase/migrations/20260811151408_move_stance_to_view_evidence.sql (see
// ADR-006). Single source of truth shared between the create-evidence server
// action and its client form so the two can't drift apart.
export const STANCE_OPTIONS = ["for", "against", "context"] as const;
