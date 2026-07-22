# Tech Design: Topic/View Tracker (personalized v1)
Author: Josh Tooker | Date: 2026-07-22 | Reviewed by: Josh (with Claude.ai) — revised during Session 1.1 review pass

## 1. Context
Personalized version of Project 1 (Thesis Tracker, renamed Topic/View Tracker)
from the Native AI Engineering syllabus. Real single-user tool for Parchmount
investment thinking, built to learn the full spec-to-ship loop. See PRD.md for
goals, non-goals, and real test data.

Revision note: the original single-entity, single-parent-link design was
replaced during this session's PRD review with a two-entity (Topic, View),
many-to-many design. See ADR-002 for the reasoning and tradeoffs. This is a
deliberate, discussed deviation from the syllabus's default framing of Project 1
as pure single-table CRUD with no relational complexity — many-to-many
relationships are normally introduced in Project 2 (§8). Chosen anyway because
a single-parent model did not reflect how Josh's real Views relate to each
other, confirmed against real test data during this session.

## 2. Stack
- Framework: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS + shadcn/ui
- DB: Supabase (Postgres + auth + row-level security)
- Hosting: Vercel
- Auth: Google OAuth via Supabase (built in Session 1.2 — not this session)

## 3. Data Model (schema-level)

### `topics` table
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key. Server-generated. |
| user_id | uuid | FK to auth.users.id. Never populated from client-supplied value. |
| name | text | Required |
| framing_note | text | Optional free text |
| created_at | timestamptz | Set on insert |
| updated_at | timestamptz | Set on insert, updated on edit |

### `views` table
(Named `views` to match the PRD's "View" entity — note: `views` is not a
reserved word conflict in Postgres in this context, but confirm no clash with
any Postgres system view naming when Session 1.3 writes the actual migration.)

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key. Server-generated. |
| user_id | uuid | FK to auth.users.id |
| title | text | Required |
| confidence_level | text | Select-constrained: 'low' \| 'medium' \| 'high' (enforce via CHECK constraint or Postgres enum type — decide at migration time in 1.3) |
| time_horizon | text | Select-constrained: '<1yr' \| '1-3yr' \| '3-10yr' \| '10+yr' \| 'unclear' |
| tags | text | Free-text, comma-separated for v1 (unchanged from original design — kept as open question in PRD) |
| created_at | timestamptz | Set on insert |
| updated_at | timestamptz | Set on insert, updated on any edit, including a new evidence item being added |

### `view_topics` table (join table, View ↔ Topic, many-to-many)
| Column | Type | Notes |
|---|---|---|
| view_id | uuid | FK to views.id |
| topic_id | uuid | FK to topics.id |
| (composite primary key on view_id + topic_id) | | A View must have at least one row here — enforce at application layer in 1.4/1.5, since Postgres can't easily enforce "at least one related row" via schema constraint alone |

### `view_relationships` table (join table, View ↔ View, many-to-many, self-referencing)
| Column | Type | Notes |
|---|---|---|
| view_id | uuid | FK to views.id |
| related_view_id | uuid | FK to views.id |
| (composite primary key on view_id + related_view_id) | | Store both directions or enforce a canonical ordering (e.g., always store the lower UUID first) to avoid duplicate inverse rows — decide at migration time; flagging as a real implementation detail, not solved here |

### `evidence_items` table (one-to-many, belongs to one View)
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| view_id | uuid | FK to views.id |
| link | text | Required — the URL |
| note | text | Optional, one line |
| stance | text | Select-constrained: 'for' \| 'against' |
| created_at | timestamptz | Set on insert — this is the "added date" from the PRD |

## 4. API / Route Shape
(Implemented starting Session 1.4-1.5, not this session — listed here so the
schema and routes are designed together.)
- GET /api/topics — list current user's Topics (auth required)
- POST /api/topics — create Topic
- GET /api/topics/:id — get one Topic, including linked Views
- PATCH /api/topics/:id — update Topic
- GET /api/views — list current user's Views (used for the "check overlap
  across all Topics" flow in the PRD)
- POST /api/views — create View, including initial Topic links and optional
  related-View links
- GET /api/views/:id — get one View, including linked Topics, related Views,
  and evidence items
- PATCH /api/views/:id — update View core fields or its Topic/View links
- POST /api/views/:id/evidence — add an evidence item (the fast-capture path;
  intentionally a separate, narrow endpoint so this action stays fast and
  doesn't require loading/resubmitting the whole View)
- DELETE /api/views/:id — soft-delete/archive (recommend `archived_at` column,
  consistent with general caution around permanent deletion)

## 5. Identity & Tenancy
- User identity is `auth.users.id` (UUID), populated at signup via Google OAuth
  in Session 1.2, never changed
- Every Topic, View, and Evidence Item is scoped by `user_id` (Evidence Items
  inherit tenancy through their parent View's user_id — enforce via RLS policy
  that joins through views, not a duplicated user_id column, to avoid drift)
- Tenancy enforced at (a) database via RLS policies (Session 1.3) AND (b)
  application middleware
- Auth provider mapping: Google OAuth → user lookup by `provider_subject`, never
  by email (ADR-001)

## 6. File / Folder Structure
```
thesis-tracker/
  docs/
    PRD.md
    tech-design.md
    adr/
      ADR-001-uuid-primary-keys.md
      ADR-002-many-to-many-topic-view-relationships.md
    debriefs.md
    session-1.1-plan.md
  CLAUDE.md
  app/
    (Next.js App Router — built starting Session 1.2)
```

## 7. Key Decisions (linked to ADRs)
- ADR-001: UUID primary keys, never derived from user input
- ADR-002: Many-to-many View↔Topic and View↔View relationships, and the
  two-entity (Topic/View) split, chosen over the original single-entity,
  single-parent-link design

## 8. Risks & Open Questions
- Many-to-many relationships and a fast-append evidence-item pattern are more
  schema than a typical Project 1 CRUD app — carries real cost into Sessions
  1.3 (RLS on join tables) and 1.4/1.5 (multi-select UI, evidence-item quick-add
  UI). Estimated at roughly an extra hour spread across those sessions,
  discussed and accepted this session given the scope-creep tradeoff was
  explicit, not accidental.
- "A View must link to at least one Topic" is a business rule the schema can't
  cleanly enforce alone (no easy Postgres constraint for "at least one row
  exists in a join table") — must be enforced in application code, which is a
  real gap vs. the "enforce at both DB and app layer" tenancy pattern used
  elsewhere. Flagging honestly rather than pretending schema-level enforcement
  exists.
- `view_relationships` directionality (storing A→B and B→A once vs. twice) is
  unresolved — needs a decision at actual migration time in Session 1.3, not
  invented here without real schema work in front of us.
- Free-text Tags field: same open question as before, unresolved intentionally.
