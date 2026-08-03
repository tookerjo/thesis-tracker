-- ADR-004 (cascade-delete) verification, no DDL required: the FKs in
-- view_topics, view_relationships, and view_evidence that point at
-- views.id, topics.id, and evidence_items.id already carry ON DELETE
-- CASCADE, set at table creation (20260729092144_create_view_join_tables.sql,
-- 20260801161736_reconcile_schema_with_prd.sql). Confirmed against
-- pg_constraint.confdeltype for all six FKs before writing this migration --
-- cascade already reaches only join rows, never the parent entities.

-- ADR-005: replace every FOR ALL policy on user-owned tables (topics,
-- views, and their join tables) with four per-operation policies, so the
-- write checks (INSERT/UPDATE) are defined independently of the read
-- checks (SELECT/DELETE) rather than sharing one USING/WITH CHECK pair.
-- Each table below keeps its existing ownership expression (direct
-- auth.uid() = user_id, or the two-sided EXISTS checks against parent
-- rows) -- only the policy structure changes, not who is allowed to do
-- what.

-- topics: direct ownership.

drop policy if exists "topics_owner_all" on public.topics;

create policy "topics_owner_select" on public.topics
  for select
  using (auth.uid() = user_id);

create policy "topics_owner_insert" on public.topics
  for insert
  with check (auth.uid() = user_id);

create policy "topics_owner_update" on public.topics
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "topics_owner_delete" on public.topics
  for delete
  using (auth.uid() = user_id);

-- views: direct ownership.

drop policy if exists "views_owner_all" on public.views;

create policy "views_owner_select" on public.views
  for select
  using (auth.uid() = user_id);

create policy "views_owner_insert" on public.views
  for insert
  with check (auth.uid() = user_id);

create policy "views_owner_update" on public.views
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "views_owner_delete" on public.views
  for delete
  using (auth.uid() = user_id);

-- evidence_items: direct ownership.

drop policy if exists "evidence_items_owner_all" on public.evidence_items;

create policy "evidence_items_owner_select" on public.evidence_items
  for select
  using (auth.uid() = user_id);

create policy "evidence_items_owner_insert" on public.evidence_items
  for insert
  with check (auth.uid() = user_id);

create policy "evidence_items_owner_update" on public.evidence_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "evidence_items_owner_delete" on public.evidence_items
  for delete
  using (auth.uid() = user_id);

-- view_topics: two-sided ownership -- the authenticated user must own both
-- the parent views row and the parent topics row. Same EXISTS pair as the
-- old FOR ALL policy, just repeated per operation.

drop policy if exists "view_topics_owner_all" on public.view_topics;

create policy "view_topics_owner_select" on public.view_topics
  for select
  using (
    exists (
      select 1 from public.views v
      where v.id = view_topics.view_id and v.user_id = auth.uid()
    )
    and exists (
      select 1 from public.topics t
      where t.id = view_topics.topic_id and t.user_id = auth.uid()
    )
  );

create policy "view_topics_owner_insert" on public.view_topics
  for insert
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

create policy "view_topics_owner_update" on public.view_topics
  for update
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

create policy "view_topics_owner_delete" on public.view_topics
  for delete
  using (
    exists (
      select 1 from public.views v
      where v.id = view_topics.view_id and v.user_id = auth.uid()
    )
    and exists (
      select 1 from public.topics t
      where t.id = view_topics.topic_id and t.user_id = auth.uid()
    )
  );

-- view_relationships: two-sided ownership -- the authenticated user must
-- own both endpoints (view_id and related_view_id). Same EXISTS pair as
-- the old FOR ALL policy, just repeated per operation.

drop policy if exists "view_relationships_owner_all" on public.view_relationships;

create policy "view_relationships_owner_select" on public.view_relationships
  for select
  using (
    exists (
      select 1 from public.views va
      where va.id = view_relationships.view_id and va.user_id = auth.uid()
    )
    and exists (
      select 1 from public.views vb
      where vb.id = view_relationships.related_view_id and vb.user_id = auth.uid()
    )
  );

create policy "view_relationships_owner_insert" on public.view_relationships
  for insert
  with check (
    exists (
      select 1 from public.views va
      where va.id = view_relationships.view_id and va.user_id = auth.uid()
    )
    and exists (
      select 1 from public.views vb
      where vb.id = view_relationships.related_view_id and vb.user_id = auth.uid()
    )
  );

create policy "view_relationships_owner_update" on public.view_relationships
  for update
  using (
    exists (
      select 1 from public.views va
      where va.id = view_relationships.view_id and va.user_id = auth.uid()
    )
    and exists (
      select 1 from public.views vb
      where vb.id = view_relationships.related_view_id and vb.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.views va
      where va.id = view_relationships.view_id and va.user_id = auth.uid()
    )
    and exists (
      select 1 from public.views vb
      where vb.id = view_relationships.related_view_id and vb.user_id = auth.uid()
    )
  );

create policy "view_relationships_owner_delete" on public.view_relationships
  for delete
  using (
    exists (
      select 1 from public.views va
      where va.id = view_relationships.view_id and va.user_id = auth.uid()
    )
    and exists (
      select 1 from public.views vb
      where vb.id = view_relationships.related_view_id and vb.user_id = auth.uid()
    )
  );

-- view_evidence: two-sided ownership -- the authenticated user must own
-- both the parent views row and the parent evidence_items row. Same
-- EXISTS pair as the old FOR ALL policy, just repeated per operation.

drop policy if exists "view_evidence_owner_all" on public.view_evidence;

create policy "view_evidence_owner_select" on public.view_evidence
  for select
  using (
    exists (
      select 1 from public.views v
      where v.id = view_evidence.view_id and v.user_id = auth.uid()
    )
    and exists (
      select 1 from public.evidence_items e
      where e.id = view_evidence.evidence_id and e.user_id = auth.uid()
    )
  );

create policy "view_evidence_owner_insert" on public.view_evidence
  for insert
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

create policy "view_evidence_owner_update" on public.view_evidence
  for update
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

create policy "view_evidence_owner_delete" on public.view_evidence
  for delete
  using (
    exists (
      select 1 from public.views v
      where v.id = view_evidence.view_id and v.user_id = auth.uid()
    )
    and exists (
      select 1 from public.evidence_items e
      where e.id = view_evidence.evidence_id and e.user_id = auth.uid()
    )
  );
