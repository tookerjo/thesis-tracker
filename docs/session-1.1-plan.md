# Session 1.1: Spec & Repo Init (Thesis Tracker, personalized v1)
Date: ___
Time budget: 4-5 hrs (see note below on 8-hr extension)

## 1. Objective
Draft and commit a real PRD, tech design, and ADR-001 for a personalized Thesis
Tracker — using 3 actual Parchmount theses as test data — and initialize the
`thesis-tracker` repo with CLAUDE.md. No auth, no schema, no UI yet.

## 2. Prerequisite check (5 min)
- [ ] Sessions 0.0-0.3 complete (workspace, journey repo, dual-loop practice done)
- [ ] `playground` repo's comments feature and debrief are committed (confirmed:
      `98415cf` on origin/main)
- [ ] Standing process fix is active: state scope before building, check in
      task-by-task
- [ ] GitHub account ready to create a new repo (`thesis-tracker`)

## 3. Concept of the session (15-30 min, Claude.ai)
**Personalization vs. genericization in spec work.** The syllabus gives you a
default field list. A personalized build means adjusting that list against real
usage — but every adjustment is a chance to accidentally build the wrong thing
(too thin, if you just copy the default; too much, if every real want becomes a
v1 feature). Today's discipline: adjust based on actual current behavior (what
you did with the 3 real theses), not aspirational behavior (what you wish you
had). The two deferred-wants you identified are both aspirational — correctly
deferred.

**Test yourself:** can you explain, in 3 sentences, why "auto-route new evidence
to the right thesis" is a Project 3 feature and not a Session 1.1 feature? (If
the answer is "because it needs an LLM to make a judgment call, not just a
database write," you've got it.)

## 4. Pre-work (15-30 min, Claude.ai) — COMPLETE
This was done live in conversation rather than solo beforehand. Outputs:
- 3 real theses recorded (AI Megatrend Diffusion, Western/Chinese Bifurcation,
  Local Economy Revitalization) — see PRD.md Appendix
- Field list confirmed: default 7 fields + Time Horizon + Tags/Theme +
  Related/Parent Thesis = 10 fields total
- Deferred-wants list locked (2 items) — see below for `projects-backlog.md`

### Personalization scope gate (per this session's specific risk)
- [x] Adjusted field list checked against syllabus default — 3 additions, no
      removals, no invented fields beyond what real data required
- [x] Deferred-wants list written down before any code exists (below)
- [x] Checked "must have" fields against syllabus Non-Goals — 2 real requests
      (auto-route/dedup, file upload) were correctly identified as Non-Goals
      already scoped to Project 3, not built today

**Definition of done for pre-work:** PRD content is grounded in your actual
answers, not invented placeholders. Confirmed — see PRD.md.

## 5. Build (2.5-3 hrs, Claude Code)

**Task 1 — Create the repo.**
```
Create a new GitHub repository called "thesis-tracker", public, with a README.
Clone it locally to ~/code/ai-engineering/thesis-tracker.
```
Stop and check: repo exists on GitHub, cloned locally. Nothing else yet.

**Task 2 — Add the docs.**
```
In this thesis-tracker repo, create a docs/ folder. Add PRD.md, tech-design.md,
and docs/adr/ADR-001-uuid-primary-keys.md with the content I'm about to paste.
Do not modify the content — just create the files.
```
Paste the three drafted documents. Stop and check: files exist, content matches
what was drafted, nothing was silently altered.

**Task 3 — Add CLAUDE.md.**
```
Create a CLAUDE.md at the repo root using the syllabus's CLAUDE.md template
(Appendix B of syllabus_v3.md). Fill in Purpose from PRD.md's summary. Set
Current Phase to "Session 1.1 — spec and repo init complete, scaffold not yet
built." Keep the Core Constraints section exactly as the template provides —
do not add project-specific constraints yet; that happens as real decisions
get made in later sessions.
```
Stop and check: CLAUDE.md exists, constraints list matches the template, current
phase is accurate.

