# Project 1 Retrospective (Sessions 1.1–1.8)

Date range: 2026-07-22 – 2026-08-15. Source: `docs/debriefs.md` (session-by-session
detail) and `docs/CURRENT-STATE.md` (verified snapshot as of 2026-08-13; backlog
items below are copied from it directly, not re-derived).

## What shipped

- **1.1 — Foundations.** PRD, tech design, ADR-001 (UUID primary keys), ADR-002
  (many-to-many Topic/View relationships), CLAUDE.md, and the thesis-tracker repo
  itself — including a real architecture change mid-session, from a
  single-entity/single-parent model to the two-entity Topic/View model this app
  still runs on.
- **1.2 — Scaffold + auth.** Next.js scaffold, live Supabase project, Google OAuth
  wired end-to-end (client, server, middleware, login page, callback route),
  deployed to Vercel, middleware corrected to default-deny per CLAUDE.md rule 8.
- **1.3 — Data model + tenancy.** Five tables (`topics`, `views`, `view_topics`,
  `view_relationships`, `evidence_items`) with RLS enforcing tenancy — direct
  ownership on two tables, two-sided `EXISTS` on the join tables, single-sided on
  `evidence_items`. Fixed a GRANT/REVOKE gap (base CRUD grants were missing; a
  stray TRUNCATE grant existed). Built the vitest cross-tenant isolation suite
  against real auth users on local Docker Supabase.
- **1.4 (partial) — RLS gap closure.** Closed four RLS gaps carried forward from
  1.3. 15/15 tests passing.
- **1.4 — Views CRUD (list + detail) + schema reconciliation.** Views list and
  detail pages, both server components relying entirely on RLS for tenancy.
  Discovered and fixed seven undocumented mismatches between the live schema and
  the PRD/tech-design (missing enum constraints, a missing `tags` column,
  inverted required/optional fields on `evidence_items`, unresolved
  `view_relationships` column directionality, and more) — logged as ADR-003.
  Made `evidence_items` many-to-many with `views` via a new `view_evidence` join
  table. Seeded the three real Parchmount Views from the PRD appendix.
- **1.5 — CRUD UI (create + edit).** Live create/edit for Views. RLS hardened
  across all six tables with per-operation policy scoping (ADR-005), replacing
  blanket `FOR ALL` policies. Topics list page. Dev-login test infrastructure.
- **1.6 — Polish + tests.** Shared UI primitives (`Skeleton`, `TableSkeleton`,
  `DetailSkeleton`, `FormSkeleton`, `EmptyState`, `ErrorState`, `NotFoundState`),
  wired into loading/error/empty states across Views and Topics. Custom 404 page.
  Playwright added for visual verification. `docs/CURRENT-STATE.md` created as
  the single verified-snapshot doc, with a CLAUDE.md rule requiring it be updated
  at every session close-out.
- **1.6a — Topics CRUD (detail/create/edit).** Topics reached full CRUD parity
  with Views, mirroring the same auth/RLS/error-handling pattern.
- **1.6b — Evidence CRUD + stance architecture.** Evidence create/attach shipped
  via an atomic `create_view_evidence` RPC, with per-link stance (ADR-006:
  stance is relationship-level metadata on `view_evidence`, not a column on
  `evidence_items`). A production incident (View detail pages 404ing for their
  own owner, caused by a migration verified locally but never pushed to the
  production project) was found and fixed same-session.
- **1.6c — Security hardening + nav shell + linking UI.** RPC ownership check
  made an independent defense-in-depth layer (not a bare re-check of RLS),
  implicit `PUBLIC EXECUTE` grant revoked, View detail page's error/not-found
  collapse fixed. DROP COLUMN guard-clause pattern documented (reference only,
  not yet applied). Topics action-layer tests added. Persistent nav shell,
  `framing_note` read-only display on Topic detail, and View-Topic linking UI
  (View detail owns link/unlink; Topic detail stays read-only) all shipped in
  one pass.
- **1.7 — Sign-out + deploy + light red-team.** Working sign-out button (default
  global scope, revokes the refresh token server-side, redirects to `/login`).
  Verified locally and in production. Three red-team attacks run against the
  live app — cross-tenant View access, stale post-signout session, forged
  `viewId` on the evidence RPC — all three blocked.
- **1.8 — Debrief + retrospective (this session).** Added the `new-debrief` skill
  (`.claude/skills/new-debrief/`) to scaffold future session debriefs via a
  draft-then-reflect flow. Ran a Codex comparative re-implementation of the
  Topics CRUD routes on a disposable branch (`codex-comparison/topics-crud`,
  commit `d03913e`) for a side-by-side style comparison against the Claude
  Code-built version. This retro doc.

## Open backlog

Pulled directly from `docs/CURRENT-STATE.md`'s Backlog section (verified
2026-08-13) — nothing added or inferred beyond what's listed there:

