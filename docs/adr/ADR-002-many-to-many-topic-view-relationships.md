# ADR-002: Two entities (Topic, View) with many-to-many relationships, not one entity with a single parent link
Status: accepted
Date: 2026-07-22

## Context
The original Session 1.1 design used one entity ("Thesis") with a single
optional self-referencing parent link, to keep Project 1 pure CRUD with no
relational complexity — many-to-many relationships were deliberately left for
Project 2 (per syllabus §8). During PRD review, walking through real test data,
Josh identified that his actual thinking operates at two distinct levels (broad
recurring Topics vs. specific falsifiable Views), and that a single-parent
model does not reflect reality: a View like "Western/Chinese Bifurcation" is
related to "AI Megatrend" but is not strictly its child, and could plausibly
relate to more than one Topic or other View at once. Confirmed directly against
the real data captured in Session 1.1 (a single-parent link had to be forced,
and read as inaccurate as soon as it was written down).

## Decision
Split into two entities — Topic (container, no claim) and View (falsifiable
bet, has evidence/confidence/time horizon) — connected by two many-to-many join
tables: View↔Topic and View↔View (self-referencing, for "related" views).

## Alternatives Considered
- Option A: keep one entity, one optional single parent link (the original
  design). Rejected — directly contradicted by real test data; forcing
  "Bifurcation" to have exactly one parent thesis produced an inaccurate
  relationship.
- Option B (considered, not chosen for now): one entity, many-to-many
  self-referencing links, no separate Topic entity. Rejected in favor of the
  two-entity split because Josh's own language distinguished "3-5 broad
  recurring buckets" from "specific bets I develop under them" as genuinely
  different kinds of things, not the same thing at two depths — a Topic has no
  claim and needs no evidence/confidence fields, which a flat single-entity
  model would either force onto Topics unnecessarily or leave inconsistent.

## Consequences
Enables Views to honestly reflect real, overlapping relationships instead of
forcing one artificial parent. Costs real schema complexity for a Project 1
session — two join tables instead of zero, business-rule enforcement ("a View
needs at least one Topic") that can't be handled by schema constraints alone,
and an unresolved directionality question for View↔View rows, to be settled at
Session 1.3's actual migration. This pulls forward a data-modeling pattern the
syllabus otherwise introduces in Project 2 — a deliberate, discussed deviation,
not an accidental scope creep, made explicitly because "one link per thesis is
not helpful" against real data. Estimated added cost: roughly one extra hour
spread across Sessions 1.3-1.5.
