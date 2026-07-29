-- Session 1.3: grant base CRUD privileges to authenticated on the five
-- tables created in this session's migrations.
--
-- Root cause: these tables were created by the `postgres` role (via
-- `supabase db push`), which has its own default-privilege entry on the
-- public schema granting only TRUNCATE/REFERENCES/TRIGGER/MAINTAIN to
-- anon/authenticated/service_role — not SELECT/INSERT/UPDATE/DELETE.
-- (Supabase's own supabase_admin-owned default, which grants full CRUD,
-- only applies to tables supabase_admin creates.) Without this grant, the
-- RLS policies already in place are unreachable: Postgres checks table-level
-- ACL before RLS, so authenticated queries fail with "permission denied"
-- rather than being filtered by policy.
--
-- Deliberately NOT granted:
--   - anon: this app has no public/anonymous routes (CLAUDE.md: default-deny
--     auth), so anon gets nothing here.
--   - TRUNCATE: bypasses RLS entirely; nothing in the app needs it.

grant select, insert, update, delete on public.topics to authenticated;
grant select, insert, update, delete on public.views to authenticated;
grant select, insert, update, delete on public.view_topics to authenticated;
grant select, insert, update, delete on public.view_relationships to authenticated;
grant select, insert, update, delete on public.evidence_items to authenticated;
