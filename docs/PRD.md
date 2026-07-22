# PRD: Topic/View Tracker (personalized v1, formerly "Thesis Tracker")
Author: Josh Tooker | Date: 2026-07-22 | Status: draft (revised during Session 1.1 review pass)

## 1. Summary
A single-user web app for tracking Parchmount investment thinking at two levels:
**Topics** (broad recurring themes Josh returns to — currently 3-5) and **Views**
(specific, falsifiable bets nested under one or more Topics, each with evidence,
confidence, and a time horizon). Replaces the current scattered mix of Google
Sheets, Apple Notes, Open Brain, Slack uploads, and self-texts with one deliberate
place to record and revisit thinking. Manual entry and manual editing only — no
automated ingestion, routing, or duplicate-detection in this version.

## 2. Goals
- Give Josh a fast "front door" to record a new thought the moment it occurs,
  without needing to fully develop it first
- Separate broad recurring themes (Topics) from specific falsifiable bets (Views),
  since Josh's own thinking naturally operates at both levels
- Let a View belong to more than one Topic, and let Views link to other Views,
  because real ideas overlap and a single-parent model doesn't reflect that
- Support fast, repeated evidence capture — pasting a link as it's found, not
  writing a polished evidence essay in one sitting
- Track real Parchmount thinking as test data, not throwaway/fake data

## 3. Non-Goals (this version)
- Auto-detecting whether a new View duplicates an existing one
- Auto-routing a new link or note to the correct Topic/View without Josh
  selecting it manually
