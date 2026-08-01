# ADR-003: PRD/schema reconciliation and evidence_items many-to-many with views
Status: accepted
Date: 2026-08-01

## Context
Session 1.3's migration drifted from both docs/PRD.md §6 and
docs/tech-design.md §3 in several undocumented ways: views.hypothesis
was added with no PRD lineage; confidence_level and time_horizon lost
their enum-style constraints; tags was dropped entirely; topics.description
was named differently from the PRD's framing_note; view_relationships
columns were renamed without resolving the directionality question the
tech design explicitly deferred; and evidence_items' required/optional
fields were inverted from the PRD's stated intent (link required, note
optional became content required, link optional). None of these were
captured as an ADR at the time, despite CLAUDE.md's convention that
non-obvious decisions get one. Discovered during Session 1.4 while
attempting to seed real test data and finding the empty /views page
couldn't be explained by data alone.

Separately, while reconciling evidence_items, a new real requirement
surfaced: one piece of evidence (e.g., a single article) often covers
multiple Views and/or Topics at once, and the existing schema (a single
view_id FK per evidence item) forces duplicate rows to cover overlapping
theses — a real workflow gap, not a nice-to-have.

## Decision
1. PRD.md is the baseline for all data-model questions going forward,
   not tech-design.md or the deployed schema, when they conflict.
2. All seven field-level mismatches are corrected to match the PRD
   (see migration for full list): hypothesis dropped, framing_note
   renamed, confidence_level and time_horizon get real CHECK
   constraints, tags added, view_relationships columns renamed with
   canonical ordering enforced.
3. evidence_items becomes many-to-many with views via a new join table
   (view_evidence), replacing the single view_id FK. All three
   substantive fields (link, note, stance) become optional, per explicit
   decision — an evidence item may exist with only a stance, or only a
   link, or only a note.
4. No database-level constraint requires an evidence_items row to have
   at least one linked View — enforced at the application layer only,
   consistent with the existing "a View needs ≥1 Topic" rule. This is
   deliberate: it keeps the door open for a deferred, not-yet-built
   feature where evidence attaches directly to a Topic before being
   routed to a specific View, without requiring a future schema rework.
5. evidence_items gains a direct user_id column (owner, matching the
   topics/views pattern), replacing the prior single-sided
   EXISTS-via-view_id RLS approach — necessary because an evidence
   item can now exist with zero linked views, which the old EXISTS
   check could not handle.
6. "Title" remains the schema/column name on views. JT's mental model
   is "thesis title," but this is treated as a UX/labeling decision
   (what the create/edit form and detail page display), not a schema
   rename — revisit at Session 1.5 if needed.

## Alternatives Considered
- Leave evidence_items as a strict one-to-many off views (status quo):
  rejected — directly contradicts a real, stated workflow (one article
  covering multiple theses), and would force duplicate evidence rows
  as a workaround.
- Keep evidence_items' EXISTS-via-view_id RLS pattern rather than
  adding a direct user_id column: rejected — breaks for any evidence
  row created with zero linked views, which the many-to-many decision
  explicitly allows.
- Require at least one View link at the DB level for every evidence
  item: rejected — forecloses the deferred Topic-first-then-route
  workflow without a future migration.

## Consequences
Evidence capture now supports the real workflow (one link, multiple
Views/Topics) without duplication. evidence_items' ownership model
changes from indirect (via its View) to direct (its own user_id),
adding one more RLS policy to maintain but removing a fragile
dependency on always having exactly one view_id at creation time.
Confidence_level and time_horizon now have real DB-level enforcement
instead of open text, closing a gap flagged as a placeholder since
Session 1.3. This ADR does not build any evidence-capture UI — that
remains a future session's work (1.5 or later); today's change is
schema-only, made while the affected tables are still empty in
production, at zero data-migration cost.
