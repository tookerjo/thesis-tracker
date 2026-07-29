-- Session 1.3: evidence_items table.
-- No user_id column — ownership is proven via a single-sided EXISTS
-- subquery against the parent views row, per docs/design/schema-addendum.md.

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  view_id uuid not null references public.views (id) on delete cascade,
  content text not null,
  source_url text,
  -- supports_or_contradicts: addendum specifies enum(for/against), not a
  -- placeholder — implemented as text + check rather than a native Postgres
  -- enum type, since enum types are awkward to alter later if values change.
  supports_or_contradicts text not null check (supports_or_contradicts in ('for', 'against')),
  created_at timestamptz not null default now()
);

create index if not exists evidence_items_view_id_idx on public.evidence_items (view_id);

alter table public.evidence_items enable row level security;

-- Single-sided ownership check: the row is only visible/writable if the
-- authenticated user owns the parent views row.
create policy "evidence_items_owner_all" on public.evidence_items
  for all
  using (
    exists (
      select 1 from public.views v
      where v.id = evidence_items.view_id and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.views v
      where v.id = evidence_items.view_id and v.user_id = auth.uid()
    )
  );
