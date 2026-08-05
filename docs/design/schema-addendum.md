**SUPERSEDED.** This reflects the Session 1.3 schema before the Session 1.4 evidence redesign. evidence_items is now many-to-many with views via the view_evidence join table (two-sided RLS), not the single-sided FK described below. Current source of truth: supabase/migrations/ and docs/adr/ADR-003-prd-schema-reconciliation.md onward.

# Schema Addendum: Session 1.3 — Data Model + Tenancy

## topics
- id (uuid, PK, default gen_random_uuid())
- user_id (uuid, FK -> auth.users)
- name (text)
- description (text, nullable)
- created_at, updated_at
- RLS: direct check — auth.uid() = user_id

## views
- id (uuid, PK)
- user_id (uuid, FK -> auth.users)
- title (text)
- hypothesis (text)
- confidence (text, PLACEHOLDER — revisit type: numeric 0-100 vs enum low/med/high)
- time_horizon (text, PLACEHOLDER — revisit type: enum vs date range)
- created_at, updated_at
- RLS: direct check — auth.uid() = user_id

## view_topics (join table)
- id (uuid, PK)
- view_id (uuid, FK -> views)
- topic_id (uuid, FK -> topics)
- created_at
- RLS: two-sided EXISTS — must own parent views row AND parent topics row

## view_relationships (self-referential join table)
- id (uuid, PK)
- view_id_a (uuid, FK -> views)
- view_id_b (uuid, FK -> views)
- relationship_type (text or enum — TBD, not RLS-relevant)
- created_at
- RLS: two-sided EXISTS — must own both view_id_a and view_id_b, both checked against views

## evidence_items
- id (uuid, PK)
- view_id (uuid, FK -> views)
- content (text)
- source_url (text, nullable)
- supports_or_contradicts (enum: for/against)
- created_at
- RLS: single-sided EXISTS — owns parent views row

## Open items (deferred, not blocking today)
- confidence: type TBD
- time_horizon: type TBD
- relationship_type: enum values TBD
- cascade behavior on delete: not yet decided — reviewing Claude Code's proposal at Task 1 pause point
- FOR ALL vs. per-operation RLS scoping: not yet decided — same review point
