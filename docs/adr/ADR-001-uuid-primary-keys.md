# ADR-001: Primary keys are UUIDs, never derived from user input
Status: accepted
Date: 2026-07-22

## Context
Every entity needs a stable identifier. The Thesis Tracker's `theses` table needs
a primary key, and future tables (users, later projects) will too. A common
mistake is using something user-facing — a title, a slug, an email — as the
primary key, because it seems convenient early on.

## Decision
All primary keys are server-generated UUIDs. No primary key is ever derived from
title, email, or any other user-supplied or user-editable field.

## Alternatives Considered
- Option A: Use thesis title as a natural key (rejected — titles can be edited or
  duplicated; a natural key that can change breaks every foreign key referencing
  it)
- Option B: Use an auto-incrementing integer ID (rejected — sequential integers
  leak information about row count and creation order, and don't generalize
  cleanly to multi-tenant systems where IDs might need to be generated
  client-side or merged across sources later)

## Consequences
Enables safe renaming/editing of any user-facing field (title, tags) without
breaking relationships (e.g., parent_thesis_id) or requiring a migration.
Costs a small amount of readability in raw database queries (UUIDs aren't
human-scannable like sequential IDs), which is an acceptable tradeoff. Commits
this same rule to every future project in the syllabus — Session 1.3's RLS
policies and every later project's identity model depend on this rule holding.
