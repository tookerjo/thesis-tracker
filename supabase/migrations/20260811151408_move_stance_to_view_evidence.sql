-- ADR-006: stance moves from evidence_items (per-item) to view_evidence
-- (per-link). stance describes how a specific evidence item relates to a
-- specific View, so it is relationship-level metadata, not an intrinsic
-- property of the evidence. Both evidence_items and view_evidence are empty
-- in production, so this is a clean restructure -- no data migration or
-- backfill required.

-- 1. Add stance to view_evidence. Three-value CHECK (ADR-006 / PRD §6's
-- for/against/context scale, expanding the old two-value for/against).
-- Nullable: a link can be attached to a View before its stance is decided,
-- and a CHECK constraint lets NULL through regardless of the IN-list, so no
-- extra "or is null" clause is needed -- same pattern as the
-- confidence_level / time_horizon constraints in
-- 20260801161736_reconcile_schema_with_prd.sql.
alter table public.view_evidence add column stance text;
alter table public.view_evidence add constraint view_evidence_stance_check
  check (stance in ('for', 'against', 'context'));

-- 2. Drop stance from evidence_items. Its CHECK constraint
-- (evidence_items_supports_or_contradicts_check -- name unchanged by the
-- earlier column rename in migration 20260801161736) is owned by the column
-- and drops with it, so no separate DROP CONSTRAINT is needed. No RLS policy
-- references stance, so nothing blocks the DROP COLUMN.
alter table public.evidence_items drop column stance;
