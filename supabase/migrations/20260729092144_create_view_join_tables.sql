-- Session 1.3: view_topics and view_relationships join tables.
-- Neither table has a user_id column — ownership is proven via EXISTS
-- subqueries against views/topics per docs/design/schema-addendum.md.
-- evidence_items (single-sided EXISTS against views) is intentionally
-- excluded from this migration.

create table if not exists public.view_topics (
  id uuid primary key default gen_random_uuid(),
  view_id uuid not null references public.views (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (view_id, topic_id)
);

create table if not exists public.view_relationships (
  id uuid primary key default gen_random_uuid(),
  view_id_a uuid not null references public.views (id) on delete cascade,
  view_id_b uuid not null references public.views (id) on delete cascade,
  -- relationship_type: PLACEHOLDER — text or enum, values TBD (schema-addendum.md)
  relationship_type text,
  created_at timestamptz not null default now(),
  constraint view_relationships_no_self_link check (view_id_a <> view_id_b)
);

create index if not exists view_topics_view_id_idx on public.view_topics (view_id);
create index if not exists view_topics_topic_id_idx on public.view_topics (topic_id);
create index if not exists view_relationships_view_id_a_idx on public.view_relationships (view_id_a);
create index if not exists view_relationships_view_id_b_idx on public.view_relationships (view_id_b);

alter table public.view_topics enable row level security;
alter table public.view_relationships enable row level security;

-- Two-sided ownership check: the row is only visible/writable if the
-- authenticated user owns BOTH the parent views row AND the parent topics
-- row. Both EXISTS clauses check against the same auth.uid(), so a row
-- can never link a view/topic pair split across two different users.
create policy "view_topics_owner_all" on public.view_topics
  for all
  using (
    exists (
      select 1 from public.views v
      where v.id = view_topics.view_id and v.user_id = auth.uid()
    )
    and exists (
      select 1 from public.topics t
      where t.id = view_topics.topic_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.views v
      where v.id = view_topics.view_id and v.user_id = auth.uid()
    )
    and exists (
      select 1 from public.topics t
      where t.id = view_topics.topic_id and t.user_id = auth.uid()
    )
  );

-- Two-sided ownership check on views for both sides of the relationship.
-- Requiring both view_id_a and view_id_b to belong to auth.uid() blocks
-- cross-user relationships explicitly: a row can only exist if the same
-- authenticated user owns both endpoints, never one user's view linked to
-- another user's view.
create policy "view_relationships_owner_all" on public.view_relationships
  for all
  using (
    exists (
      select 1 from public.views va
      where va.id = view_relationships.view_id_a and va.user_id = auth.uid()
    )
    and exists (
      select 1 from public.views vb
      where vb.id = view_relationships.view_id_b and vb.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.views va
      where va.id = view_relationships.view_id_a and va.user_id = auth.uid()
    )
    and exists (
      select 1 from public.views vb
      where vb.id = view_relationships.view_id_b and vb.user_id = auth.uid()
    )
  );
