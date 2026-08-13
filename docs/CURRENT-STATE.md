# Current State

Read this first, before scoping any new session. Verified directly against the filesystem/migrations/tests at the time this was written (2026-08-13) — not from memory or from prior session summaries. If it looks stale, re-verify rather than trust it; update it once your session's changes land.

## App shell and navigation

- Root `/` (`app/page.tsx`) redirects to `/topics` (middleware then gates unauthenticated users to `/login`).
- Persistent top nav (`components/site-nav.tsx`, a client component rendered in `app/layout.tsx`) links **Topics** and **Views** on every authenticated page, highlights the active section via `usePathname()`, and wraps rather than clips on narrow viewports. It hides itself on the public/auth routes (`/login`, `/dev-login`, `/auth/*`).
- Both list pages have a create affordance: **New View** / **New Topic** header links, plus a CTA on the Topics empty state so creation is reachable even with zero topics.

## Entities and pages

### Views — full CRUD exists
- `app/views/page.tsx` — list (has a **New View** link)
- `app/views/[id]/page.tsx` — detail: shows fields, a **Topics** section (link/unlink, see below), and attached evidence grouped by stance. Distinguishes a genuine query error (renders `ErrorState`) from a zero-row not-found (`notFound()`).
- `app/views/new/page.tsx` + `new-view-form.tsx` + `actions.ts` — create
- `app/views/[id]/edit/page.tsx` + `edit-view-form.tsx` + `actions.ts` — edit
- `app/views/[id]/actions.ts` — `linkTopic` / `unlinkTopic` server actions (View↔Topic linking)
- `app/views/[id]/topic-links.tsx` — inline client control for linking/unlinking topics
- `loading.tsx` present for list/detail/create/edit, using shared skeleton components
- No delete UI. Backend delete is RLS-protected but unreachable from the app.

### Topics — full CRUD exists
- `app/topics/page.tsx` — list (has a **New Topic** link); rows link to the detail page
- `app/topics/[id]/page.tsx` — detail: shows `framing_note` (read-only, muted "None" when null), Created/Updated, and a **read-only** list of linked Views. Has an Edit link.
- `app/topics/new/page.tsx` + `new-topic-form.tsx` + `actions.ts` — create
- `app/topics/[id]/edit/page.tsx` + `edit-topic-form.tsx` + `actions.ts` — edit
- `loading.tsx` present for list/detail/create/edit, using shared skeleton components
- No delete UI (same gap as Views).

### View↔Topic linking — create/remove exists (View-side only)
`view_topics` join table (many-to-many) with per-operation two-sided RLS (migration `20260803140000`): a row is writable/visible only if the user owns **both** the view and the topic. Linking needs no RPC or migration — it's a single insert/delete into the existing table.

