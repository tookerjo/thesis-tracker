# Tech Design: Thesis Tracker (Personalized v1)
Author: Josh Tooker | Date: 2026-07-22 | Reviewed by: Josh (with Claude.ai)

## 1. Context
Personalized version of Project 1 (Thesis Tracker) from the Native AI Engineering
syllabus. Real single-user tool for Parchmount investment theses, built to learn
the full spec-to-ship loop at minimum complexity (pure CRUD, no integrations, no
LLM pipeline). See PRD.md for goals, non-goals, and real test data.

## 2. Stack
- Framework: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS + shadcn/ui
- DB: Supabase (Postgres + auth + row-level security)
- Hosting: Vercel
- Auth: Google OAuth via Supabase (built in Session 1.2 — not this session)

## 3. Data Model (schema-level)

### `theses` table
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key. Generated server-side. Never derived from title or any user input. |
| user_id | uuid | Foreign key to auth.users.id. Never populated from client-supplied value. |
| title | text | Required |
| hypothesis | text | Required |
| evidence_for | text | Optional. Free text; a single field rather than a repeating list for v1 — matches how the real test data was captured (paragraph form, not itemized bullets). |
| evidence_against | text | Optional, same rationale |
| related_companies | text | Optional free text for v1 (not a structured list/table — no need for a many-to-many companies table when the real data is "~75 companies, not individually named yet") |
| confidence_level | text | Optional. Free text or simple scale (e.g., low/medium/high) rather than a rigid enum — real data uses "high" as a word, not a number |
| time_horizon | text | Optional free text. Added field, distinct from confidence_level, because Josh explicitly separates "will it happen" from "when" |
| tags | text | Optional free text, comma-separated for v1. Not a controlled taxonomy — see PRD open question |
| parent_thesis_id | uuid | Optional, nullable. Self-referencing foreign key to theses.id. One link only for v1 (not many-to-many) |
| created_at | timestamptz | Set on insert |
| updated_at | timestamptz | Set on insert, updated on every edit — this is the "Last Updated" field from the PRD |

Rationale for free-text over structured fields (evidence, companies, confidence):
matches the real test data, which arrived as prose, not itemized lists. Converting
to structured lists (e.g., evidence as an array of discrete claims) is a real
future want but wasn't asked for in pre-work and would be design invention rather
than spec grounded in stated use. Flagging as an open question in the PRD, not
building it.

## 4. API / Route Shape
(Implemented starting Session 1.4-1.5, not this session — listed here so the
schema and routes are designed together.)
- GET /api/theses — list current user's theses (auth required)
- POST /api/theses — create thesis (auth required)
- GET /api/theses/:id — get one thesis (auth + RLS)
- PATCH /api/theses/:id — update thesis (auth + RLS)
- DELETE /api/theses/:id — soft-delete/archive thesis (auth + RLS) — recommend
  soft-delete (an `archived_at` column) over hard delete, consistent with the
  syllabus's general caution around permanent deletion

## 5. Identity & Tenancy
- User identity is `auth.users.id` (UUID), populated at signup via Google OAuth in
  Session 1.2, never changed
- Every thesis row has a `user_id` FK — required even though there is one real
  user today, because RLS (Session 1.3) is enforced at the schema level regardless
  of user count, and retrofitting tenancy later is the exact mistake the syllabus
  is designed to prevent
- Tenancy enforced at (a) database via RLS policies (Session 1.3) AND (b)
  application middleware — both layers, per syllabus Oversight Checklist
- Auth provider mapping: Google OAuth → user lookup by `provider_subject`, never
  by email (this is the ADR-001 rule, restated for identity/tenancy specifically)

## 6. File / Folder Structure
```
thesis-tracker/
  docs/
    PRD.md
    tech-design.md
    adr/
      ADR-001-uuid-primary-keys.md
    debriefs.md
  CLAUDE.md
  app/
    (Next.js App Router — built starting Session 1.2)
  (standard Next.js/Tailwind/Supabase scaffolding — built Session 1.2)
```

## 7. Key Decisions (linked to ADRs)
- ADR-001: UUID primary keys, never derived from user input (this session)
- Future ADR candidate (not written today — no decision has been made yet, only
  flagged as open in the PRD): whether Related/Parent Thesis stays one-link-only
  or becomes many-to-many. Revisit if/when it becomes a real constraint.

## 8. Risks & Open Questions
- Free-text evidence/confidence/tags fields are fast to ship but harder to query
  or filter on later (e.g., "show me all high-confidence theses" requires string
  matching, not a clean enum comparison). Accepted tradeoff for v1 — matches real
  data shape, revisit if filtering becomes a real need.
- Single-parent-thesis link may not hold up once more theses are added and
  relationships turn out to be genuinely many-to-many (Thesis 1 already has one
  child; if a third thesis also relates to Thesis 1, the one-link model holds,
  but if Thesis 2 later relates to something *other* than Thesis 1, it doesn't).
  Watch this in Session 1.4-1.5 when the UI actually gets built.
