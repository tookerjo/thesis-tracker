-- Session 1.3: revoke TRUNCATE from authenticated on the five tables
-- created this session.
--
-- TRUNCATE was never explicitly granted by us — it came from the
-- postgres-owned default-privilege entry on the public schema (see
-- 20260729102114_grant_authenticated_crud.sql) that applied automatically
-- at table creation. TRUNCATE bypasses RLS entirely: any authenticated user
-- could wipe an entire table (every user's rows, not just their own),
-- which contradicts the per-user ownership model these RLS policies
-- enforce. Nothing in the app needs TRUNCATE.

revoke truncate on public.topics from authenticated;
revoke truncate on public.views from authenticated;
revoke truncate on public.view_topics from authenticated;
revoke truncate on public.view_relationships from authenticated;
revoke truncate on public.evidence_items from authenticated;
