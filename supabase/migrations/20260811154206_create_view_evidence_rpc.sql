-- Atomic evidence capture from within a View (ADR-006 "Costs": creating
-- evidence from a View UI requires an atomic two-table write to avoid
-- orphaned evidence rows). supabase-js has no client-side multi-statement
-- transaction, so the atomicity lives here: both inserts run inside this
-- one function body -- a single server-side transaction. If the
-- view_evidence insert fails (including via RLS), the evidence_items insert
-- rolls back with it, leaving no orphaned evidence row.

-- SECURITY INVOKER (the default, stated explicitly): the function runs as
-- the calling user, so the existing RLS policies still apply to both
-- inserts -- evidence_items_owner_insert (auth.uid() = user_id) and the
-- two-sided view_evidence_owner_insert (caller owns both the view and the
-- evidence row). user_id is derived here from auth.uid(), never passed by
-- the client (CLAUDE.md #2). A caller passing a p_view_id they don't own
-- trips the view_evidence WITH CHECK, which aborts the whole transaction --
-- so tenancy and atomicity fall out of the same mechanism. search_path is
-- pinned empty and every object is schema-qualified so name resolution
-- can't be redirected.
create or replace function public.create_view_evidence(
  p_view_id uuid,
  p_link text,
  p_note text,
  p_stance text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_evidence_id uuid;
begin
  insert into public.evidence_items (user_id, link, note)
  values (auth.uid(), p_link, p_note)
  returning id into v_evidence_id;

  insert into public.view_evidence (view_id, evidence_id, stance)
  values (p_view_id, v_evidence_id, p_stance);

  return v_evidence_id;
end;
$$;

-- Same grant reasoning as the table grants in
-- 20260729102114_grant_authenticated_crud.sql: without EXECUTE for the
-- authenticated role, the RPC is unreachable from the app.
grant execute on function public.create_view_evidence(uuid, text, text, text)
  to authenticated;
