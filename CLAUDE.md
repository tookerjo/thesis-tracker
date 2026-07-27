# Project: Thesis Tracker

## Purpose
A single-user web app for tracking Parchmount investment theses: title, hypothesis,
evidence for/against, related companies, confidence, time horizon, tags, and
relationships between theses. Replaces the current scattered mix of Google Sheets,
Apple Notes, Open Brain, Slack uploads, and self-texts with one deliberate place to
record and revisit theses. Manual entry and manual editing only — no automated
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
- (add as project evolves)

## Current Phase
Session 1.1 — spec and repo init complete, scaffold not yet built.

## Conventions
- TypeScript strict mode on
- No `any` types without justification comment
- All async functions have explicit error handling
- All env vars documented in .env.example
