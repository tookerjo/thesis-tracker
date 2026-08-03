# ADR-005: RLS policies scoped per-operation, not FOR ALL
Status: accepted
Date: 2026-08-03

## Context
Session 1.5 introduces INSERT (create form) and real UPDATE (edit form) paths
for the first time. Prior RLS policies only had to be correct for SELECT.
A single FOR ALL policy conflates USING (which existing rows a user can
touch) with WITH CHECK (what data a user is allowed to write), risking a
policy that correctly restricts reads while leaving writes unrestricted.

## Decision
Every user-owned table (views, topics, and their join tables) uses four
separate policies — SELECT, INSERT, UPDATE, DELETE — instead of one FOR ALL
policy. INSERT and UPDATE explicitly define WITH CHECK (auth.uid() =
user_id). UPDATE also defines USING (auth.uid() = user_id). user_id is never
trusted from client-supplied input on insert or update; it is derived
server-side from the authenticated session, with WITH CHECK as the
database-level backstop.

## Alternatives Considered
- Single FOR ALL policy: rejected — the MenuGen-class risk of writes
  unintentionally being under-constrained relative to reads.

## Consequences
Enables: writes are constrained independently of reads, verifiable per
operation in tests. Costs: more policies to write and maintain per table;
future tables must follow the same four-policy pattern rather than a
shortcut FOR ALL.
