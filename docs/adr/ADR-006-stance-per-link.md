# ADR-006: Stance lives on view_evidence, not evidence_items
Status: accepted
Date: 2026-08-11

## Context
evidence_items are many-to-many with views via view_evidence. `stance`
(for/against/context) currently lives on evidence_items (ADR-003), placed
there by default rather than as a deliberate choice.

evidence_items record what was found — a link, a note. views record a
thesis being evaluated. stance is neither of these on its own: it describes
how a specific piece of evidence relates to a specific View. It is
relationship-level metadata, not an intrinsic property of the evidence.

## Decision
stance moves to view_evidence. The same evidence item can carry a different
stance for each View it's linked to, because stance describes the
evidence-View relationship, not the evidence itself.

## Alternatives Considered
- **Per-item (evidence_items.stance):** rejected. Forces one global stance
  per evidence item. Either imposes an incorrect interpretation on evidence
  reused across Views, or eventually forces duplicating evidence records
  when interpretation differs by View.
- **Hybrid (evidence_items.default_stance + view_evidence.stance override):**
  considered, rejected. Requires two nullable stance-like columns, a
  fallback-resolution rule reimplemented everywhere stance is read, and
  roughly doubles RLS/test surface for this feature. Solves a problem
  (unattached evidence needing a stance) that has no current driver in this
  application — see Accepted Limitation below. Not worth building ahead of
  a real use case.

## Consequences

**Positive:**
- Evidence can be reused across Views without duplication.
- Each View independently interprets the same evidence.
- Model matches how stance is actually used: as relationship-level
  analytical metadata, not a fact about the evidence.

**Costs:**
- Queries involving stance go through view_evidence, not evidence_items
  directly.
- view_evidence is no longer a purely mechanical join table — it now
  carries meaningful analytical state.
- Existing two-sided RLS policies on view_evidence must be verified (not
  rewritten) to cover the new column.
- Evidence creation from within a View UI requires an atomic two-table
  write (evidence_items + view_evidence) to avoid orphaned evidence rows.

**Accepted limitation:**
Evidence with no View link has no stance — there is currently no
unattached/inbox-style evidence-capture flow in this application, so this
does not affect the present build. If a capture-before-linking workflow is
added later, this should be revisited as its own decision, not designed
around preemptively now.
