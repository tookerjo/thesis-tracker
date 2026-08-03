// Mirrors the CHECK constraints added in
// supabase/migrations/20260801161736_reconcile_schema_with_prd.sql (see
// ADR-003). Single source of truth shared between the create-view server
// action and its client form so the two can't drift apart.
export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export const TIME_HORIZONS = [
  "<1yr",
  "1-3yr",
  "3-10yr",
  "10+yr",
  "unclear",
] as const;