The **View detail page owns** link/unlink: `linkTopic` / `unlinkTopic` in `app/views/[id]/actions.ts` (signed-in gate at the app layer; two-sided RLS `WITH CHECK`/`USING` is the fail-closed ownership backstop), driven by the inline `topic-links.tsx` client control (a dropdown of the user's not-yet-linked topics + per-link Remove). Duplicate links surface a friendly "already linked" error (the `unique (view_id, topic_id)` constraint). The **Topic detail page stays read-only** — it lists linked Views but has no link/unlink affordance, by design (a View is the authored bet; a Topic is the bucket you file it under).

### Evidence — create/attach and display exist, no edit or standalone list
`evidence_items` and `view_evidence` tables exist (migrations `20260801161736_reconcile_schema_with_prd.sql` and `20260811151408_move_stance_to_view_evidence.sql`), many-to-many with `views`, two-sided RLS on `view_evidence`. `stance` is a three-value CHECK (`for`/`against`/`context`) on `view_evidence`, not `evidence_items`: per **ADR-006** (`docs/adr/ADR-006-stance-per-link.md`), stance is relationship-level metadata describing how a specific evidence item relates to a specific View, so it lives on the view↔evidence link.

The create/attach flow exists at `app/views/[id]/evidence/new/` (page + `new-evidence-form.tsx` + `actions.ts` + `loading.tsx`): from a View, a user creates an evidence item (link and/or note — at least one required) and attaches it to that View with an optional stance, in one atomic action. The two inserts (`evidence_items` then `view_evidence`) run inside the `create_view_evidence` RPC (`SECURITY INVOKER`, migrations `20260811154206` and hardened by `20260813103035`) so a failure on the second rolls back the first — no orphaned evidence rows.

Attached evidence displays read-only on the View detail page, grouped by stance (For / Against / Context, with null-stance items in a trailing "Unspecified" group), each item showing its link and/or note. Still open: no edit UI for existing evidence, and no standalone evidence list (evidence is only reachable through its parent View).

### Shared UI components (`components/ui/`)
`skeleton.tsx`, `table-skeleton.tsx`, `detail-skeleton.tsx`, `form-skeleton.tsx`, `empty-state.tsx`, `error-state.tsx`, `not-found-state.tsx` — used across the Views and Topics pages. `app/not-found.tsx` (root) renders `NotFoundState` for the collapsed not-found/unauthorized case. (`components/site-nav.tsx` is the one non-`ui/` shared component — see App shell above.)

## Database

Migrations in `supabase/migrations/`, in order (all applied locally and confirmed live on the remote — `supabase migration list` shows local == remote):
1. `20260728165150_create_topics_and_views.sql`
2. `20260729092144_create_view_join_tables.sql`
3. `20260729100703_create_evidence_items.sql`
4. `20260729102114_grant_authenticated_crud.sql`
5. `20260729102707_revoke_truncate_authenticated.sql`
6. `20260801161736_reconcile_schema_with_prd.sql` — PRD reconciliation (ADR-003): evidence_items → many-to-many via view_evidence, confidence_level/time_horizon CHECK constraints, tags added, view_relationships renamed with canonical ordering.
7. `20260803140000_scope_rls_policies_per_operation.sql` — per-operation RLS policies (ADR-005, Session 1.5).
8. `20260811151408_move_stance_to_view_evidence.sql` — stance moves to view_evidence (ADR-006): three-value CHECK on view_evidence, dropped from evidence_items.
9. `20260811154206_create_view_evidence_rpc.sql` — the `create_view_evidence` RPC: atomic two-table insert in a single transaction, `SECURITY INVOKER` so RLS re-enforces ownership on both inserts.
10. `20260813103035_harden_create_view_evidence.sql` — hardens the RPC: explicit in-function ownership guard on `p_view_id` (`user_id = auth.uid()`, fail closed before either insert, independent of RLS) and `revoke execute … from public`, keeping `authenticated` only.

`docs/design/schema-addendum.md` is **SUPERSEDED** (documents the pre-ADR-003 Session 1.3 schema). Treat `supabase/migrations/` and `docs/adr/ADR-003-prd-schema-reconciliation.md` onward as the source of truth instead.

## Tests

49 tests total, across four files, all passing. Run with `npm run test` (vitest). All point at local Supabase via `.env.test.local`'s `SUPABASE_TEST_*` vars; each file throws at import time if `SUPABASE_TEST_URL` isn't `127.0.0.1`/`localhost` (an explicit per-file guard). `vitest.config.ts` defines an `@/` alias so tests can import app modules and mock `@/lib/supabase/server`.

- `tests/rls-tenancy.test.ts` — 35 tests. DB-layer cross-tenant RLS boundaries (read/insert/update/delete blocking, ownership forgery, cascade-delete, stance-column isolation) across `topics`, `views`, `view_topics`, `view_relationships`, `evidence_items`, `view_evidence`, plus the `create_view_evidence` RPC happy-path and cross-tenant rollback.
- `tests/middleware-auth.test.ts` — 2 tests. Unit-tests `lib/supabase/middleware.ts`'s `updateSession()` redirect-to-`/login` gate for unauthenticated `/views` and `/topics`.
- `tests/topics-actions.test.ts` — 7 tests. App-layer `createTopic` / `updateTopic`: success, `framing_note` write path (value + null-on-whitespace), validation, and cross-tenant update rejection. Mocks `@/lib/supabase/server` to inject a real authed client so the real action runs against local Supabase.
- `tests/view-topics-actions.test.ts` — 5 tests. App-layer `linkTopic` / `unlinkTopic`: success, cross-tenant rejection both directions, and a forced double-link proving the unique-constraint handler (not just the UI) catches duplicates.

Seed user for dev-login: `dev@thesis-tracker.local` (`scripts/seed-dev-user.mjs`).

Not yet app-tested: the **View** create/edit action functions (`app/views/new/actions.ts`, `app/views/[id]/edit/actions.ts`) — the same action-layer gap that Topics and view_topics have since closed. `view_relationships` has no UI or action layer yet, so only its DB-layer RLS is exercised.

## Backlog — open items, no session assigned

- **Delete UI + confirmation dialog** for Views and Topics. Backend delete is RLS-protected but unreachable from the app. (Was in Session 1.6's original polish scope — check `docs/session-specs/1.6-polish-tests.md`'s Definition of Done before assuming status.)
- **Evidence** has no edit UI and no standalone list (reachable only through its parent View).
- **Views' `tags` column is set-invisible from the UI** — the column exists (migration `20260801161736`, ADR-003) and View detail displays it, but neither the create nor edit form has a field to set it, so it's effectively always null. A write path (form field + action wiring) was never built.
- **Slow `/views` page load** — reported and reproduced; cause not yet identified. Duplicate port-3000 processes ruled out as the explanation.
- **Dark-mode check** (contrast, destructive buttons, validation messages, focus outlines, disabled submit-button state) across all touched pages, including whatever delete UI eventually ships.
- **`TableSkeleton` row-count jump** — defaults to 6 rows regardless of real data volume, causing a visible shrink when real content is smaller. Options: lower the default, or add a fade transition.

## Where to look for more detail

- `docs/session-specs/` — per-session specs (currently just `1.6-polish-tests.md`)
- `docs/adr/` — architecture decisions, numbered ADR-001 through ADR-006
- `docs/design/` — `drop-column-pattern.md` (reference pattern for future DROP COLUMN migrations, not yet applied to any column); `1.4-schema-reconciliation.md` (current); `schema-addendum.md` (superseded)
- `docs/debriefs.md` — session-by-session retrospectives
- `CLAUDE.md` — core constraints, conventions, and decisions log index
