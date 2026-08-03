# ADR-004: Cascade-delete scoped to join rows only
Status: accepted
Date: 2026-08-03

## Context
Views connect to Topics, Evidence Items, and other Views through join tables:
view_topics, view_evidence, and view_relationships. Evidence items can attach
to multiple Views (per Session 1.4 / ADR-003), and must survive independently
of any single View. Session 1.5 introduces the first UI paths (create/edit
forms) where deletion becomes a real user action rather than a manual DB
operation.

## Decision
Deleting a View, Topic, or Evidence Item cascades ON DELETE CASCADE only to
the join-table rows that reference it (view_topics, view_evidence,
view_relationships). It never cascades to the related entity itself. Deleting
a View never deletes the Evidence Items or Topics linked to it — only the
link rows disappear.

## Alternatives Considered
- Cascade to related entities (deleting a View deletes its evidence too):
  rejected — violates the many-to-many intent from ADR-003, where evidence
  is meant to outlive any single View it's attached to.
- No cascade, manual cleanup required: rejected — leaves orphaned join rows
  referencing a deleted parent, which RLS and app code would need to
  defensively filter around forever.

## Consequences
Enables: safe View/Topic deletion without orphaning data or silently
destroying evidence linked to other Views. Costs: deleting a View does not
"clean up" its evidence automatically — evidence with no remaining links
becomes an orphan that the app must surface separately (future session,
not today).
