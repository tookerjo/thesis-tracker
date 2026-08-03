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
