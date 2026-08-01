-- Reconcile Session 1.3 schema with docs/PRD.md §6 (baseline) and the
-- decisions recorded alongside this migration. topics, views, and
-- evidence_items are all empty in production — every change below is a
-- clean rename/constraint/restructure, no data migration required.

-- 1. views.hypothesis was never a PRD field (no lineage) — drop.
alter table public.views drop column hypothesis;

-- 2. topics.description -> topics.framing_note (PRD §6 field name).
alter table public.topics rename column description to framing_note;

-- 3. views.confidence -> views.confidence_level, constrained to PRD §6's
-- three-value scale. Stays nullable: real test data (PRD appendix, Views 2
-- and 3) has confidence not yet recorded, and a CHECK constraint lets NULL
-- through regardless of the IN-list, so no extra "or is null" clause is
-- needed to preserve that.
alter table public.views rename column confidence to confidence_level;
alter table public.views add constraint views_confidence_level_check
  check (confidence_level in ('low', 'medium', 'high'));

-- 4. views.time_horizon constrained to PRD §6's five-value scale. Same
-- nullability reasoning as #3.
alter table public.views add constraint views_time_horizon_check
  check (time_horizon in ('<1yr', '1-3yr', '3-10yr', '10+yr', 'unclear'));

-- 5. views.tags (PRD §6) — PRD §7 leaves Tags as an open question but
-- recommends free text for v1, so a single nullable text field, not a
-- fixed list/enum.
alter table public.views add column tags text;

-- 6. view_relationships: rename to view_id / related_view_id, and replace
-- the old "no self link" check with a canonical-order check. uuid has a
-- native `<` ordering, so this alone (a) still rejects self-links (a value
-- can never be < itself) and (b) guarantees a given pair of views can only
-- ever be stored in one direction, preventing a duplicate inverse row
-- (related_view_id, view_id) alongside (view_id, related_view_id).
alter table public.view_relationships rename column view_id_a to view_id;
alter table public.view_relationships rename column view_id_b to related_view_id;
alter table public.view_relationships drop constraint view_relationships_no_self_link;
alter table public.view_relationships add constraint view_relationships_canonical_order_check
  check (view_id < related_view_id);

-- Renamed for clarity only — RENAME COLUMN already updated what these
-- indexes point at; this just keeps their names from going stale.
alter index public.view_relationships_view_id_a_idx rename to view_relationships_view_id_idx;
alter index public.view_relationships_view_id_b_idx rename to view_relationships_related_view_id_idx;

-- 7. evidence_items: move from a single view_id FK (one-to-many) to a
-- view_evidence join table (many-to-many), matching the view_topics
-- pattern, and switch RLS from single-sided EXISTS-via-view_id to direct
-- ownership now that an evidence item can exist with zero linked views.

-- 7a. Add direct ownership column first (table is empty, so NOT NULL with
-- no default is safe here).
alter table public.evidence_items add column user_id uuid not null
  references auth.users (id) on delete cascade;

-- 7b. Drop the old EXISTS-via-view_id policy before dropping view_id below
-- — the policy expression depends on that column, so the DROP COLUMN in
-- 7c would fail otherwise.
drop policy if exists "evidence_items_owner_all" on public.evidence_items;

-- 7c. Drop the direct FK. Its dependent index (evidence_items_view_id_idx)
-- and FK/NOT NULL constraints are owned by the column and drop with it —
-- no CASCADE needed now that the policy is gone.
alter table public.evidence_items drop column view_id;

-- 7d. Field renames + relaxed nullability per explicit decision: a raw
-- link is enough at capture time (PRD §7's "what if an Evidence Item has
-- no note?" reasoning extends the same way to link/stance now that an
-- item isn't required to be fully formed before it has a view attached).
alter table public.evidence_items rename column content to note;
alter table public.evidence_items alter column note drop not null;
alter table public.evidence_items rename column source_url to link;
alter table public.evidence_items rename column supports_or_contradicts to stance;
alter table public.evidence_items alter column stance drop not null;
-- for/against check (evidence_items_supports_or_contradicts_check, name
-- unchanged by the column rename) still applies whenever stance IS
-- present — NULL passes through the CHECK, same as #3/#4 above.

-- 7e. New direct-ownership policy, matching topics_owner_all / views_owner_all.
create policy "evidence_items_owner_all" on public.evidence_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists evidence_items_user_id_idx on public.evidence_items (user_id);

-- 7f. view_evidence join table. Two-sided EXISTS: owns the views row AND
-- owns the evidence_items row (via its new user_id). Deliberately no
-- "must have >= 1 view" constraint here — same as Topics/Views, that rule
-- stays app-layer only (PRD §6/§8), not enforced at the DB layer.
create table if not exists public.view_evidence (
  id uuid primary key default gen_random_uuid(),
  view_id uuid not null references public.views (id) on delete cascade,
  evidence_id uuid not null references public.evidence_items (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists view_evidence_view_id_idx on public.view_evidence (view_id);
create index if not exists view_evidence_evidence_id_idx on public.view_evidence (evidence_id);

alter table public.view_evidence enable row level security;

create policy "view_evidence_owner_all" on public.view_evidence
  for all
  using (
    exists (
      select 1 from public.views v
      where v.id = view_evidence.view_id and v.user_id = auth.uid()
    )
    and exists (
      select 1 from public.evidence_items e
      where e.id = view_evidence.evidence_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.views v
      where v.id = view_evidence.view_id and v.user_id = auth.uid()
    )
    and exists (
      select 1 from public.evidence_items e
      where e.id = view_evidence.evidence_id and e.user_id = auth.uid()
    )
  );

-- view_evidence is a brand-new table, so it needs its own grant/revoke —
-- without this, RLS is unreachable (Postgres checks table-level ACL before
-- RLS, so authenticated queries would fail "permission denied" rather than
-- being filtered by policy). Same root cause documented in
-- 20260729102114_grant_authenticated_crud.sql; TRUNCATE deliberately
-- withheld for the same reason as 20260729102707_revoke_truncate_authenticated.sql.
grant select, insert, update, delete on public.view_evidence to authenticated;
revoke truncate on public.view_evidence from authenticated;