- **Delete UI + confirmation dialog** for Views and Topics. Backend delete is
  RLS-protected but unreachable from the app.
- **Evidence has no edit UI and no standalone list** — reachable only through
  its parent View.
- **Views' `tags` column is set-invisible from the UI** — the column exists
  (migration `20260801161736`, ADR-003) and View detail displays it, but
  neither the create nor edit form has a field to set it, so it's effectively
  always null.
- **Slow `/views` page load** — reported and reproduced; cause not yet
  identified. Duplicate port-3000 processes ruled out as the explanation.
- **Dark-mode check** (contrast, destructive buttons, validation messages,
  focus outlines, disabled submit-button state) across all touched pages,
  including whatever delete UI eventually ships.
- **`TableSkeleton` row-count jump** — defaults to 6 rows regardless of real
  data volume, causing a visible shrink when real content is smaller.
- **`/dashboard` route** — the OAuth sign-in landing page (`app/dashboard/`),
  undocumented and not yet investigated. Surfaced during Session 1.7 red-team
  testing.

Also still open per `docs/CURRENT-STATE.md`'s Tests section: the **View**
create/edit action functions have no app-layer tests (the same gap Topics and
`view_topics` have since closed), and `view_relationships` has no UI or action
layer yet, so only its DB-layer RLS is exercised.

## Patterns that carry forward to Project 2

**Auth**
- Default-deny middleware (CLAUDE.md rule 8): routes are auth-required unless
  explicitly marked public.
- `user_id` is always server-derived from the authenticated session, never
  accepted from the client, on every insert/update (CLAUDE.md rule 2).
- Sign-out at Supabase's default global scope — revokes the refresh token
  server-side and clears cookies, not just a client-side redirect.

**RLS / tenancy**
- Two-sided `EXISTS` ownership checks on join tables (a row is
  writable/visible only if the user owns *both* sides), not a single-sided
  check that assumes the other side is already safe.
- Per-operation RLS policy scoping (ADR-005) instead of a blanket `FOR ALL`
  policy, so each operation's authorization logic is legible on its own.
- Base ACL (`GRANT`/`REVOKE`) is a separate layer from RLS policies — RLS can
  be perfectly correct and still unreachable if the underlying grants are
  missing (the 1.3 bug), and Postgres's implicit `PUBLIC EXECUTE` grant on
  functions has to be explicitly revoked (the 1.6c fix).
- `SECURITY INVOKER` RPCs need an explicit in-function ownership guard that's
  genuinely independent of RLS (checks `user_id = auth.uid()` directly, not a
  bare `id = p_id` that just re-runs the same RLS filter) — defense-in-depth
  only works if the two layers can actually fail independently.
- Collapse "doesn't exist" and "belongs to another user" into the same
  not-found response so a bad guess can't be distinguished from a well-formed
  one — but keep a genuine query error on a separate path (`ErrorState`) from
  a real zero-row not-found (`notFound()`), so errors don't silently disguise
  themselves as 404s (the root cause of the 1.6b production incident).
- Local Supabase changes and production are separate deploys — a migration
  tested and verified locally is not live until it's explicitly pushed to the
  remote project.

**CLAUDE.md / process**
- Core Constraints function as an enforced checklist, not aspirational
  documentation — several sessions (1.3's GRANT gap, 1.6c's RPC hardening)
  were driven directly by re-checking a specific numbered rule against real
  state.
- `docs/CURRENT-STATE.md` exists specifically because of the 1.4 schema-drift
  incident (seven undocumented mismatches accumulated silently). It's a
  snapshot, overwritten in place at every session close-out, not a running
  log — history belongs in `docs/debriefs.md` instead.
- ADRs log the *why* behind non-obvious schema/architecture decisions
  (ADR-001 through ADR-006) so a later session doesn't have to reconstruct
  the reasoning from the diff alone.

**Tests**
- DB-touching test files guard themselves at import time, throwing if the
  configured Supabase URL isn't `127.0.0.1`/`localhost` — a hard stop against
  accidentally running destructive tests against a real environment.
- App-layer action tests mock `@/lib/supabase/server` to inject a real authed
  client, so the actual action code runs against real local Supabase rather
  than a fully mocked stand-in.
- Every auth path and cross-tenant boundary gets an explicit rejection test
  (not just a happy-path test) — including forced double-writes to prove a
  unique-constraint handler works, not just the UI validation in front of it.
- A positive control belongs alongside negative tests, so a test suite that
  passes because everything is silently broken can't hide behind all-green
  output.

**Review discipline**
- Manual click-through first for UI-only changes; full line-by-line diff
  review reserved for anything touching auth, security, or data that can't be
  recovered if wrong (the split that held up across 1.6c's Task 1 vs. Task 6).