- Any integration with Open Brain, Slack, Google Docs, or phone/text ingestion
- File or document upload attached to a Topic or View (links only, not files)
- Any LLM-assisted structuring of raw/unstructured input (e.g., "take my rambling
  voice note and turn it into a clean View") — this requires an LLM pipeline,
  which doesn't exist until Project 3
- Multi-user support beyond a single owner account (tenancy scaffolding exists at
  the schema level per syllabus discipline, but there is one real user: Josh)

## 4. Users & Use Cases
Single user: Josh, tracking Parchmount investment thinking.

**Use case A — fast capture of a new thought.**
Josh has a thought while doing something else. He opens the tool, picks an
existing Topic (or creates a new one if it's genuinely new), and either creates a
new View under it or adds a link to an existing View's evidence list. This should
take under a minute — it is explicitly not meant to require fully developing the
idea first.

**Use case B — build out a View into something "institutional-grade."**
Example (real data): under the Topic "AI," Josh has a View — "AI economic
diffusion will take longer than expected up front, but ultimately move faster and
further than prior tech waves (compute, internet, mobile) over a 10-50 year
horizon, partly gated by edge computing maturity (2-3 years) reducing power/energy
costs." Confidence: high. Time horizon: unclear — tracked as its own field,
distinct from confidence, because Josh explicitly separates "will it happen" from
"when."

**Use case C — check for overlap before creating something new.**
Josh has a new thought that might already be covered by an existing View. Before
creating a new View, he can see existing Views (ideally across all Topics, not
just the one he's filing into) to check for overlap. If it overlaps, he either
edits the existing View or links the new one to it as related, rather than
creating a near-duplicate.

**Use case D — browse and re-orient.**
Josh wants to see, at a glance, his Topics and the Views nested under each, with
confidence, time horizon, and last-updated — to decide what to revisit.

## 5. User Flows

**Flow A: Create a new Topic**
1. Josh clicks "New Topic"
2. Form: Name, optional rough framing note
3. Saves — Topic created, no evidence/confidence/time-horizon fields (Topics
   don't carry a claim)

**Flow B: Create a new View under one or more Topics**
1. Josh clicks "New View"
2. Selects one or more existing Topics to link it to (multi-select, not a single
   dropdown)
3. Before saving, sees a list of existing Views (across all Topics) to check for
   overlap
4. Fills in Title, Confidence (select), Time Horizon (select) — Evidence is added
   separately (see Flow D), not as part of this form
5. Optionally links this View to one or more existing Views as related
6. Saves — View created, redirected to detail page

**Flow C: Update a View's core fields**
1. Josh opens an existing View
2. Edits Title, Confidence, Time Horizon, or its Topic/View links
3. Saves — Last Updated timestamp changes

**Flow D: Append an evidence item to a View (the fast-capture path)**
1. Josh opens an existing View (or creates a new one via Flow B first)
2. Clicks "Add evidence"
3. Pastes a link, optionally a one-line note, and marks it as supporting or
   undercutting the View
4. Saves — evidence item is added to the View's running list; nothing else about
   the View is touched. This is the single fastest, most-repeated action in the
   tool, per Josh's own description of how he actually thinks.

## 6. Data Model (high-level)
Two entities: **Topic** and **View**. Both belong to one User (Josh).

- A View can link to **one or more** Topics (many-to-many)
- A View can link to **one or more** other Views as "related" (many-to-many,
  self-referencing)
- A View has **many** Evidence Items (one-to-many) — each item is a link, an
  optional note, and a for/against marker, added independently over time

**Topic fields:**
1. Name
2. Framing note (optional, free text)
3. Last Updated

**View fields:**
1. Title
2. Confidence Level (select: low / medium / high)
3. Time Horizon (select: <1yr / 1-3yr / 3-10yr / 10+yr / unclear)
4. Tags (optional free text — kept as-is; see Edge Cases below)
5. Last Updated
(Evidence For/Against and Related Companies/Links are no longer flat text fields
— see Evidence Items and Topic/View relationships above.)

**Evidence Item fields (belongs to one View):**
1. Link (URL)
2. Note (optional, one line)
3. Stance (for / against)
4. Added date

## 7. Edge Cases & Open Questions
- What if a View has no Topic yet? → Not allowed; a View must link to at least
  one Topic (it exists to answer "what is this a bet about"). A Topic, by
  contrast, can exist with zero Views under it (e.g., freshly created).
- What if a View has no related Views? → Fine, optional, most Views will start
  this way.
- What if an Evidence Item has no note? → Allowed — the link alone is often all
  Josh has at capture time, per his own description of how he works.
- Resolved this session: Views and Topics both support many-to-many linking
  (was single-parent-only in the original draft; changed because one-link-per-
  View did not reflect how Josh's real theses actually relate to each other —
  see ADR-002).
- Open question: does Tags need to be a fixed list or free text? Recommend free
  text for v1 still — same reasoning as before, revisit after real Views are
  tagged and patterns emerge.
- Open question: should Topics eventually get their own Confidence/Evidence
  fields if a Topic-level view starts to feel needed? Deferred — not requested,
  don't build speculatively.

## 8. Success Criteria
- [ ] Josh can create a Topic
- [ ] Josh can create a View, link it to one or more Topics, and optionally link
      it to other Views
- [ ] Josh can add an Evidence Item (link + optional note + stance) to a View in
      under a few clicks, independent of editing anything else on that View
- [ ] Josh can see, when creating a new View, existing Views across Topics to
      check for overlap
- [ ] Josh can view a Topic and see all Views linked to it
- [ ] The 3 real Views below are entered as actual data under real Topics, not
      placeholder data
- [ ] App deployed and reachable (Session 1.2 delivers auth + deploy; this
      session delivers the spec that makes 1.2-1.5 buildable)

## 9. Out of Scope (this version)
See Non-Goals above. Restated as the deferred-wants list for `projects-backlog.md`:
1. Auto-detect/auto-route new information to the correct existing Topic or View,
   and detect recurring/duplicate ideas across Open Brain, Notes, Sheets, Slack,
   and texts, with semantic grouping by idea. Requires an LLM pipeline — Project
   3 or Project 5 territory. (This is the same underlying need behind "help me
   structure unstructured thinking so an agent can work against it" — surfaced
   again during this session's review, confirming it's a real, recurring
   priority for Project 3, not solved here.)
2. Upload documents/files attached to a Topic or View, with proper size/type
   validation and sandboxed storage. Project 3's file-upload layer (Session 3.4).

---

## Appendix: Real test data (3 active Views, under Topics)

### Topic: AI Megatrend
Framing note: broad theme covering AI diffusion pace, compute/energy
infrastructure, and downstream effects on U.S. competitiveness and politics.

**View 1 — AI Economic Diffusion Outpaces Prior Tech Waves**
- Confidence: high (that it happens)
- Time horizon: unclear (explicitly distinct from confidence)
- Evidence items:
  - (against) Political/social backlash over AI's role in job loss and
    energy/power consumption is more prominent in the current zeitgeist than it
    was during prior tech waves (compute, internet, mobile), which could slow
    U.S. adoption specifically if government responds to constituent pressure
- Related companies: ~75 fit at a surface level, not individually logged as
  evidence items yet
- Tags: AI, megatrend, compute, energy
- Related Views: linked to View 2 (below) — though flagged during this session's
  review as a looser connection than a strict parent/child relationship, which is
  exactly why many-to-many linking (rather than one-parent-only) was chosen

### Topic: Geopolitics / Bifurcation
Framing note: U.S.-China economic and governance divergence, separate enough
from the AI Megatrend topic to warrant its own Topic rather than living solely
under it.

**View 2 — Western/Chinese Bifurcation**
- Confidence: not yet recorded
- Time horizon: not yet recorded
- Evidence items: none yet recorded
- Tags: geopolitics, currency, China
- Related Views: linked to View 1 (AI Megatrend) — related, not strictly a child

### Topic: Local Economy
Framing note: demographic and generational shifts pushing value back toward
local/physical economies.

**View 3 — Local Economy Revitalization**
- Confidence: not yet recorded
- Time horizon: not yet recorded
- Evidence items: none yet recorded
- Tags: demographics, local economy, wealth transfer
- Related Views: none identified

Note: evidence, confidence, and time horizon are genuinely blank on Views 2 and 3
right now. That's real, not a drafting gap — the form must support partial
records, and creating a View should never require fake completeness.
