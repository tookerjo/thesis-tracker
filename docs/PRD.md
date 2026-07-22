# PRD: Thesis Tracker (Personalized v1)
Author: Josh Tooker | Date: 2026-07-22 | Status: draft

## 1. Summary
A single-user web app for tracking Parchmount investment theses: title, hypothesis,
evidence for/against, related companies, confidence, time horizon, tags, and
relationships between theses. Replaces the current scattered mix of Google Sheets,
Apple Notes, Open Brain, Slack uploads, and self-texts with one deliberate place to
record and revisit theses. Manual entry and manual editing only — no automated
ingestion or cross-source matching in this version.

## 2. Goals
- Record a thesis once, in a structured form, instead of scattered across 4+ tools
- Revisit and update an existing thesis (add evidence, adjust confidence) without
  re-writing it from scratch
- See all active theses in one list, with enough structure (tags, time horizon,
  related-thesis links) to find the right one later
- Track real Parchmount theses as test data, not throwaway/fake data

## 3. Non-Goals (this version)
- Auto-detecting whether a new idea duplicates an existing thesis
- Auto-routing a new link or note to the correct existing thesis without you
  selecting it manually
- Any integration with Open Brain, Slack, Google Docs, or phone/text ingestion
- File or document upload attached to a thesis
- Multi-user support beyond a single owner account (tenancy scaffolding will exist
  at the schema level per syllabus discipline, but there is one real user: Josh)

## 4. Users & Use Cases
Single user: Josh, tracking Parchmount investment theses.

**Use case A — record a new thesis.**
Example (real data): "AI Megatrend Diffusion" — hypothesis that AI economic
diffusion will take longer than expected up front, but ultimately move faster and
further than prior tech waves (compute, internet, mobile) over a 10-50 year horizon,
partly gated by edge computing maturity (2-3 years) reducing power/energy costs.
Confidence: high that it happens. Time horizon: unclear/unresolved — tracked
explicitly as its own field rather than folded into confidence.

**Use case B — update an existing thesis with new evidence.**
Example: new information surfaces relevant to "Western/Chinese Bifurcation."
Josh opens that thesis (selects it from a list, not "New") and adds the new
evidence or link to the Evidence For/Against or Related Companies/Links field. No
automated matching — Josh chooses which thesis it belongs to.

**Use case C — browse and re-orient.**
Josh has 3+ active theses and wants to see them at a glance: title, confidence,
time horizon, tags, last updated — to decide what to update or revisit.

## 5. User Flows

**Flow A: Create a new thesis**
1. Josh clicks "New Thesis"
2. Form appears with all 10 fields (see Data Model)
3. Josh fills in what he has (not all fields required — e.g., evidence against may
   be blank initially, per the real test data below)
4. Josh clicks Save
5. Thesis is created, redirected to detail page

**Flow B: Append evidence to an existing thesis**
1. Josh goes to thesis list
2. Selects an existing thesis (e.g., "Western/Chinese Bifurcation")
3. Clicks Edit
4. Adds a new bullet/line to Evidence For, Evidence Against, or Related
   Companies/Links
5. Saves — existing thesis is updated, Last Updated timestamp changes

**Flow C: Link two related theses**
1. Josh is editing or creating a thesis
2. Selects a Related/Parent Thesis from existing theses (e.g., links a US-China
   divergence sub-point back to the AI Megatrend thesis)
3. Saves — relationship is stored

## 6. Data Model (high-level)
One entity: Thesis. Belongs to one User (Josh). A Thesis may reference another
Thesis via Related/Parent Thesis (self-referencing relationship, optional).

Fields (confirmed v1 list — see tech design for schema-level types):
1. Title
2. Hypothesis
3. Evidence For
4. Evidence Against
5. Related Companies/Links
6. Confidence Level
7. Time Horizon (distinct from confidence — added because Josh explicitly
   distinguishes "confident it happens" from "unclear when")
8. Tags/Theme
9. Related/Parent Thesis (self-referencing, optional)
10. Last Updated

## 7. Edge Cases & Open Questions
- What if a thesis has no related/parent thesis? → Field is optional, null allowed.
- What if Evidence For or Against is empty at creation? → Allowed. Real test data
  (below) has several fields genuinely blank right now; the form must not force
  fake completeness.
