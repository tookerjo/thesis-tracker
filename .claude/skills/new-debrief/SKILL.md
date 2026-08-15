---
name: new-debrief
description: Scaffold a new session debrief entry in docs/debriefs.md — draft-then-reflect flow (evidence-grounded first draft, then the user's own reflection integrated on top), plus a saved market-facing one-liner. Use when the user wants to start/close out a debrief for a session (e.g. "/new-debrief 1.8 Debrief + retrospective").
---

# New Debrief

Scaffolds one entry in `docs/debriefs.md` for a finished (or finishing) session, using a
two-pass flow: an evidence-grounded first draft, then the user's own spoken reflection
folded in on top. Nothing is written to the file until the user approves the final text.

This produces more than the literal syllabus §4 "Debrief" block (7 fields). It also adds
a `### Reflection` section (verbatim quotes + a short synthesis note — same shape as the
existing Session 1.6b entry in the file) and a `### Market one-liner` section. Both are
intentional extensions of the template, matching how this file has already evolved
session over session — not a deviation to flag every time.

## Args

Invoked as `/new-debrief <session-number> <name>`, e.g.:
`/new-debrief 1.8 Debrief + retrospective`

- Session number = first whitespace-delimited token (e.g. `1.8`, `1.6c`).
- Name = everything after it, verbatim.
- If either piece is missing or ambiguous, ask the user directly rather than guessing.

## Stage 0 — Setup and duplicate check

1. Run `date +%F` via Bash to get the real current date. Do not rely on any date given
   in prior context — it may be stale in a resumed or long-running session.
2. Read `docs/debriefs.md` and check for an existing `## Session {N}` heading matching
   the requested session number (allow for suffix variants like `1.6c` vs `1.6`).
   If a match exists, stop and ask the user how to proceed (rename, overwrite, abort) —
   never silently create a duplicate entry for the same session.
3. Note the last session's date in the file (for Stage 1's git range).

## Stage 1 — First draft (v1): structure around the experience

Draft all seven fields from the syllabus §8 debrief block, plus a market one-liner draft.
This draft is scaffolding, not the final word — it exists so the user has something to
react to and correct rather than a blank page. It must be grounded in verifiable
evidence, not a fluent-sounding guess:

- Run `git log` and `git diff` for the range since the last debrief entry's date (or
  since whatever commit that entry references) to see what actually shipped. Ground
  `What shipped` in these real commits/diffs, not a memory-summary of the session — the
  user has repeatedly caught agents asserting a clean/complete state that didn't match
  the real diff, and does not want that pattern repeated here.
- Use the live conversation transcript (this session, if the debrief is being run at the
  end of a working session) for `What broke / what was confusing` and the judgment
  fields below.
- Voice: match the existing file exactly — first-person "I" for the user's own actions
  and decisions; third-person "Claude Code…" when describing what the agent did. Do not
  invent a different voice or register.
- Judgment fields — `What did Claude Code do brilliantly`, `What did Claude Code do
  badly`, `One oversight catch I'm proud of`, `One oversight I missed` — must cite a
  specific, concrete incident that happened this session (a real action, a real
  correction, a real catch). If no solid candidate exists for one of these, say so
  plainly in the draft (e.g. "No standout incident this session") rather than
  manufacturing a plausible-sounding filler entry. These fields exist so the user can
  independently judge the agent's performance — a self-flattering or self-critical
  fabrication defeats the point.
- `Next session` — only fill in if it was already explicitly stated/planned in the
  conversation; otherwise leave a placeholder for the user.
- Market one-liner draft: one sentence describing the session in plain, non-technical
  language — the version the user could say to someone outside this project (e.g. "to
  the market") — plus up to two short supporting bullets if useful. Derive it from
  `What shipped`, not from the judgment fields.

Present the full v1 draft (seven fields + market one-liner) in chat. Do not write
anything to `docs/debriefs.md` yet.

## Stage 2 — Ask for the user's reflection

Ask the user directly for their own unstructured reflection on the session — open-ended,
no required format, their own "external processing." Wait for their reply in full before
continuing. Do not prompt them with leading questions that would shape what they say.

## Stage 3 — Integration (v2)

The v1 draft is the backbone and stays in place. The reflection is used to **augment**
it — sharpen specificity, correct details the user's own account clarifies, and pull in
more of the user's actual phrasing — not to overwrite fields wholesale just because the
reflection touches on the same topic. Only change a v1 field where the reflection
actually adds or corrects something real.

Build the `### Reflection` section:
- Select **3-4 verbatim quotes** from the user's reflection message — not a full
  transcript, not paraphrased. Choose the quotes specifically for what they reveal about
  the user's real learning or retention (a moment where a concept clicked, a belief that
  shifted, a judgment call they're now more confident or less confident in) — not just
  any notable-sounding line.
- Quote them exactly as written, in quotation marks.
- Below the quotes, add a short synthesis note (a sentence or two) distilling what those
  quotes indicate — same shape as the existing "Note:" paragraph under Session 1.6b's
  Reflection section in the file. Do not rewrite or paraphrase the quotes themselves in
  this note; the note interprets, it doesn't replace.

Regenerate the market one-liner only if the reflection changes how the user would
actually describe the session externally — otherwise leave the v1 version as-is.

## Stage 4 — Approval gate

Show the user the complete assembled entry: all seven fields, the `### Reflection`
section, and the `### Market one-liner` section (in that order, market one-liner last).
Ask for explicit confirmation.

Only after confirmation: append the entry to the end of `docs/debriefs.md` using the
Edit tool, anchored on the file's current final lines (do not touch or rewrite any
earlier entry). Use this exact structure:

```markdown
## Session {N.M}: {Name}
Date: {YYYY-MM-DD}

- What shipped: {text}
- What broke / what was confusing: {text}
- What did Claude Code do brilliantly (heavily-RL'd capability): {text}
- What did Claude Code do badly (RL gap): {text}
- One oversight catch I'm proud of: {text}
- One oversight I missed (caught in review): {text}
- Next session: {text}

### Reflection
"{quote 1}"

"{quote 2}"

"{quote 3}"

{optional quote 4}

{synthesis note, 1-2 sentences}

### Market one-liner
{one sentence, plain/external-facing}
- {optional supporting bullet}
- {optional supporting bullet}
```

Report back the exact text that was appended.