**Task 4 — Commit and push.**
```
Stage and commit all files with the message "Session 1.1: PRD, tech design,
ADR-001, and CLAUDE.md for personalized Thesis Tracker". Push to origin/main.
```
Stop and check: commit is visible on GitHub, nothing beyond docs/CLAUDE.md/README
was created (no app scaffolding — that's Session 1.2).

**Hard stopping point for this session:** after Task 4. Do not let Claude Code
scaffold the Next.js app, set up Supabase, or touch auth — even if it offers to
"save you time next session." That is explicitly Session 1.2's work per the
syllabus session table. If you're at Task 4 with hours left, use the extra time
for a more thorough review pass (Section 7 below) or start pre-reading Session
1.2's OAuth concept — not for building ahead.

**Predicted hard moment:** Claude Code may ask whether it should also initialize
a database schema "since you already have the field list." Decline. The tech
design documents the schema; Session 1.3 is where it becomes a real Supabase
migration with RLS. Writing schema now, without RLS, means either redoing it in
1.3 or shipping tenancy-unsafe tables that sit live in a repo. Recovery: if
Claude Code has already generated a migration file before you catch it, delete
it and note in the debrief that this is exactly the "momentum outpaces stated
scope" pattern from Session 0.3 — it's not new, it's a rerun.

**RL-investment flag:** creating files, committing, and pushing to GitHub is a
heavily-RL'd, low-vigilance capability — trust Claude Code here. Deciding what
NOT to build yet (declining the schema/auth offer) is the part that needs your
active judgment; Claude Code has no signal telling it that's out of scope unless
you state it.

## 6. Verification (20-30 min)
- [ ] `thesis-tracker` repo exists on GitHub, public
- [ ] docs/PRD.md, docs/tech-design.md, docs/adr/ADR-001-uuid-primary-keys.md all
      committed and match drafted content
- [ ] CLAUDE.md exists at repo root, uses the syllabus template
- [ ] No app code, no Supabase project, no auth exists yet — confirm nothing was
      built beyond docs and CLAUDE.md
- [ ] The 3 real theses appear in PRD.md's appendix as actual data
- [ ] Deferred-wants list (2 items) is captured somewhere durable — either in this
      PRD's Non-Goals/Out-of-Scope section (already done) or copied into the
      journey repo's `projects-backlog.md` (recommended — do this today, it's a
      2-minute copy-paste)

## 7. Review pass (15-30 min, Claude.ai)
Paste PRD.md and tech-design.md back into a Claude.ai conversation with this
prompt:
```
Review this PRD and tech design as a senior engineer. Focus on: does the data
model actually support the 3 real theses described, including their partial/
missing fields? Is the Non-Goals section specific enough to stop scope creep
in Sessions 1.4-1.5, or vague enough to leak? What's the bypass for the "one
related-thesis link only" constraint — i.e., what real scenario breaks it?
```

## 8. Debrief (10-15 min, your notebook)
- What shipped: PRD, tech design, ADR-001, thesis-tracker repo + CLAUDE.md
- What broke / what was confusing: ___
- What did Claude Code do brilliantly (heavily-RL'd capability): ___
- What did Claude Code do badly (RL gap): ___
- One oversight catch I'm proud of: ___
- One oversight I missed (caught in review): ___
- Next session: ___

**Session-specific reflection prompts:**
- Did writing down the 2 deferred-wants feel like genuine relief (scope
  contained) or genuine loss (things you wanted are now delayed)? That
  feeling is worth naming honestly — it'll recur every session for the next
  10 weeks.
- The AI Megatrend thesis is broad enough to almost be three theses itself
  (diffusion timing, geopolitical response, technology substrate). Did
  today's exercise of splitting Thesis 1/2/3 apart change how you'd naturally
  write a thesis down going forward?

> Scaffold the debrief: "Append a new debrief entry for Session 1.1 to
> docs/debriefs.md using the syllabus §4 template. Fill in date and session
> number; leave my reflection answers blank."

---

**Next session preview:** Session 1.2 — Scaffold + auth. Next.js app with Google
OAuth, deployed to Vercel. New concept: OAuth flow, env vars, deploy pipeline.
