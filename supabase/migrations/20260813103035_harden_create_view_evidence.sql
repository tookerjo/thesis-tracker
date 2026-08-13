-- Session 1.6c pre-work (security review from 1.6b): harden create_view_evidence
-- with two fail-closed backstops. Neither changes the happy path; both close a
-- gap where the function relied on a single defense layer.
--
-- 1. Explicit ownership guard on p_view_id, checked BEFORE either insert.
--    Previously ownership was enforced only by the two-sided view_evidence RLS
--    WITH CHECK, which fires on the *second* insert (after evidence_items has
--    been inserted-then-rolled-back). The guard below rejects a non-owned view
--    up front. Crucially it checks user_id = auth.uid() DIRECTLY rather than a
--    bare `where id = p_view_id`: under SECURITY INVOKER a bare check just
--    re-runs RLS's own SELECT filter and would fail alongside it if the views
--    policy were ever misconfigured. Checking the owner column makes this an
--    INDEPENDENT layer that still holds if RLS on views breaks.
--
-- 2. Revoke EXECUTE from PUBLIC. Postgres grants EXECUTE on a new function to
--    PUBLIC by default; the original migration (20260811154206) only added a
--    grant to authenticated and never revoked the implicit PUBLIC grant, so the
--    RPC was reachable by any role. Revoke it, keep authenticated only.

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
  -- Fail closed on ownership as an INDEPENDENT layer (see header). Checks the
  -- owner column explicitly so it holds even if RLS on views is misconfigured.
  if not exists (
    select 1 from public.views
    where id = p_view_id and user_id = auth.uid()
  ) then
    raise exception 'view % not found or not owned', p_view_id
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.evidence_items (user_id, link, note)
  values (auth.uid(), p_link, p_note)
  returning id into v_evidence_id;

  insert into public.view_evidence (view_id, evidence_id, stance)
  values (p_view_id, v_evidence_id, p_stance);

  return v_evidence_id;
end;
$$;

revoke execute on function public.create_view_evidence(uuid, text, text, text)
  from public;

grant execute on function public.create_view_evidence(uuid, text, text, text)
  to authenticated;
