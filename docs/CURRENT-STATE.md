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

### Evidence — create/attach and display exist, no edit or standalone list
`evidence_items` and `view_evidence` tables exist (migrations `20260801161736_reconcile_schema_with_prd.sql` and `20260811151408_move_stance_to_view_evidence.sql`), many-to-many with `views`, two-sided RLS on `view_evidence`. `stance` is a three-value CHECK (`for`/`against`/`context`) on `view_evidence`, not `evidence_items`: per **ADR-006** (`docs/adr/ADR-006-stance-per-link.md`), stance is relationship-level metadata describing how a specific evidence item relates to a specific View, so it lives on the view↔evidence link. The per-item-vs-per-link question is resolved (ADR-006), no longer open.

The create/attach flow exists at `app/views/[id]/evidence/new/` (page + `new-evidence-form.tsx` + `actions.ts` + `loading.tsx`): from a View, a user creates an evidence item (link and/or note — at least one required) and attaches it to that View with an optional stance, in one atomic action. The two inserts (`evidence_items` then `view_evidence`) run inside the `create_view_evidence` RPC (`SECURITY INVOKER`, migration `20260811154206_create_view_evidence_rpc.sql`) so a failure on the second rolls back the first — no orphaned evidence rows.

Attached evidence displays read-only on the View detail page (`app/views/[id]/page.tsx`), grouped by stance (For / Against / Context, with null-stance items in a trailing "Unspecified" group), each item showing its link and/or note. Still open: no edit UI for existing evidence, and no standalone evidence list (evidence is only reachable through its parent View).

## Database

Migrations in `supabase/migrations/`, in order:
1. `20260728165150_create_topics_and_views.sql`
2. `20260729092144_create_view_join_tables.sql`
3. `20260729100703_create_evidence_items.sql`
4. `20260729102114_grant_authenticated_crud.sql`
5. `20260729102707_revoke_truncate_authenticated.sql`
6. `20260801161736_reconcile_schema_with_prd.sql` — PRD reconciliation (ADR-003): evidence_items → many-to-many via view_evidence, confidence_level/time_horizon CHECK constraints, tags added, view_relationships renamed with canonical ordering.
7. `20260803140000_scope_rls_policies_per_operation.sql` — per-operation RLS policies (Session 1.5).
8. `20260811151408_move_stance_to_view_evidence.sql` — stance moves to view_evidence (ADR-006): adds three-value `stance` CHECK (`for`/`against`/`context`) on view_evidence, drops `stance` from evidence_items. RLS policies unchanged (row-level, so they already cover the new column).
9. `20260811154206_create_view_evidence_rpc.sql` — the `create_view_evidence` RPC: atomic two-table insert (`evidence_items` then `view_evidence`) in a single transaction, `SECURITY INVOKER` so RLS re-enforces ownership on both inserts.

`docs/design/schema-addendum.md` is marked **SUPERSEDED** as of this session — it documents the pre-ADR-003 (Session 1.3) schema. Treat `supabase/migrations/` and `docs/adr/ADR-003-prd-schema-reconciliation.md` onward as the source of truth instead.

## Tests

35 tests total, across two files, all passing as of this session:
- `tests/rls-tenancy.test.ts` — 33 tests. Cross-tenant RLS boundaries (read/insert/update/delete blocking, ownership forgery, cascade-delete behavior) across `topics`, `views`, `view_topics`, `view_relationships`, `evidence_items`, `view_evidence` — including a stance-column cross-tenant test (ADR-006) asserting user B cannot read or update `stance` on user A's `view_evidence` row.
- `tests/middleware-auth.test.ts` — 2 tests. Unit-tests `lib/supabase/middleware.ts`'s `updateSession()` redirect-to-`/login` gate directly (not Supabase RLS) for unauthenticated requests to `/views` and `/topics`.

Run with `npm run test` (vitest). Both files are configured via `.env.test.local`'s `SUPABASE_TEST_*` variables to point at local Supabase, and both files throw immediately at import time if `SUPABASE_TEST_URL` doesn't match `127.0.0.1`/`localhost` — an explicit guard in each file, not a shared enforcement mechanism. See `scripts/seed-dev-user.mjs` for the dev-login seed user, `dev@thesis-tracker.local`.

Not yet tested: `view_evidence` / `view_relationships` tenancy scenarios beyond what's in `rls-tenancy.test.ts` already — no UI exists to exercise them through yet.

Also not yet tested: the Topics action-layer functions `createTopic` (`app/topics/new/actions.ts`) and `updateTopic` (`app/topics/[id]/edit/actions.ts`) have zero test coverage as of end of Session 1.6a — no test file references either function. Same kind of gap as the `view_evidence`/`view_relationships` one above.

