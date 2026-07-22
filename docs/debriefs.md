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