- Open question: should Related/Parent Thesis support multiple parents/children,
  or one link only? Recommend one link only for v1 (a "primary relationship"),
  given no session budget for a many-to-many join table here — that complexity is
  more appropriate to Project 2, which introduces junction tables deliberately.
- Open question: does Tags/Theme need to be a fixed list or free text? Recommend
  free text for v1 — a controlled taxonomy is itself a design decision better made
  after you've tagged real theses and see what patterns emerge, not decided upfront.

## 8. Success Criteria
- [ ] Josh can create a thesis with all 10 fields
- [ ] Josh can view a list of all his theses
- [ ] Josh can open a thesis and edit it (add evidence, change confidence, etc.)
- [ ] Josh can link one thesis to another via Related/Parent Thesis
- [ ] The 3 real theses below are entered as actual data, not placeholder data
- [ ] App deployed and reachable (Session 1.2 delivers auth + deploy; this session
      delivers the spec that makes 1.2-1.5 buildable)

## 9. Out of Scope (this version)
See Non-Goals above. Restated as the deferred-wants list for `projects-backlog.md`:
1. Auto-detect/auto-route new information to the correct existing thesis, and
   detect recurring/duplicate ideas across Open Brain, Notes, Sheets, Slack, and
   texts, with semantic grouping by idea. Requires an LLM pipeline — Project 3 or
   Project 5 territory.
2. Upload documents/files attached to a specific thesis, with proper size/type
   validation and sandboxed storage. Project 3's file-upload layer (Session 3.4).

---

## Appendix: Real test data (3 active theses)

### Thesis 1 — AI Megatrend Diffusion
- **Hypothesis:** Economic diffusion of AI will take longer than expected up front,
  but the ultimate pace and scale of benefit will exceed prior tech adoption cycles
  (compute, internet, mobile) over a 10-50 year horizon. Diffusion is partly gated
  by edge computing maturing (2-3 years) to reduce power/energy costs, and by
  quantum computing unlocking new physical/biological understanding.
- **Evidence for:** not yet recorded
- **Evidence against:** political/social backlash over AI's role in job loss and
  energy/power consumption is more prominent in the current zeitgeist than it was
  during prior tech waves (compute, internet, mobile), which could slow U.S.
  adoption specifically if government responds to constituent pressure
- **Related companies/links:** ~75 companies fit at a surface level (not
  individually named yet)
- **Confidence level:** high that it happens
- **Time horizon:** unclear — explicitly called out as distinct from confidence
- **Tags/theme:** AI, megatrend, compute, energy
- **Related/parent thesis:** parent to Thesis 2 (bifurcation sub-thesis depends on
  how this megatrend and the associated political response play out)

### Thesis 2 — Western/Chinese Bifurcation
- **Hypothesis:** The next phase of globalization is a stricter split between
  Western and Chinese economic/governance models, potentially including a dual
  reserve currency system (dollar-based bloc vs. yuan-aligned bloc), which could
  pressure U.S. debt servicing capacity and relative market/purchasing power.
- **Evidence for:** not yet recorded
- **Evidence against:** not yet recorded
- **Related companies/links:** not yet recorded
- **Confidence level:** not yet recorded
- **Time horizon:** not yet recorded
- **Tags/theme:** geopolitics, currency, China
- **Related/parent thesis:** child of Thesis 1

### Thesis 3 — Local Economy Revitalization
- **Hypothesis:** As Boomers and Gen X age out, digitization pushes value back
  toward local/physical economies. Gen Z and Millennials, priced out of
  homeownership, move back to hometowns and rebuild local infrastructure, aided by
  a broader generational wealth transfer (not limited to real estate inheritance).
- **Evidence for:** not yet recorded
- **Evidence against:** not yet recorded
- **Related companies/links:** not yet recorded
- **Confidence level:** not yet recorded
- **Time horizon:** not yet recorded
- **Tags/theme:** demographics, local economy, wealth transfer
- **Related/parent thesis:** none identified

Note: evidence, companies, confidence, and time horizon are genuinely blank on
Theses 2 and 3 right now. That's real, not a drafting gap — the form must support
partial records.
