# Debriefs

## Session 1.1
Date: 2026-07-22

- What shipped: PRD, tech design, ADR-001, ADR-002, CLAUDE.md, thesis-tracker
  repo — with a real architecture change mid-session (single-entity/single-parent
  to two-entity Topic/View, many-to-many).
- What broke / what was confusing: File-transfer handoffs between Claude.ai
  (drafting) and the terminal/Claude Code (repo work) took several rounds — zip
  files needing to be found, unzipped, and moved manually each time a doc was
  revised. Also real early confusion about which window a command was meant for
  (terminal vs. Claude Code), and a Cursor permissions error trying to open a
  file saved to Desktop.
- What did Claude Code do brilliantly (heavily-RL'd capability): verbatim
  CLAUDE.md template compliance; checked commit email config unprompted;
  caught the untracked scratch file without being asked.
- What did Claude Code do badly (RL gap): Two real ones. First, Claude.ai:
  when reviewing the PRD/tech-design diff, it initially answered from memory of
  having authored both versions rather than actually reading the diff text
  pasted into the conversation — this was caught and the review was redone
  against the real diff. Second, Claude Code: when asked to quote back the
  CLAUDE.md Core Constraints before finishing the file (to verify no drift), it
  wrote the file first and quoted back after — the verification step ran, but
  out of the requested order.
- One oversight catch I'm proud of: Not accepting the original single-entity,
  single-parent-thesis design once real data showed it didn't hold — pushing on
  it until it became ADR-002's many-to-many model, rather than letting momentum
  carry the original design through.
- One oversight I missed (caught in review): The Success Criteria checklist
  didn't originally test the rule stated in Edge Cases ("a View must link to at
  least one Topic") — the rule existed in prose but had no corresponding
  checkbox. Caught during the Section 7 review pass, not before.
- Next session: 1.2 — Scaffold + auth.

### Reflection

Session-specific reflection 1 — naming search (rationale, perspective,
justification, position, before landing on View): not directly resolved,
worth deciding whether this was real thinking worth the time or friction to
trim next time.

Session-specific reflection 2 — does "clicking around isn't real work" still
hold: "it might not feel like real work to me, but when it drives an
architectural change... that stuff is important to be aware of when you're
communicating with and managing the team of agents." This revises the belief
in real time — the naming decision (Thesis to Topic/View) was the architecture
change, not separate from it.

On manual approval stops: "all of these manual stops, whether they're
approvals or whatnot... it's really annoying... I don't fully understand what
it's saying." Also: "I guess that is the definition of the agent work: you're
able to just distinguish and make it so that the tool makes the judgment of
whether or not something should be approved."

On join tables: "When you want to do this, what that actually means is
joining another table." Correctly connects the day's naming/relationship
decisions to the actual join-table mechanism (view_topics, view_relationships)
introduced in ADR-002.

On version control as safety net: "I have the confidence that, with the
agent, I'm able to go back and edit any file." This confidence is earned, not
assumed — the commit history (e0f7b18, 24f8ea3, 9249795, bb48c45) is the
actual proof edits are safe and traceable.

## Session 1.2
Date: 2026-07-27

- What shipped: Next.js scaffold, live Supabase project, Google OAuth
  wired end-to-end (client, server, middleware, login page, callback
  route), deployed to Vercel, middleware fixed to default-deny per
  CLAUDE.md rule 8.
- What broke / what was confusing: The first real test of the deployed
  Vercel app failed — Supabase's Site URL configuration still pointed at
  localhost, never updated for production, so the OAuth flow silently
  errored out instead of landing on /dashboard. Diagnosed and fixed same
  session. Also lost some time to two stray dev server processes running
  on different ports simultaneously, left over from earlier in the day,
  which caused a confusing intermediate error before the real bug was
  found.
- What Claude Code did brilliantly: Kept the session on track and scope
  narrow, with a couple of divergences along the way that got flagged
  rather than silently absorbed. Strong, fast diagnostic work on the
  production OAuth bug — went straight to the actual error rather than
  guessing, quick fix once identified.
- What Claude Code did badly: Still struggling to explain code in
  plain-language terms at certain points — not fully translating what a
  given piece of code does or why, which leaves me looking for the right
  triggers to know what I'm actually approving. I can't yet fully read
  every line myself, but staying alert to that gap is what's keeping me
  anchored to fundamentals rather than rubber-stamping.
- One oversight catch I'm proud of: Consistently monitoring to make sure
  the agent wasn't getting ahead of scope — staying disciplined about
  what's actually in today's stated boundaries versus what "flows
  naturally" from it.
- One oversight I missed: Not really a miss so much as an efficiency
  question — noticing that some approvals could probably be automated or
  batched rather than reviewed one at a time, without losing the
  oversight that actually matters.
- Did the OAuth flow concept click, or is it still hand-wavy: Real
  progress. Having done Google OAuth twice now (comments feature, then
  this), it's starting to feel concrete rather than abstract. Curiosity
  is turning toward what else, and where else, this pattern extends to.
- ADR-002 heading into 1.3: No new signal from today — auth work didn't
  touch the Topic/View schema at all. Will form a real view once 1.3's
  RLS work is actually underway.
- Next session: Session 1.3 — Data model + tenancy, per the syllabus.
- Terminal/tool-basics note: Ctrl+C is a held key combination, not
  literal characters to type — typing the letters sends them as input to
  whatever's running instead of stopping it.

## Session 1.3
Date: 2026-07-28 – 2026-07-29

- What shipped: I shipped five tables (topics, views, view_topics,
  view_relationships, evidence_items) with RLS enforcing tenancy — direct
  ownership on two tables, two-sided EXISTS on the join tables, single-sided
  on evidence_items. I also fixed a GRANT/REVOKE gap (missing base CRUD
  grants, stray TRUNCATE) and built a vitest suite proving cross-tenant
  isolation with real auth users against a local Docker instance, including
  a positive control and an explicit test blocking cross-user
  relationship-linking. I updated CLAUDE.md and debriefs.md to reflect the
  actual current state.
- What broke / what was confusing: The GRANTs bug (Task 4) — my RLS policies
  were correct but unreachable because the postgres role's default
  privileges never included SELECT/INSERT/UPDATE/DELETE. I also lost real
  time to a red herring: I conflated a CLI login/token error with the
  database password, and ended up resetting the password unnecessarily
  before finding the actual fix (supabase login).
- What did Claude Code do brilliantly (heavily-RL'd capability): It
  proactively caught things beyond what I asked — flagging the TRUNCATE
  grant unprompted during Task 4 verification, adding a hard runtime guard
  in the test file refusing to run against a non-local URL, and adding the
  positive-control test without being told to.
- What did Claude Code do badly (RL gap): Nothing outright wrong today — the
  one near-miss was defaulting to FOR ALL without TO authenticated explicit
  role-scoping on RLS policies (flagged in my review pass as
  defense-in-depth, not currently exploitable).
- One oversight catch I'm proud of: I decided to build the two-sided EXISTS
  check for topics even though I'm currently the only user — recognizing
  that retrofitting RLS after real data exists is much more expensive than
  building it correctly now.
- One oversight I missed (caught in review): The GRANTs gap itself — I
  approved the RLS-only migrations in Tasks 1-3 without independently
  suspecting the base ACL layer might be missing; Task 4 (already planned
  into the session) is what caught it, not something I flagged unprompted.
- Next session: Session 1.4 — CRUD UI (list + detail). I need to carry
  forward: verify user_id is server-derived, never client-supplied, in the
  first insert/update routes (flagged in CLAUDE.md and debriefs.md).

### Reflection

Did "ownership via EXISTS join" actually click, or does it still feel like
syntax I copied? It makes conceptual sense — since there's no user_id column
on these tables, the two-sided EXISTS creates a backstop confirming both
linked rows map back to the same logged-in user. I don't fully own the
syntax yet, and I'm okay with that — I like that Claude Code surfaces the
reasoning even when I don't fully internalize it in the moment, because I
can map it back once the concept clicks. I expect this to keep building as I
hit it again on future tables.

Did building view_relationships change how I think about tenancy beyond
"user_id column present or not"? Yes, more broadly than the technical
mechanism. Today was a real shift from copy-and-paste-approving everything
in Claude Code toward actually reading each request and discerning read vs.
write, so I can batch low-stakes approvals and check in more deliberately
with Claude.ai on the ones that matter. That shift matters more than
mastering SQL syntax right now — I'm not trying to relearn every layer of
SQL or Python; today proved I don't need to in order to build real
judgment. What I'm actually building is an understanding of how the Claude
Code system works and what's happening at each step — because that's what
tells me how much autonomy I'd be comfortable granting an agent for
multi-step, less-supervised work later. That's the real judgment people
talk about: you don't have to write the code yourself, but you need to
understand what you're authorizing an agent to do. Trusting that most
actions are undoable (migrations can be reverted, grants can be revoked) is
what's giving me the confidence to keep expanding scope. The
approval-heavy, read-every-diff mode I'm in now isn't the end state — it's
what has to come first. The actual goal is writing PRDs and specs sharp
enough that Claude Code can build large batches of work with less real-time
oversight, so I can spend my own attention on strategy instead of
line-by-line review. I'm starting to enjoy this part of the process, and I
expect it to keep compounding session over session.

## Carried forward from Session 1.3
- Verify user_id is server-derived (never client-supplied) in the first CRUD
  insert/update routes. RLS's WITH CHECK blocks a forged value at the DB layer,
  but app-layer enforcement (CLAUDE.md #2) can't be verified until routes exist.

## Session 1.4 (partial — Task 0 only)
Date: 2026-07-31

- What shipped: Task 0 only — I closed the four RLS gaps carried
  forward from Session 1.3. 15/15 tests passing (7 original + 8 new
  sub-tests). No CRUD UI work started yet.
- What broke / what was confusing: dotenv silently printed
  unsolicited output with a URL during test setup — I fixed it with
  quiet: true. OAuth redirected to production instead of localhost —
  I re-added localhost to Supabase's redirect allow-list and fixed
  it. My new RLS tests initially failed for a reason unrelated to
  RLS: a missing service_role table grant. I fixed it by verifying
  via the owning user's own client instead.
- What did Claude Code do brilliantly: it caught the GRANT-vs-RLS
  distinction unprompted, refused to touch the grants migration as
  out of scope, and explained the fix clearly.
- What did Claude Code do badly: it applied an edit to
  projects-backlog-private.md before showing me the diff, even
  though I asked to see it first.
- One oversight catch I'm proud of: I insisted on seeing the exact
  line where the service-role key was declared instead of taking
  Claude Code's word for it.
- One oversight I missed: I leaned on Claude.ai's review of the new
  tests more than reading the diff myself, especially by the end of
  the night. I was juggling a lot of unrelated fires (Docker, dotenv,
  OAuth, GRANTs) and I want to watch that this doesn't become my
  default.
- Next session: finish the server/client components explain-it-back
  test, then Section 4 pre-work, then Task 1 (Views list page). I
  also need to clean up the stale Supabase cloud project before 1.5.

### Terminal/tool basics
- Docker Desktop has to be running for local Supabase / RLS tests.
- I'm using a two-terminal workflow now: one for the dev server, one
  for everything else.
- Gitignored files have no git diff / git checkout safety net — I
  learned this the hard way with projects-backlog-private.md.

### Reflection
Today was a debugging gauntlet more than a build session. I caught
some real things myself — the dotenv anomaly, the OAuth redirect
gap, insisting on verifying the service-role key line — but I also
need to start digging into the code as applicable. Especially the diffs. I think this is a really interesting part about the judgment process and the transition to coding with AI. I don't need to know the errors necessarily, but i need to understand the way to ask questions that will uncover if there is an issue with the build and then almost be maniacal in validation. Just another observation, i don't think claude is good at logistical planning.Where my strengths are coming through are in 'common sense' and logistical organization of sessions and product build, as well as sercurity validation. While i don't know what each action expressed in code translates to, I know enough to realize what doesn't make sense. When we are consistently re-planning, the human flexibility to hold multiple things at once is proving to be helpful.

## Session 1.4
Date: 2026-08-01 (continued from partial Session 1.4 on 2026-07-31)

- What shipped: The Views list page (/views) and View detail page
  (/views/[id]), both server components relying entirely on RLS for
  tenancy — no app-level user_id filtering anywhere. Also shipped an
  unplanned but necessary schema reconciliation: discovered Session
  1.3's migration had drifted from both the PRD and tech-design.md in
  seven undocumented ways (hypothesis added with no PRD lineage,
  confidence/time_horizon lost their enum constraints, tags was
  missing, evidence_items had inverted required/optional fields,
  view_relationships columns were renamed without resolving
  directionality). Fixed all seven, and made evidence_items many-to-
  many with views via a new view_evidence join table, since one piece
  of evidence often covers multiple theses in my actual workflow.
  Logged as ADR-003. Seeded the three real Parchmount Views from the
  PRD appendix as actual data for the first time.
- What broke / what was confusing: The empty /views page this morning
  led me to discover the schema had silently drifted from the PRD
  since Session 1.3 — seven real mismatches, none logged as an ADR
  despite my own CLAUDE.md convention requiring one for non-obvious
  decisions. This turned a planned ~1 hour of build work into a multi-
  hour detour. I also hit real friction with terminal/Claude Code
  basics today — confusing Claude Code's chat window with a plain
  terminal when trying to cat a file, and losing track of which
  terminal had the dev server running.
- What did Claude Code do brilliantly: Caught its own blast radius
  before I asked — flagged that app/views/page.tsx and the RLS test
  suite would both break from the reconciliation migration, and
  refused to touch either without asking first. On the detail page,
  it closed a real security side-channel I hadn't thought to ask
  for: folding malformed-UUID errors into the same not-found response
  as "doesn't exist" and "not yours," so a bad guess can't be
  distinguished from a well-formed guess. Also correctly refused to
  guess at auto-generated Postgres constraint names it wasn't certain
  of, rather than risk a failed migration.
- What did Claude Code do badly: Under auto mode, it ran
  `supabase db push` against my live remote database — an irreversible
  schema change — without a discrete stop for my individual
  confirmation, even though it narrated what it was about to do first.
  Separately, last night it applied an edit to a gitignored file
  before showing me the diff, despite being asked to see it first.
  Auto mode doesn't have any built-in boundary around git or
  irreversible operations — that boundary only exists when I state it
  explicitly, every time.
- One oversight catch I'm proud of: Reading the actual PRD, tech-
  design.md, and both existing ADRs side-by-side against the real
  migration files, instead of accepting my own memory summary of what
  the three real Views were supposed to contain. That's what surfaced
  the full seven-item mismatch list instead of just patching the one
  symptom (empty confidence/time_horizon) I noticed first. I also
  continue to hold the agent to process even when it skips a step —
  like catching that Step 6 (the RLS test re-run) got jumped past
  today. I also caught Claude (the assistant, not Claude Code) trying
  to skip the formal review pass on Task 2's diff and go straight to
  debrief — the same kind of momentum-over-process slip this whole
  session is designed to teach me to catch, coming from the tool
  that's supposed to be enforcing it.
- One oversight I missed: I asked Claude Code to run the reconciliation
  migration under auto mode without registering that "apply this to
  the live remote database" deserved a harder stop than the mechanical
  checks (lint, type-check) auto mode had been fine for all day.
- Next session: Session 1.5 — create/edit forms for Views, plus
  Topics list page as the opening task (rolled forward from today's
  Task 3 stretch goal, which didn't get reached). Also need to check
  for and clean up a stale, unused Supabase cloud project before
  starting.

### Terminal/tool basics
- Claude Code's own window intercepts commands like `cat` differently
  from a real terminal — it reads the file into its own context but
  won't print raw text to the screen unless asked to.
- Auto mode will run irreversible commands (including against a live
  remote database) without an individual stop, unless told explicitly
  not to — this isn't automatic, it has to be stated every time.
- `supabase db reset` rebuilds the local database from scratch by
  replaying every migration file — the right way to confirm a new
  migration is actually reflected locally, since `supabase start`
  alone can restore a stale cached snapshot instead.

### Reflection
The risk with everything I'm doing is that I don't know what I don't
know. Claude is helpful with surfacing things and laying out the
traditional structure, but it still doesn't understand and apply
context, and it doesn't fill in the gaps for things I don't know.
Today I started using ChatGPT to cross-check some of the UI documents
and PRD updates — a counter-assessment to what Claude alone was
saying. I don't think that's a bad thing. I wouldn't be able to do any
of this as efficiently without these tools, and using a second one to
check the first just reinforces where the human brain's judgment
actually creates value. The reps and going through the motions matter
in this first project — that's part of why the syllabus has three
projects, so this keeps compounding.

From a workflow standpoint, almost every session there's something to
expand or correct, and today was no different. A lot of that is
because I don't yet communicate deliberately enough up front —
something gets lost in translation as we build in real time, and I
have to go back and fix it. The good part is the tool makes that
almost lossless — it takes a few minutes to correct, not a rebuild.
My instinct is to fix it in the moment rather than pushing it down the
road, since I don't want a growing backlog of half-right decisions.
That's a good check on the process, even when it slows a session down.

Something I did really well today: reinforcing process on top of the
build. I found real discrepancies across the PRD, tech design, and
actual schema, and put together a plan to fix them — even when my own
sense of the fix was still abstract, Claude was able to turn that into
actual, detailed steps. What I'm still working on is identifying and
flagging these differences more in real time, rather than discovering
them mid-build. That'll come with pattern recognition as I do more of
this. The other lever I have is continuing to build my own knowledge
of architecture best practices directly, so I recognize drift sooner
myself instead of relying on stumbling into it.

## Debrief — Session 1.5: CRUD UI (create + edit)
Date: 2026-08-03

- What shipped: Live edit and create for the views table. RLS hardened
  across all six tables, not just views/topics. Topics list page built
  and verified. Dev-login test infrastructure built as an unplanned but
  necessary addition.
- What broke / what was confusing: The specific differences between RLS
  policy shapes were confusing at first. WITH CHECK versus USING made
  sense once I saw it protects against direct API access, not just the
  form — but I don't fully track the weight and context of that
  distinction more broadly yet. The manual, step-by-step approval
  process also worked against the flow. Given how fast Claude Code can
  actually fix things once flagged, all the individual approvals slowed
  the session down more than they protected it.
- What did Claude Code do brilliantly: Verified things directly instead
  of asserting them. Checked pg_policies against the live database when
  pushed back, ran real INSERT/UPDATE forgery attempts instead of
  trusting the test suite alone.
- What did Claude Code do badly (RL gap): Offers its best suggestion
  without justifying why up front. Misjudges time and scope in both
  directions — Task 1 and Task 2 both expanded because Claude Code
  didn't fully know what the objective required when it wrote its own
  first-draft prompts. Overestimated how much effort small fixes (font
  contrast) would take. Stated something factually wrong about RLS
  policy state (claimed views_owner_all was still backstopping the edit
  action when that policy no longer existed) without checking first.
- One oversight catch I'm proud of: Catching that the migration only
  covered views/topics when ADR-005 said "and their join tables" —
  forced a live query instead of trusting the summary. Same pattern
  caught it again later when it cited a policy that no longer existed.
- One oversight I missed: Not one specific miss today, but a standing
  discipline to keep enforcing — not letting Claude Code punt on
  things that are actually five-minute fixes.
- Next session: 1.6 — Polish + tests.

### Terminal/tool basics
- The real shift today wasn't learning SQL or RLS syntax line by line.
  It was realizing my actual job is closer to managing an engineer than
  being one — making sure the agent produces something secure and
  correct, not making sure I personally understand every line of code.

### Reflection
Session-specific:
- Did WITH CHECK vs USING actually click, or does it still feel
  hand-wavy? It clicked at the mechanism level. Still calibrating the
  broader weight of it.
- Seven threads in one session — real progress or scope creep in a new
  place? Didn't feel like scope creep. Task 0 cleanup, the ADRs,
  dev-login, and the two CRUD surfaces all directly served getting
  today's objective done and verified.
- Claude Code made two factual claims about RLS state that turned out
  wrong — what does that tell me about trusting agent self-reports?
  Don't trust the summary. Verify against the live system directly,
  every time it matters.

Additional reflection: What we built today is basic — a developer who
already knows the stack could ship this faster using libraries I don't
know yet. That's fine. The value is the judgment layer I'm building on
top of directing an agent to produce secure output. Going forward, my
real lever is prompting better up front so fewer manual approvals are
needed at all.

## Session 1.6: Polish + Tests
Date: 2026-08-05

## What shipped
Shared UI primitives (Skeleton, TableSkeleton, DetailSkeleton, FormSkeleton, EmptyState, ErrorState, NotFoundState). Loading/error/empty states wired into Views (list/detail/create/edit) and Topics list. Custom 404 page. Playwright added as a real devDependency, used to visually verify pages. New middleware-auth.test.ts, 2 tests. Test suite: 34/34 passing. Found and fixed two real bugs during review: Skeleton's hardcoded light-mode color, and a stale "Create Next App" page title that had never been changed. Closed out three stale/missing docs: annotated the old schema doc as superseded, wrote the Session 1.4 doc that never got saved anywhere, and created CURRENT-STATE.md as a single place to check what's actually built before scoping anything new — with a rule in CLAUDE.md requiring it gets updated at the end of every session so it doesn't go stale the way the old schema doc did.

## What broke / what was confusing
This session was supposed to take one, maybe two sessions. It's now four. Views and Topics were supposed to both have full CRUD going into today — Topics only had a list page. Delete didn't exist anywhere. Evidence CRUD, the actual point of this product, was never built at all. All three were marked done in prior planning without anyone actually checking the app against the claim.

The part that's most frustrating: I agreed to insert the evidence CRUD session based on Claude telling me it was a few extra hours of work. That estimate was wrong, and it was wrong because Claude never verified whether Topics CRUD existed before giving it to me. I made a real decision — accepting the resequencing — based on a number that hadn't been checked. Finding that out mid-build, not before I agreed to anything, is exactly the kind of thing this syllabus is supposed to teach me to catch, and today I only caught it by accident, not by process.

## What I'm taking from this
I think the real lesson here is about front-loading design clarity before letting an agent build. The times today that caused the most damage were the times a plan got treated as complete without anyone checking it against reality. I don't think that's fixable by just trying harder to double check things after the fact — I think it has to be built into how a session starts, not how it ends. Knowing precisely what I want, what I explicitly don't want, and what "done" verifiably looks like, before build starts, has to be the actual discipline. Not more reviewing after the fact.

The other hard part: I can't see whether something's actually complete until I test it myself. Looking at a diff of code I didn't write doesn't tell me it's real. Clicking through the app does. That's slow, and it's also probably the only thing that actually protects me.

I think the other thing that I'm learning is that I need to really take the time to understand some of the suggestions. I did not like the Skeleton. I think it's weird. I don't know where or how it's used in other places, or maybe we didn't build it properly, but it doesn't seem like it actually creates a more minimalist and seamless approach. I'm not sure what the point is.

It's just a reminder as I learn: Claude is not the arbiter of truth. It's an aggregation of certain information, certain processes, and certain styles, and I should not always have to just accept it.

## Agent-good (heavily-RL'd, trust this)
Checked the existing test suite before writing new tests, found 5 of 6 already existed, didn't pad the suite with duplicates. Correctly reasoned that RLS policies are symmetric rather than assuming more test count means more safety. Read actual page code before proposing a plan. Was explicit about what was mocked versus real in test design.

## Agent-bad (RL gap)
When a tool was missing or a dependency wasn't installed correctly, the instinct was to add another layer of workaround rather than stop and verify the simple thing, or just tell me directly. Strong at checking a specific file or command right before acting. Weak at questioning something inherited from a prior session or a prior conversation — that's exactly what let "Topics has full CRUD" go unchecked into today's plan.

## Next session
Session 1.6a — Topics CRUD (detail/create/edit), reusing today's shared primitives. This pushes the syllabus timeline into September. Given I'm balancing this against actual vacation time and wanting to read, I need to figure out real pacing rather than assuming the original calendar still holds.

## Session 1.6a: Topics CRUD (detail/create/edit)
Date: 2026-08-05

## What shipped
Topics has full CRUD now. Detail page, create page, edit page, list page links. Three commits landed: 8d46053, e855eb8, 63519fa. All pushed to origin/main.

## What broke / what was confusing
Two infrastructure failures ate real time today, neither related to code I wrote. The dev server died from Turbopack cache corruption after a long session. Local Supabase's Docker container exited silently partway through and gave contradictory status messages before I force-restarted it.

I also lost track of session state twice. I asked Claude.ai to check things it can't check (it doesn't have filesystem access, only Claude Code does). I pasted a stale test-output.txt file back into chat multiple times thinking it was a live result, when it was actually a leftover log from an earlier failed run.

## What Claude Code did brilliantly
Every task mirrored the Views pattern correctly on the first pass. Auth checks, RLS-reliance on reads, explicit user_id filtering on writes, collapsed not-found/not-owned error handling. It caught its own inconsistency when my build prompt assumed a revalidatePath pattern that doesn't actually exist in the codebase, and it didn't invent one just to satisfy the prompt. It also proactively flagged two real gaps I hadn't asked about: the missing Edit link (route unreachable from the UI) and the missing empty-state CTA on the Topics list.

## What Claude Code did badly
Nothing structurally wrong in the code itself. The self-reported "clean build" summaries were technically accurate but I had to push past them each time to see the real diff before approving — the habit of trusting the summary is still a live risk for me, not a Claude Code failure.

## One oversight catch I'm proud of
Catching the framingNote type mismatch before commit. The pasted code didn't show framingNote on UpdateTopicInput even though the function body used it. Turned out to be a paste artifact, not a real bug, but stopping and demanding live tsc output instead of approving on a hunch was the right call regardless of the outcome.

## One oversight I missed
I let today's session run without any new tests for the Topics action layer. My own CLAUDE.md constraint #5 requires auth-path and cross-tenant tests, and I only caught this in the Section 7 review pass, after three commits were already pushed. I verified manually (auth redirect, cross-tenant blocking) but nothing automated locks that in.

## Session-specific: did copying Views' pattern feel right, or did I want to abstract?
Copying felt correct. Nothing about building Topics made me want a shared abstraction. The concept (wait for a third instance) held up in practice, not just in theory.

## Infrastructure note
Docker/Supabase and the dev server both destabilized after several hours of continuous use. Next long session, I should expect this and check `supabase status` proactively if anything gets weird, rather than assuming it's a code problem first.

## Next session
Session 1.6b: Evidence CRUD UI. Opens with the stance placement decision (per-item vs per-link). Carries forward mandatory tasks: tests for Topics action layer (createTopic, updateTopic), and the framing_note display decision.

## Session 1.6b: Evidence CRUD + Stance Architecture
Date: 2026-08-11

## What shipped
Evidence CRUD (create/attach with per-link stance via atomic RPC, grouped display on View detail page), ADR-006 resolving the stance architecture decision, 8 commits total.

## What broke
Production briefly broke — every View detail page returned 404 for its own owner, because tonight's database migrations were built, tested, and verified entirely against local Supabase but never pushed to the production project before the matching app code auto-deployed via Vercel. Root cause found and fixed within the session; no data was lost (verified empty tables before applying the fix); cross-tenant protection re-verified on production after the fix via two real Google accounts.

## Agent good
Caught and fixed its own cleanup bug mid-execution (orphaned test rows) before reporting done rather than after; correctly declined to guess at production data risk and asked for a real read before proceeding; the end-of-session scoped review pass surfaced three specific, non-obvious gaps (RPC has no defense-in-depth ownership check, DROP COLUMN safety was untested-until-verified rather than guaranteed, page.tsx collapses real errors into a misleading 404) rather than offering reassurance.

## Agent bad
Claude.ai (not Claude Code) twice asserted or implied a state without verifying it first — once claiming evidence-display code was already committed when it wasn't, once skipping the "show me the diff before committing" instruction. Both caught by the user via direct git verification, not by the agent's own self-check.

## Oversight catches I'm proud of
1. Caught Claude.ai's own errors, not just Claude Code's — twice challenged Claude.ai directly (questioning whether the display code was really committed, and separately whether the "show diff before committing" instruction was actually followed) and was right both times on verification. Held the coordinating agent to the same standard as the executing one.
2. Refused a hand-wavy explanation for a real gap — when the "New View" button turned out to be missing, didn't accept "log it, same as Topics" and instead named the pattern explicitly ("there are so many UI gaps"), which was the correct read: three real navigation gaps in one session, not noise.
3. Held a scope line under pressure — explicitly said "I do not want to keep adding backlog" at the moment Claude.ai was about to add another open-ended item, correctly self-catching the exact failure mode (scope creep) already flagged as a known risk before this syllabus started.
4. Returned to the session plan after a real derailment — after a two-hour production-incident detour, explicitly restated and executed the remaining plan ("finish #6, then #7, then #8, then close") rather than letting the session dissolve into reactive next-steps.

## Oversight I missed
_(left blank — to be filled in by the user)_

## Reflection
User's own words, verbatim:

"I think one of my biggest takeaways is understanding UI and architecture security and testing. That's the job of the future, and it's about making sure you continue to refine and understand how to scope the outcome that you want. I think what I'm trying to figure out is knowing what I want to build up front, and that this coordination needs to be mitigated. I think that is really important. I need to figure out what is supposed to be manual and slow and what I should be automating. I think, especially in Project 2, we'll plan on using Plan Mode to streamline and draw some efficiencies, but there are some simple ways that I really could have caught and stopped some of this back and forth with the gaps. It's really in a clear, clean-up-and-build testing process when we push to production. Building a lot locally and then not seeing it in production might have hidden some of the security issues, but it might not, based on the fact that, seemingly, when Claude makes these assumptions with partial context, the dangerous part is when I don't know how and what to fill in with that context. That just might be a lesson from here on out. For user interface, I think I'm going to continue to focus on what that looks like and how to build tools for that, and then to use headless as well."

Note: tonight surfaced that the coordinating role (deciding what's actually risky, refusing weak explanations, holding scope, catching overstated claims from either agent) is the actual skill under test — separate from and higher-leverage than the execution work being delegated. This session was a harder-than-usual test of that because it happened under live pressure (real production incident, over time budget) rather than in a clean walkthrough.

## Next session
1.6c — View-Topic linking UI. Opens with pre-work: navigation audit, Topics action-layer tests, framing_note display decision, production-sync process step, security/data-safety fixes from this session's review pass. (Manual cross-tenant check is now complete — remove from the pending list.)

## Session 1.6c: Pre-work — security/data-safety fixes
Date: 2026-08-13

Scope note: this entry covers only the security/data-safety pre-work (item 5 of the 1.6c pre-work list) done ahead of the View-Topic linking UI. The linking UI itself and the other pre-work items (navigation audit, Topics action-layer tests, framing_note display decision, production-sync process step) are not part of this entry.

## What shipped
The three fixes from Session 1.6b's scoped review pass, all completed and verified:

1. **RPC ownership check (defense-in-depth).** New migration `20260813103035_harden_create_view_evidence.sql` — `create or replace` on `create_view_evidence` adding an explicit ownership guard *before either insert*: `if not exists (select 1 from public.views where id = p_view_id and user_id = auth.uid()) then raise exception ... using errcode = 'insufficient_privilege'`. The guard checks `user_id = auth.uid()` directly rather than a bare `where id = p_view_id`, so it's an *independent* layer — under SECURITY INVOKER a bare check just re-runs RLS's own SELECT filter and would fail alongside it if the views policy were ever misconfigured. Same migration does `revoke execute … from public` (Postgres grants EXECUTE to PUBLIC by default; the original RPC migration only added a grant to `authenticated` and never revoked the implicit PUBLIC grant), keeping `authenticated` only.

2. **DROP COLUMN guard pattern (reference doc).** `docs/design/drop-column-pattern.md` — a reusable `do $$ … raise exception … $$` guard-clause template that aborts a migration if the target column still holds non-null data, plus guidance on when to backfill-then-drop instead of block. Reference pattern only; **not applied to any existing column**. Establishes the pattern before it's next needed (the one shipped DROP COLUMN, `20260811151408`, was safe only because both tables were empty in production — a precondition that was verified, not guaranteed).

3. **page.tsx error/not-found split.** `app/views/[id]/page.tsx` — a genuine query failure now renders `ErrorState`; only a real zero-row result calls `notFound()`. Previously both collapsed into `notFound()`, which is exactly how the 1.6b schema-drift bug disguised itself as a 404. Mirrors the pattern already used on the Views list page (`app/views/page.tsx`).

## Verification
- Migration applied cleanly to local Supabase, then pushed to the remote: `supabase db push` applied exactly `20260813103035`, and `supabase migration list` confirms it recorded on the remote (all ten migrations show local == remote — no drift). One non-blocking warning during push (`failed to cache migrations catalog`, an SSL-cert ENOENT inside the pgdelta edge-runtime); the apply succeeded regardless, confirmed by the migration list. CLI is a few versions behind (v2.109.1 vs v2.114.0), which may explain the warning.
- Function ACL confirmed: `proacl = {postgres=X/postgres, authenticated=X/postgres}` — no PUBLIC EXECUTE.
- Ownership guard exercised by the existing cross-tenant RPC test in `tests/rls-tenancy.test.ts` (user A calling with user B's view_id raises + leaves no orphan row); its explanatory comment was updated to describe the guard-first mechanism. Happy-path RPC test still green. Full suite: 37/37 passing.
- Two pre-existing `tsc --noEmit` errors in `tests/rls-tenancy.test.ts` (lines 42/49, `SUPABASE_URL` typed `string | undefined` because TS doesn't narrow across the import-time throw guard) confirmed to predate this session; `app/views/[id]/page.tsx` compiles clean.

## Agent good
Caught a genuine independence gap in its own plan when challenged — the first draft guarded with a bare `where id = p_view_id`, which under SECURITY INVOKER just re-runs RLS and fails alongside it; corrected to `user_id = auth.uid()` so the guard is a real second layer. Also flagged, without being asked, that the Topics detail page has the identical error-collapsing bug as item 3 (scoped it out rather than silently expanding), and declined to recommend a broad `docker exec … psql` auto-approve rule on the grounds that prefix matching can't distinguish a read-only SELECT from a destructive statement.

## Next session
1.6c proper — View-Topic linking UI, plus the remaining pre-work items (navigation audit, Topics action-layer tests, framing_note display decision, production-sync process step).

## Session 1.6c (cont'd): Nav shell, framing_note, View-Topic linking

Date: 2026-08-13

This covers Tasks 3 through 6 of today's session. Task 1 (security fixes) has its own entry above.

**What shipped:**

Task 3 — DROP COLUMN guard pattern doc. Reference-only, not applied to any column yet. docs/design/drop-column-pattern.md.

Task 4 — Topics action-layer tests. createTopic and updateTopic had zero coverage before this. Added the vitest @/ alias as a prerequisite so the mock could target the right import path. 44/44 passing.

Task 5 — Navigation audit turned into the biggest finding of the session. The app had no home page, no persistent nav, and no way to move between Topics and Views except typing URLs. Bigger than I expected going in. Also decided the framing_note question: display it read-only on Topic detail.

Task 6 — Built the nav shell and the View-Topic linking UI in one pass. Expanded scope mid-task to add "New Topic" and "New View" links on the list pages, since the nav audit surfaced that gap and I didn't want to carry it into a fourth session. View detail owns linking; Topic detail stays read-only. Justified by domain fit — a View is the specific bet, a Topic is the bucket you file it under — and it matches how evidence-linking already works. 49/49 tests passing, production build clean. I did the full manual click-through myself, including add, remove, and re-add. Declined the Claude-in-Chrome extension for automated verification.

**Agent good:** Plan Mode was the right call today. Getting the full plan up front and then letting Claude Code execute without stopping me at every file was a real speed-up over the manual per-step approval I was doing earlier in this project. The plan itself caught a real problem before any code existed — the ownership check in the RPC was quietly re-running RLS instead of being an independent layer, and that got fixed in the plan, not after the fact. Claude Code also told me straight when it did something outside its lane, killing that process on port 3000, instead of staying quiet about it.

**Agent bad:** Claude Code killed a process on port 3000 while cleaning up its dev server, without checking what it was first. It wasn't something Claude Code started. It told me afterward instead of asking beforehand. Nothing was lost this time, but that's the kind of unrequested action I want flagged before it happens, not after.

**Oversight I missed:** Nothing sticks out this session. I caught the redundant review-order issue myself, in real time, and the ownership-guard gap in the RPC plan was caught before any code got written. Nothing slipped past me that I noticed later.

**Process reflection:** Manual click-through and line-by-line diff review started to feel redundant in that order, on lower-stakes work. If I click through and it works, then reread every line and find nothing new, I've done the same check twice. Going forward: click-through first for UI work, full line-by-line before approval reserved for anything touching auth, security, or data I can't get back. That's the actual split that happened today between Task 1 and Task 6, and it held up.

**Next session:** 1.7 — sign-out button, per syllabus_v3.md. Back on the original session sequence after this session absorbed the carried 1.6b/1.6a pre-work and the linking UI build.

## Session 1.7: Sign-out button + Deploy + light red-team

Date: August 13, 2026 | Session: 1.7 | Name: Sign-out button + Deploy + light red-team

**What shipped:** A working sign-out button in the nav shell. Server action, default global scope, revokes the refresh token server-side and redirects to /login. Verified locally and in production. Deploy confirmed on commit 4bc17a6. Ran 3 red-team attacks against the live app. All 3 passed.

**What broke / was confusing:** Nothing broke in the build itself. The manual testing got confusing fast once I started switching between two accounts in the same browser tab. I hit a stale /login?next=%2Fviews redirect that looked like a bug but was probably just session flakiness from rapid account switching. Incognito for the second account fixed that. I also didn't realize a prerequisite step (creating a throwaway View on the second account) hadn't happened before we tried the forged-request attack. That cost some back-and-forth.

**Agent did well:** Explored before building instead of guessing. Verified Supabase's sign-out behavior against the actual docs instead of answering from memory, including the global vs local scope distinction and the access-token caveat. Flagged what it couldn't verify itself (browser behavior, Vercel deploy status) instead of asserting it worked. Wrote the redirect-outside-try/catch logic correctly on the first pass, which was the exact failure mode I was warned to watch for.

**Agent did badly:** Suggested pushing doc updates and the debrief to "next session" after commit, which goes against the standing rule that CURRENT-STATE.md gets updated every session. Also offered to skip the sign-out unit test on the reasoning that it was "mostly testing the mock" — technically true, but not a good enough reason to skip an auth-path test given CLAUDE.md's explicit rule.

**Oversight catch I'm proud of:** Catching that the sign-in landing page was /dashboard, a route nobody had documented anywhere. Wasn't part of today's scope, but I flagged it instead of letting it slide, and it went straight to backlog instead of getting chased mid-session.

**Oversight I missed (caught in review):** I didn't think to ask whether signOut() handles its own failure case. Claude Code's review pass caught it: if the Supabase logout call itself errors, the code redirects to /login anyway without checking. Minor gap, not a real bypass, but I wouldn't have thought to ask that question myself.

**Did any of the 3 attacks succeed?** No. All 3 passed: cross-tenant View access blocked, stale session after sign-out redirected correctly, and the forged viewId on the evidence RPC was rejected outright.

**Does the RPC design feel solid, or did the attack reveal something the code review didn't catch?** It feels solid. The 1.6c ownership guard did exactly what it was built to do under a live forged request, not just in a code review. That's a stronger signal than the review pass alone gave me at the time.

**Next session:** 1.8 — Debrief + retrospective. HOT 8hr session: Skills (Claude Code) + Codex Entry 1, comparative re-implementation on a disposable branch.

## Session 1.8: Debrief + retrospective
Date: 2026-08-15

- What shipped: The `new-debrief` skill (`1ef21cf`, `.claude/skills/new-debrief/SKILL.md`) — a draft-then-reflect scaffold for future session debriefs. A full dry run of that skill on a disposable session number (99.9) to verify the mechanism before trusting it with real data. The Codex Entry 1 comparative re-implementation (`d03913e` on `codex-comparison/topics-crud`) — Topics CRUD rebuilt by Codex against the same spec, on a disposable branch. `docs/01-retro.md` (`fe7aad6`) — the Project 1 retrospective covering Sessions 1.1–1.8: what shipped, the open backlog pulled directly from `CURRENT-STATE.md`, and patterns (auth, RLS, CLAUDE.md, tests) carrying forward to Project 2. A backlog-note correction on the `/dashboard` route in `CURRENT-STATE.md` (`21c5b8c`), confirming it's the post-OAuth landing page. A structured Claude-vs-Codex comparison of `app/topics/` (file structure, primary keys, tenancy checks, code style) plus the syllabus §5 Oversight Checklist run against Codex's version specifically. Also, outside the repo: the custom subdomain `thesis-tracker.parchmount.com` was added via Vercel and Namecheap/Wix DNS — config-only, no commits.
- What broke / what was confusing: After the custom subdomain went live, Google OAuth sign-in broke — it completed, then redirected to the old Vercel URL and forced a second sign-in, because the session cookie is scoped to the domain that set it. Root cause: Supabase's Redirect URLs already listed the new domain, but the separate Site URL field (the default post-auth redirect target) still pointed at the old Vercel URL. Fixed directly in the Supabase dashboard — no code or repo changes, nothing to commit — and verified via incognito: clean sign-in on the correct domain, no second prompt. Separately, the new-debrief skill didn't take effect until Claude Code was restarted after being pushed.
- What did Claude Code do brilliantly (heavily-RL'd capability): Caught that `git checkout main` was about to run against a branch with uncommitted Codex-comparison work — flagged it before executing, explained the two possible outcomes (silent carry-over or refusal), and offered concrete options instead of just proceeding.
- What did Claude Code do badly (RL gap): Two real ones. First and more significant: Claude Code helped set up the custom subdomain but didn't flag that Supabase's Site URL also needed to move to match it — the same class of gap that broke OAuth in Sessions 1.2 and 1.4, now a third occurrence, and it only surfaced because sign-in actually broke. Second: ran an unscoped, whole-filesystem `find /` search for the syllabus file that timed out at 120s, instead of trying the obvious narrower locations first.
- One oversight catch I'm proud of: Diagnosing the actual root cause myself once sign-in broke — recognizing that Redirect URLs and Site URL are two separate Supabase settings, that only the latter was stale, and fixing the specific field rather than assuming the whole domain-setup step needed redoing. Also, running the new-debrief skill as a full dry run on a fake session number (99.9) before ever pointing it at a real session, and declining to let the test entry get appended to the real `docs/debriefs.md`.
- One oversight I missed (caught in review): Typed `git checkout main` without first checking whether `codex-comparison/topics-crud` had uncommitted work — Claude Code caught it before the command ran, rather than after branch state got mixed.
- Next session: Not explicitly stated in this conversation. Session 1.7's debrief named 1.8 as "Debrief + retrospective," which this session is completing; the syllabus points to Project 2 (Deal-Flow CRM) next, but that hasn't been confirmed in this conversation.

### Reflection
"Working out of the terminal using Claude code helps simplify, organize, and more clearly translate what I want and how I want to build things."

"It's kinda like training wheels right now. We're loosening the training wheels a little bit."

"I keep running into these things where Claude will just leave something out of the workflow that is needed, and then we have to go back and redo the work. That's something that's pretty frustrating."

"It's not just a reflection. It's a reflection of the pattern showing up again and again, and it did also happen today."

This is the third time a live domain/URL config has drifted out of sync with what Supabase expects (Sessions 1.2, 1.4, and now 1.8), and this time Claude Code was directly involved in the setup step that missed it — not just adjacent to it. That cuts against the "loosening training wheels" trajectory the user otherwise feels good about this session: the independence they're building toward depends on being able to catch exactly this kind of omission themselves, which today they did, but only after it broke. Notably, the user's own correction mid-reflection — first calling this purely historical, then insisting it also happened today — is itself the same discipline in miniature: refusing to let an account stand until it matches what actually happened.

### Market one-liner
Project 1 taught me the real job of directing AI coding agents — not writing the code myself, but being the verification layer that catches what a fluent "it's done" summary leaves out, which is the same discipline a product manager or forward-deployed engineer needs to ship real systems without personally writing every line.
- Three separate sessions (1.2, 1.4, 1.8) hit the identical class of bug — a stale auth/domain config the agent didn't proactively flag — and each time the fix came from catching it myself, not from trusting the agent's account of what was done.
- The stack (RLS, OAuth, Next.js) turned out to be table stakes; the actual skill I built is judgment — knowing when a diff needs line-by-line reading versus a click-through, and which risks are worth a hard stop before approving.