## Deferred work by session

**Session 1.6a** — ✅ Complete. Topics detail/create/edit pages built with full CRUD parity with Views, plus loading states; list rows link to detail and detail has an Edit link. (Gaps carried forward: `createTopic`/`updateTopic` still untested; `framing_note` captured but not displayed — see the Topics and Tests sections above.)

**Session 1.6b** — Evidence CRUD UI (tables already exist). The schema-level questions are settled: `stance` lives on `view_evidence` (per-link, ADR-006) as a three-value CHECK (`for`/`against`/`context`), already migrated. Remaining work is the UI itself — routes/forms to create, edit, link, and set stance on evidence.

**Session 1.6c** — View-Topic linking UI. No UI currently exists to connect a View to a Topic, despite the `view_topics` join table and its two-sided RLS already existing (migration `20260729092144`). Topics detail already renders linked Views read-only, but nothing lets a user create or remove those links.

Pre-work before the linking UI build starts:
1. **Navigation audit** — click through the entire app as a first-time user and list every dead end or missing link in one pass. The nav-clipping/missing-links backlog item is a known starting point, not the full scope.
2. **Topics action-layer tests** (`createTopic`, `updateTopic`) — carried from 1.6a; still untested.
3. **`framing_note` display decision** — carried from 1.6a; captured on create/edit but not displayed, pending a product call on whether/how to surface it.
4. **Confirm production stays in sync going forward** — make "push migrations to production" an explicit step whenever a session includes schema changes, not just local testing. (This session's incident: three migrations, including a week-old one, had only been applied locally, which broke the deployed app.)
5. **Security/data-safety fixes from Session 1.6b's review pass** — new migrations/code, not edits to the already-pushed files:
   1. `create_view_evidence` RPC: add an explicit in-function ownership check on `p_view_id` (fail closed, don't rely solely on RLS) before inserting; and `revoke execute … from public`, keeping the grant to `authenticated` only.
   2. Establish a standard pattern for future `DROP COLUMN` migrations: guard with a check that raises an exception if non-null data would be lost, or backfill explicitly. Applying it retroactively isn't required, but the pattern should exist before it's needed again.
   3. `app/views/[id]/page.tsx`: stop collapsing all query errors into `notFound()` — distinguish "row doesn't exist / not owned" from "query failed," so a schema-drift bug can't disguise itself as a 404 again.
   Reference: full findings in this session's scoped review pass (RPC + stance migration), summarized in `docs/debriefs.md` (Session 1.6b entry).

(The manual two-Google-account cross-tenant check on the Evidence feature, deferred from 1.6b during the production incident, has since been completed — one account confirmed unable to see or attach another's evidence — so it is no longer pending.)

**Backlog, no session assigned**
- Dark-mode check (contrast, destructive buttons, validation messages, focus outlines, disabled submit-button state) across all touched pages, including whatever delete UI eventually ships.
- `TableSkeleton` row-count jump — defaults to 6 rows regardless of real data volume, causing a visible shrink when real content is smaller (e.g. 3 real Views vs. 6 skeleton rows). Options identified: lower the default row count, or add a fade transition.
- Slow `/views` page load — reported and reproduced; cause not yet identified. Duplicate port-3000 processes ruled out as the explanation.
- Navigation links missing or cut off — several nav/action links are either clipped at the right edge of the viewport or not rendered at all, despite their routes working. Observed: the Topics nav link (and possibly other header content) appears clipped at the right edge on the View detail page, where the "Add evidence" link is also cut off; and `/views` has no visible "New View" link even though `/views/new` is a fully working route. These look like one underlying issue (missing/clipped navigation affordances), not separate bugs. Needs investigation.
- Views' `tags` column is set-invisible from the UI — the column exists in schema (migration `20260801161736`, ADR-003) and the View detail page displays it, but neither the create nor edit form has a field to set it, so it's effectively always null from the UI's perspective. A write path (form field + action wiring) was never built.

**Still open, no session assigned** — Delete UI + confirmation dialog for Views and Topics. Was in Session 1.6's original polish scope; check `docs/session-specs/1.6-polish-tests.md`'s Definition of Done for current status before assuming it's done.

## Where to look for more detail

- `docs/session-specs/` — per-session specs (currently just `1.6-polish-tests.md`)
- `docs/adr/` — architecture decisions, numbered ADR-001 through ADR-006
- `docs/design/` — schema design notes (`schema-addendum.md`, superseded; `1.4-schema-reconciliation.md`, current)
- `docs/debriefs.md` — session-by-session retrospectives, including what Claude Code did well/badly each time
- `CLAUDE.md` — core constraints, conventions, and decisions log index
