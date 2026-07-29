-- Session 1.3: topics and views tables with direct-ownership RLS.
-- Join tables (view_topics, view_relationships) and evidence_items are
-- intentionally excluded from this migration — see docs/design/schema-addendum.md.
-- Their RLS uses two-sided/single-sided EXISTS checks against these tables and
-- will be added in a follow-up migration once this ownership model is confirmed.

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  hypothesis text not null,
  -- confidence: PLACEHOLDER type — numeric 0-100 vs enum low/med/high, TBD (schema-addendum.md)
  confidence text,
  -- time_horizon: PLACEHOLDER type — enum vs date range, TBD (schema-addendum.md)
  time_horizon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topics_user_id_idx on public.topics (user_id);
create index if not exists views_user_id_idx on public.views (user_id);

alter table public.topics enable row level security;
alter table public.views enable row level security;

-- Direct ownership check per schema-addendum.md. Uses a single FOR ALL policy
-- per table (see open item below) rather than four per-operation policies.
create policy "topics_owner_all" on public.topics
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "views_owner_all" on public.views
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
