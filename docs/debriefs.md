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
