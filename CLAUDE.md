# Project: Thesis Tracker

## Purpose
A single-user web app for tracking Parchmount investment thinking at two levels:
Topics (broad recurring buckets, no claim) and Views (specific falsifiable bets,
with hypothesis, evidence for/against, confidence, and time horizon), connected
many-to-many — a View can relate to more than one Topic or other View at once
(ADR-002). Replaces the current scattered mix of Google Sheets, Apple Notes,
Open Brain, Slack uploads, and self-texts with one deliberate place to record
and revisit theses. Manual entry and manual editing only — no automated
ingestion or cross-source matching in this version.

## Core Constraints (Claude Code must respect these — NEVER violate)
1. All entities use UUID primary keys. NEVER use email or any user-provided field as a primary key.
2. All user data scoped by user_id. Tenancy enforced at both DB (RLS) AND application middleware. NEVER trust client-supplied user_id.
3. All LLM calls rate-limited per user. NEVER allow unbounded LLM loops.
4. User-supplied content is untrusted in prompts. Use clear delimiters / instruction hierarchy.
5. Tests required for every auth path and every cross-tenant boundary, enforced by
   the end of the session where that path is the primary focus (e.g., the auth
   session, the tenancy/RLS session) — not necessarily in the same commit it's
   first scaffolded.
6. Files >300 lines or functions >50 lines require justification in code review.
7. Secrets in env vars only, never in code or in test fixtures.
8. Default-deny auth: routes are auth-required unless explicitly marked public.

## Decisions Log
- ADR-001: [docs/adr/ADR-001-uuid-primary-keys.md](docs/adr/ADR-001-uuid-primary-keys.md)
- ADR-002: [docs/adr/ADR-002-many-to-many-topic-view-relationships.md](docs/adr/ADR-002-many-to-many-topic-view-relationships.md)
- ADR-003: [docs/adr/ADR-003-prd-schema-reconciliation.md](docs/adr/ADR-003-prd-schema-reconciliation.md)
- ADR-004: [docs/adr/ADR-004-cascade-delete.md](docs/adr/ADR-004-cascade-delete.md)
- ADR-005: [docs/adr/ADR-005-rls-policy-scoping.md](docs/adr/ADR-005-rls-policy-scoping.md)
- (add as project evolves)

## Current Phase
Session 1.3 complete — schema (topics, views, view_topics, view_relationships,
evidence_items), RLS policies, GRANT/REVOKE on authenticated, and cross-tenant
RLS tests all built and pushed to main. No CRUD routes built yet.

## Conventions
- TypeScript strict mode on
- No `any` types without justification comment
- All async functions have explicit error handling
- All env vars documented in .env.example

## Session Close-Out
Before ending any session, update docs/CURRENT-STATE.md to reflect verified reality — check the actual filesystem/migrations/tests, don't rely on memory or prior summaries. This file is a snapshot, not a log:
- Overwrite sections in place; don't append history on top of old content.
- When something moves from "deferred/backlog" to "done," remove it from this file entirely — its history belongs in docs/debriefs.md, not here.
- Keep each entity/section to what's true right now, not a running commentary of how it got that way.

## Carried forward from Session 1.3
- Verify user_id is server-derived (never client-supplied) in the first CRUD
  insert/update routes. RLS's WITH CHECK blocks a forged value at the DB layer,
  but app-layer enforcement (CLAUDE.md #2) can't be verified until routes exist.
