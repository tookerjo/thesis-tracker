# Current State

Read this first, before scoping any new session. Verified directly against the filesystem/migrations at the time this was written (2026-08-11) — not from memory or from prior session summaries. If it looks stale, re-verify rather than trust it; update it once your session's changes land.

## Entities and pages

### Views — full CRUD exists
- `app/views/page.tsx` — list
- `app/views/[id]/page.tsx` — detail
- `app/views/new/page.tsx` + `new-view-form.tsx` + `actions.ts` — create
- `app/views/[id]/edit/page.tsx` + `edit-view-form.tsx` + `actions.ts` — edit
- `loading.tsx` present for all four (list/detail/create/edit), using shared skeleton components
- No delete UI. Backend delete is RLS-protected but unreachable from the app — no delete button/action exists anywhere under `app/views`.

### Topics — full CRUD exists
- `app/topics/page.tsx` — list; rows link to the detail page
- `app/topics/[id]/page.tsx` — detail; has an Edit link to the edit page
- `app/topics/new/page.tsx` + `new-topic-form.tsx` + `actions.ts` — create
- `app/topics/[id]/edit/page.tsx` + `edit-topic-form.tsx` + `actions.ts` — edit
- `loading.tsx` present for all four (list/detail/create/edit), using shared skeleton components
- No delete UI (same gap as Views).
- **Open product decision:** `framing_note` is captured on create and edit (bound in both forms, written to the DB by both `actions.ts` files) but intentionally not displayed on the detail page — the detail query doesn't even select it. This is a deliberate hold on an unresolved product question of whether/how to surface framing, not a bug. Still open.

### Shared UI components (`components/ui/`)
`skeleton.tsx`, `table-skeleton.tsx`, `detail-skeleton.tsx`, `form-skeleton.tsx`, `empty-state.tsx`, `error-state.tsx`, `not-found-state.tsx` — used across the Views and Topics pages. `app/not-found.tsx` (root) renders `NotFoundState` for the collapsed not-found/unauthorized case.

### Evidence — schema only, no UI
`evidence_items` and `view_evidence` tables exist (migration `20260801161736_reconcile_schema_with_prd.sql`), many-to-many with `views`, two-sided RLS on `view_evidence`. `stance` is currently a two-value CHECK (`for`/`against`). No app routes or forms exist for evidence anywhere. Deferred to **Session 1.6b**, including expanding `stance` to three values (`for`/`against`/`context`) and an open per-item-vs-per-link ADR decision on where `stance` should live — see `docs/design/1.4-schema-reconciliation.md`'s addendum.

## Database

Migrations in `supabase/migrations/`, in order:
1. `20260728165150_create_topics_and_views.sql`
2. `20260729092144_create_view_join_tables.sql`
3. `20260729100703_create_evidence_items.sql`
4. `20260729102114_grant_authenticated_crud.sql`
5. `20260729102707_revoke_truncate_authenticated.sql`
6. `20260801161736_reconcile_schema_with_prd.sql` — PRD reconciliation (ADR-003): evidence_items → many-to-many via view_evidence, confidence_level/time_horizon CHECK constraints, tags added, view_relationships renamed with canonical ordering.
7. `20260803140000_scope_rls_policies_per_operation.sql` — per-operation RLS policies (Session 1.5).

`docs/design/schema-addendum.md` is marked **SUPERSEDED** as of this session — it documents the pre-ADR-003 (Session 1.3) schema. Treat `supabase/migrations/` and `docs/adr/ADR-003-prd-schema-reconciliation.md` onward as the source of truth instead.

## Tests

34 tests total, across two files, all passing as of this session:
- `tests/rls-tenancy.test.ts` — 32 tests. Cross-tenant RLS boundaries (read/insert/update/delete blocking, ownership forgery, cascade-delete behavior) across `topics`, `views`, `view_topics`, `view_relationships`, `evidence_items`, `view_evidence`.
- `tests/middleware-auth.test.ts` — 2 tests. Unit-tests `lib/supabase/middleware.ts`'s `updateSession()` redirect-to-`/login` gate directly (not Supabase RLS) for unauthenticated requests to `/views` and `/topics`.

Run with `npm run test` (vitest). Both files are configured via `.env.test.local`'s `SUPABASE_TEST_*` variables to point at local Supabase, and both files throw immediately at import time if `SUPABASE_TEST_URL` doesn't match `127.0.0.1`/`localhost` — an explicit guard in each file, not a shared enforcement mechanism. See `scripts/seed-dev-user.mjs` for the dev-login seed user, `dev@thesis-tracker.local`.

Not yet tested: `view_evidence` / `view_relationships` tenancy scenarios beyond what's in `rls-tenancy.test.ts` already — no UI exists to exercise them through yet.

Also not yet tested: the Topics action-layer functions `createTopic` (`app/topics/new/actions.ts`) and `updateTopic` (`app/topics/[id]/edit/actions.ts`) have zero test coverage as of end of Session 1.6a — no test file references either function. Same kind of gap as the `view_evidence`/`view_relationships` one above.

## Deferred work by session

**Session 1.6a** — ✅ Complete. Topics detail/create/edit pages built with full CRUD parity with Views, plus loading states; list rows link to detail and detail has an Edit link. (Gaps carried forward: `createTopic`/`updateTopic` still untested; `framing_note` captured but not displayed — see the Topics and Tests sections above.)

**Session 1.6b** — Evidence CRUD UI (tables already exist). Must start with an ADR-level decision: does `stance` belong on `evidence_items` (per-item) or `view_evidence` (per-link)? Then implement the three-value `stance` expansion (`for`/`against`/`context`), which is a locked decision, not open.

**Session 1.6c** — View-Topic linking UI. No UI currently exists to connect a View to a Topic, despite the `view_topics` join table and its two-sided RLS already existing (migration `20260729092144`). Topics detail already renders linked Views read-only, but nothing lets a user create or remove those links.

**Backlog, no session assigned**
- Dark-mode check (contrast, destructive buttons, validation messages, focus outlines, disabled submit-button state) across all touched pages, including whatever delete UI eventually ships.
- `TableSkeleton` row-count jump — defaults to 6 rows regardless of real data volume, causing a visible shrink when real content is smaller (e.g. 3 real Views vs. 6 skeleton rows). Options identified: lower the default row count, or add a fade transition.
- Slow `/views` page load — reported and reproduced; cause not yet identified. Duplicate port-3000 processes ruled out as the explanation.

**Still open, no session assigned** — Delete UI + confirmation dialog for Views and Topics. Was in Session 1.6's original polish scope; check `docs/session-specs/1.6-polish-tests.md`'s Definition of Done for current status before assuming it's done.

## Where to look for more detail

- `docs/session-specs/` — per-session specs (currently just `1.6-polish-tests.md`)
- `docs/adr/` — architecture decisions, numbered ADR-001 through ADR-005
- `docs/design/` — schema design notes (`schema-addendum.md`, superseded; `1.4-schema-reconciliation.md`, current)
- `docs/debriefs.md` — session-by-session retrospectives, including what Claude Code did well/badly each time
- `CLAUDE.md` — core constraints, conventions, and decisions log index
