# DROP COLUMN pattern: guard against silent data loss

**Status:** reference pattern only. As of this writing it is **not applied to any
column in this repo** — there is no pending `DROP COLUMN`. This document exists so
the pattern is settled *before* it is next needed, per Session 1.6c pre-work item 5.2.

## The problem

`alter table t drop column c;` always succeeds. Postgres does not warn, prompt, or
fail if `c` holds real data — the column and every value in it are gone, and the only
way back is a restore. In this repo migrations are pushed to a live remote
(`supabase db push`), so a `DROP COLUMN` that looked safe locally against an empty
table can silently destroy production data if that table is *not* empty upstream.

The one `DROP COLUMN` this repo has shipped so far —
`20260811151408_move_stance_to_view_evidence.sql`, dropping `stance` from
`evidence_items` — was safe **only because both tables were empty in production** at
the time, a fact the migration's own comment called out explicitly. That is a
precondition to verify, not a rule to rely on. The next drop may run against a table
with rows.

## Decide first: block or backfill

Before writing the migration, answer one question — **is the data in this column
still needed anywhere?**

- **No (the column is genuinely dead):** use the **guard-and-block** pattern below.
  The guard is a tripwire: it lets the drop proceed when the column is provably empty
  of meaningful data, and aborts the whole migration if it isn't — forcing a human
  decision instead of a silent loss. This is the default for "we're removing a column
  we no longer use."

- **Yes (the data moves somewhere):** **backfill first, then drop.** Copy/transform
  the values into their new home in an earlier statement (or an earlier migration that
  is verified applied), confirm the new location is populated, and only then drop the
  old column. In this case the guard on the *old* column is redundant — you have
  already read its data out — but a guard on the *new* column (raise if it's
  unexpectedly still null after backfill) is a good symmetric check. `stance`'s move
  from `evidence_items` to `view_evidence` would have been this shape had either table
  contained rows.

Blocking protects against *forgetting* that a column still matters. Backfilling is
what you do once you've decided it matters and where it goes. If you can't confidently
say which case you're in, you are not ready to write the migration.

## Guard-and-block template

Run the guard in the same migration, immediately before the drop. It raises — aborting
the transaction, so the `drop column` never executes — if any non-null value exists.
Lowercase SQL, schema-qualified names, matching the repo's existing migration style.

```sql
-- Guard: refuse to drop <table>.<column> if it still holds non-null data.
-- A bare `drop column` would destroy that data silently; this tripwire turns
-- "there was data" into a hard failure so the drop can't happen by accident.
-- If this raises, do NOT weaken the guard -- decide explicitly whether the data
-- should be backfilled elsewhere first (see docs/design/drop-column-pattern.md),
-- then remove the column only once it is provably safe.
do $$
begin
  if exists (
    select 1 from public.<table> where <column> is not null
  ) then
    raise exception
      'refusing to drop public.<table>.<column>: % row(s) still hold non-null data',
      (select count(*) from public.<table> where <column> is not null)
      using errcode = 'raise_exception';
  end if;
end;
$$;

alter table public.<table> drop column <column>;
```

Notes on the template:

- **`if exists (...)`** short-circuits — it stops at the first non-null row rather than
  scanning the whole table, so the guard is cheap even on large tables. The `count(*)`
  in the message only runs on the failure path (when you're aborting anyway), so it
  costs nothing in the common success case.
- **The raise aborts the transaction.** Supabase runs each migration in a
  transaction, so a raised exception rolls back everything in the file — the drop and
  anything before it. There is no partial-apply to clean up.
- **`errcode = 'raise_exception'`** (SQLSTATE `P0001`) is the generic user-raised
  error; it just makes the failure an explicit application error rather than an
  internal one. Any distinct errcode is fine — the message is what a human reads.
- **This guards data, not references.** Dependent objects (RLS policies, views,
  constraints, indexes) that reference the column are a separate concern: Postgres
  blocks a `drop column` that would break a dependency unless you `cascade`. The
  `stance` drop noted above had no such dependents. Check for them separately; the
  guard here is only about *values*.

## When NOT to use the guard

- The column was added in an **unpushed** migration and has never existed on the
  remote — there is no production data to lose. Prefer editing the not-yet-applied
  migration over stacking an add-then-drop pair.
- You are **intentionally** discarding known data and have said so explicitly (in the
  migration comment and wherever the change is reviewed). In that case the guard would
  just block a decision you've already made — but write down that you made it.
