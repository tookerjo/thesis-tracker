import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_TEST_URL;
const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_TEST_URL / SUPABASE_TEST_ANON_KEY / SUPABASE_TEST_SERVICE_ROLE_KEY. " +
      "See .env.test.local (must point at a local `supabase start` instance).",
  );
}

// This suite creates and deletes real auth users. Refuse to run against
// anything that isn't an obviously-local Supabase instance.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(SUPABASE_URL)) {
  throw new Error(
    `Refusing to run tenancy tests against non-local Supabase URL: ${SUPABASE_URL}`,
  );
}

const TEST_PASSWORD = "password-for-rls-tests-only";
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type TestUser = { id: string; client: SupabaseClient };

async function createSignedInUser(label: string): Promise<TestUser> {
  const email = `${label}-${randomUUID()}@rls-test.local`;

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
  if (createError || !created.user) {
    throw createError ?? new Error(`Failed to create ${label}`);
  }

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: session, error: signInError } =
    await anonClient.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (signInError || !session.session) {
    throw signInError ?? new Error(`Failed to sign in ${label}`);
  }

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
  });

  return { id: created.user.id, client };
}

type Seed = {
  topicId: string;
  viewId: string;
  secondViewId: string;
  viewTopicId: string;
  evidenceId: string;
  viewEvidenceId: string;
};

// withSecondView: user A gets a second view solely so a same-user
// view_relationships row can exist to test read-blocking on — a
// relationship needs two distinct views, and the canonical-order check
// constraint rules out using one view twice.
async function seedTopicAndViews(
  user: TestUser,
  opts: { withSecondView: boolean },
): Promise<Seed> {
  const { data: topic, error: topicError } = await user.client
    .from("topics")
    .insert({ user_id: user.id, name: `Topic for ${user.id}` })
    .select()
    .single();
  if (topicError) throw topicError;

  const { data: view, error: viewError } = await user.client
    .from("views")
    .insert({ user_id: user.id, title: "View 1" })
    .select()
    .single();
  if (viewError) throw viewError;

  let secondViewId = "";
  if (opts.withSecondView) {
    const { data: view2, error: view2Error } = await user.client
      .from("views")
      .insert({ user_id: user.id, title: "View 2" })
      .select()
      .single();
    if (view2Error) throw view2Error;
    secondViewId = view2.id;
  }

  const { data: viewTopic, error: viewTopicError } = await user.client
    .from("view_topics")
    .insert({ view_id: view.id, topic_id: topic.id })
    .select()
    .single();
  if (viewTopicError) throw viewTopicError;

  // evidence_items is now directly owned (user_id), not owned via view_id —
  // it's linked to the view separately through view_evidence.
  const { data: evidence, error: evidenceError } = await user.client
    .from("evidence_items")
    .insert({ user_id: user.id, note: "Some evidence" })
    .select()
    .single();
  if (evidenceError) throw evidenceError;

  // stance now lives on the view_evidence link (ADR-006), not on the
  // evidence_items row.
  const { data: viewEvidence, error: viewEvidenceError } = await user.client
    .from("view_evidence")
    .insert({ view_id: view.id, evidence_id: evidence.id, stance: "for" })
    .select()
    .single();
  if (viewEvidenceError) throw viewEvidenceError;

  return {
    topicId: topic.id,
    viewId: view.id,
    secondViewId,
    viewTopicId: viewTopic.id,
    evidenceId: evidence.id,
    viewEvidenceId: viewEvidence.id,
  };
}

// Sorts a pair of view ids so the first is < the second, matching
// view_relationships_canonical_order_check. This has nothing to do with
// RLS — getting it wrong makes an insert/update fail on the CHECK
// constraint instead of exercising the ownership policy, which would
// make the surrounding test pass for the wrong reason.
function canonicalOrder(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

async function seedViewRelationship(
  user: TestUser,
  viewIdA: string,
  viewIdB: string,
): Promise<{ id: string; view_id: string; related_view_id: string }> {
  const [view_id, related_view_id] = canonicalOrder(viewIdA, viewIdB);
  const { data, error } = await user.client
    .from("view_relationships")
    .insert({ view_id, related_view_id, relationship_type: "related" })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id as string, view_id, related_view_id };
}

describe("cross-tenant RLS boundaries", () => {
  let userA: TestUser;
  let userB: TestUser;
  let seedA: Seed;
  let seedB: Seed;
  let relationshipA: { id: string; view_id: string; related_view_id: string };

  beforeAll(async () => {
    userA = await createSignedInUser("user-a");
    userB = await createSignedInUser("user-b");

    seedA = await seedTopicAndViews(userA, { withSecondView: true });
    seedB = await seedTopicAndViews(userB, { withSecondView: false });

    relationshipA = await seedViewRelationship(
      userA,
      seedA.viewId,
      seedA.secondViewId,
    );
  });

  afterAll(async () => {
    // Deleting the auth users cascades through every table below via the
    // ON DELETE CASCADE FKs set up in the schema migrations — no manual
    // row cleanup needed.
    await adminClient.auth.admin.deleteUser(userA.id);
    await adminClient.auth.admin.deleteUser(userB.id);
  });

  // Positive control: if this fails, the read-blocking tests below are
  // meaningless — they'd pass for the wrong reason (e.g. broken auth
  // plumbing returning empty results for everyone, not RLS doing its job).
  it("user A can read their own topic, view, evidence, and view_evidence link", async () => {
    const [topic, view, evidence, viewEvidence] = await Promise.all([
      userA.client.from("topics").select("*").eq("id", seedA.topicId),
      userA.client.from("views").select("*").eq("id", seedA.viewId),
      userA.client.from("evidence_items").select("*").eq("id", seedA.evidenceId),
      userA.client.from("view_evidence").select("*").eq("id", seedA.viewEvidenceId),
    ]);
    expect(topic.data).toHaveLength(1);
    expect(view.data).toHaveLength(1);
    expect(evidence.data).toHaveLength(1);
    expect(viewEvidence.data).toHaveLength(1);
  });

  it("user B cannot read user A's topic", async () => {
    const { data, error } = await userB.client
      .from("topics")
      .select("*")
      .eq("id", seedA.topicId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("user B cannot read user A's view", async () => {
    const { data, error } = await userB.client
      .from("views")
      .select("*")
      .eq("id", seedA.viewId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("user B cannot read user A's view_topics row", async () => {
    const { data, error } = await userB.client
      .from("view_topics")
      .select("*")
      .eq("id", seedA.viewTopicId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("user B cannot read user A's view_relationships row", async () => {
    const { data, error } = await userB.client
      .from("view_relationships")
      .select("*")
      .eq("id", relationshipA.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("user B cannot read user A's evidence_items row", async () => {
    const { data, error } = await userB.client
      .from("evidence_items")
      .select("*")
      .eq("id", seedA.evidenceId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("user B cannot read user A's view_evidence row", async () => {
    const { data, error } = await userB.client
      .from("view_evidence")
      .select("*")
      .eq("id", seedA.viewEvidenceId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("user A cannot create a view_relationships row linking to user B's view", async () => {
    const [view_id, related_view_id] = canonicalOrder(
      seedA.viewId,
      seedB.viewId,
    );
    const { data, error } = await userA.client
      .from("view_relationships")
      .insert({ view_id, related_view_id, relationship_type: "related" })
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("user A cannot insert a view_topics row linking their view to user B's topic", async () => {
    const { data, error } = await userA.client
      .from("view_topics")
      .insert({ view_id: seedA.viewId, topic_id: seedB.topicId })
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  // evidence_items ownership is now direct (auth.uid() = user_id), so the
  // meaningful adversarial case is no longer "link to someone else's view"
  // (that's view_evidence's job, tested below) but a forged user_id — this
  // is exactly the CLAUDE.md #2 guarantee ("never trust client-supplied
  // user_id") enforced at the DB layer via WITH CHECK.
  it("user A cannot insert an evidence_items row using user B's user_id", async () => {
    const { data, error } = await userA.client
      .from("evidence_items")
      .insert({
        user_id: userB.id,
        note: "Evidence attempting to forge ownership",
      })
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  // view_evidence has a two-sided EXISTS policy, so a cross-tenant link can
  // be attempted from either side — user A's own view paired with user B's
  // evidence, or user A's own evidence paired with user B's view. Both must
  // be blocked independently.
  it("user A cannot insert a view_evidence row linking their view to user B's evidence", async () => {
    const { data, error } = await userA.client
      .from("view_evidence")
      .insert({ view_id: seedA.viewId, evidence_id: seedB.evidenceId })
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("user A cannot insert a view_evidence row linking their evidence to user B's view", async () => {
    const { data, error } = await userA.client
      .from("view_evidence")
      .insert({ view_id: seedB.viewId, evidence_id: seedA.evidenceId })
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  // DELETE is governed by each policy's USING clause, not WITH CHECK. When
  // USING filters a row out for user B, the DELETE silently matches zero
  // rows rather than erroring — so the meaningful assertion is that the row
  // still exists afterward. Verified via user A's own client (not the
  // service-role admin client): A owns these rows, so USING permits A to
  // read them back, and this sidesteps service_role's missing table grants
  // (see grant_authenticated_crud migration — grants were only issued to
  // `authenticated`, not `service_role`).
  it("user B cannot delete user A's topic", async () => {
    const { error } = await userB.client
      .from("topics")
      .delete()
      .eq("id", seedA.topicId);
    expect(error).toBeNull();

    const { data } = await userA.client
      .from("topics")
      .select("id")
      .eq("id", seedA.topicId);
    expect(data).toHaveLength(1);
  });

  it("user B cannot delete user A's view", async () => {
    const { error } = await userB.client
      .from("views")
      .delete()
      .eq("id", seedA.viewId);
    expect(error).toBeNull();

    const { data } = await userA.client
      .from("views")
      .select("id")
      .eq("id", seedA.viewId);
    expect(data).toHaveLength(1);
  });

  it("user B cannot delete user A's view_topics row", async () => {
    const { error } = await userB.client
      .from("view_topics")
      .delete()
      .eq("id", seedA.viewTopicId);
    expect(error).toBeNull();

    const { data } = await userA.client
      .from("view_topics")
      .select("id")
      .eq("id", seedA.viewTopicId);
    expect(data).toHaveLength(1);
  });

  it("user B cannot delete user A's view_relationships row", async () => {
    const { error } = await userB.client
      .from("view_relationships")
      .delete()
      .eq("id", relationshipA.id);
    expect(error).toBeNull();

    const { data } = await userA.client
      .from("view_relationships")
      .select("id")
      .eq("id", relationshipA.id);
    expect(data).toHaveLength(1);
  });

  it("user B cannot delete user A's evidence_items row", async () => {
    const { error } = await userB.client
      .from("evidence_items")
      .delete()
      .eq("id", seedA.evidenceId);
    expect(error).toBeNull();

    const { data } = await userA.client
      .from("evidence_items")
      .select("id")
      .eq("id", seedA.evidenceId);
    expect(data).toHaveLength(1);
  });

  it("user B cannot delete user A's view_evidence row", async () => {
    const { error } = await userB.client
      .from("view_evidence")
      .delete()
      .eq("id", seedA.viewEvidenceId);
    expect(error).toBeNull();

    const { data } = await userA.client
      .from("view_evidence")
      .select("id")
      .eq("id", seedA.viewEvidenceId);
    expect(data).toHaveLength(1);
  });

  // Distinct from the existing INSERT-relink test above: this confirms
  // WITH CHECK is re-evaluated on UPDATE too, not just enforced once at row
  // creation. USING passes here (user A owns the row as it stands) — it's
  // the new value that must fail WITH CHECK. Verified via user A's own
  // client for the same service_role-grant reason noted above.
  //
  // targetField is chosen so the update stays canonical-order-valid
  // (view_id < related_view_id) regardless of where seedB.viewId's random
  // UUID happens to sort relative to relationshipA's existing values —
  // otherwise the update could fail on the CHECK constraint instead of
  // RLS's WITH CHECK, which would make this test pass for the wrong reason.
  it("user A cannot UPDATE a view_relationships row to relink to user B's view", async () => {
    const targetField =
      seedB.viewId > relationshipA.view_id ? "related_view_id" : "view_id";
    const originalValue = relationshipA[targetField];

    const { data, error } = await userA.client
      .from("view_relationships")
      .update({ [targetField]: seedB.viewId })
      .eq("id", relationshipA.id)
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();

    const { data: unchanged } = await userA.client
      .from("view_relationships")
      .select("view_id, related_view_id")
      .eq("id", relationshipA.id)
      .single();
    expect(unchanged?.[targetField]).toBe(originalValue);
  });

  // INSERT forgery via an explicitly-passed user_id, for the two
  // direct-ownership tables not already covered above (evidence_items'
  // equivalent case is tested at "user A cannot insert an evidence_items
  // row using user B's user_id"). WITH CHECK must reject the row even
  // though the client supplied user_id itself -- the DB never trusts a
  // client-supplied user_id (CLAUDE.md #2).
  it("user A cannot insert a views row using user B's user_id", async () => {
    const { data, error } = await userA.client
      .from("views")
      .insert({ user_id: userB.id, title: "Forged ownership view" })
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("user A cannot insert a topics row using user B's user_id", async () => {
    const { data, error } = await userA.client
      .from("topics")
      .insert({ user_id: userB.id, name: "Forged ownership topic" })
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  // UPDATE, like DELETE, is governed by each policy's USING clause: a row
  // outside the caller's ownership is filtered out of the candidate set
  // entirely, so a cross-owner UPDATE affects zero rows and returns no
  // error rather than erroring -- the same silent-no-op shape as the
  // DELETE-blocking tests above, just for UPDATE.
  it("user B cannot UPDATE user A's topic", async () => {
    const { data, error } = await userB.client
      .from("topics")
      .update({ name: "hijacked by user B" })
      .eq("id", seedA.topicId)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: stillOwnedByA } = await userA.client
      .from("topics")
      .select("id")
      .eq("id", seedA.topicId);
    expect(stillOwnedByA).toHaveLength(1);
  });

  it("user B cannot UPDATE user A's view", async () => {
    const { data, error } = await userB.client
      .from("views")
      .update({ title: "hijacked by user B" })
      .eq("id", seedA.viewId)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: stillOwnedByA } = await userA.client
      .from("views")
      .select("id")
      .eq("id", seedA.viewId);
    expect(stillOwnedByA).toHaveLength(1);
  });

  it("user B cannot UPDATE user A's evidence_items row", async () => {
    const { data, error } = await userB.client
      .from("evidence_items")
      .update({ note: "hijacked by user B" })
      .eq("id", seedA.evidenceId)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: stillOwnedByA } = await userA.client
      .from("evidence_items")
      .select("id")
      .eq("id", seedA.evidenceId);
    expect(stillOwnedByA).toHaveLength(1);
  });

  it("user B cannot UPDATE user A's view_topics row", async () => {
    const { data, error } = await userB.client
      .from("view_topics")
      .update({ created_at: new Date().toISOString() })
      .eq("id", seedA.viewTopicId)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: stillOwnedByA } = await userA.client
      .from("view_topics")
      .select("id")
      .eq("id", seedA.viewTopicId);
    expect(stillOwnedByA).toHaveLength(1);
  });

  it("user B cannot UPDATE user A's view_relationships row", async () => {
    const { data, error } = await userB.client
      .from("view_relationships")
      .update({ relationship_type: "hijacked by user B" })
      .eq("id", relationshipA.id)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: stillOwnedByA } = await userA.client
      .from("view_relationships")
      .select("id")
      .eq("id", relationshipA.id);
    expect(stillOwnedByA).toHaveLength(1);
  });

  it("user B cannot UPDATE user A's view_evidence row", async () => {
    const { data, error } = await userB.client
      .from("view_evidence")
      .update({ created_at: new Date().toISOString() })
      .eq("id", seedA.viewEvidenceId)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: stillOwnedByA } = await userA.client
      .from("view_evidence")
      .select("id")
      .eq("id", seedA.viewEvidenceId);
    expect(stillOwnedByA).toHaveLength(1);
  });

  // ADR-006: stance now lives on view_evidence (per-link). RLS is row-level,
  // not column-level, so the same two-sided EXISTS policies that guard the
  // row also guard stance — no stance-specific policy exists or is needed.
  // Read side: the SELECT is filtered to empty for user B (proving the value,
  // set to "for" in the seed, is hidden, not merely null). Update side: the
  // UPDATE is a silent no-op (USING filters the row out), leaving user A's
  // stance unchanged — same shape as the view_evidence UPDATE-block test above.
  it("user B cannot read or update the stance column on user A's view_evidence row", async () => {
    const readAsB = await userB.client
      .from("view_evidence")
      .select("stance")
      .eq("id", seedA.viewEvidenceId);
    expect(readAsB.error).toBeNull();
    expect(readAsB.data).toEqual([]);

    const { data, error } = await userB.client
      .from("view_evidence")
      .update({ stance: "against" })
      .eq("id", seedA.viewEvidenceId)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: unchanged } = await userA.client
      .from("view_evidence")
      .select("stance")
      .eq("id", seedA.viewEvidenceId)
      .single();
    expect(unchanged?.stance).toBe("for");
  });

  // Re-pointing forgery via UPDATE, same shape as the view_relationships
  // relink test above but for the other two join tables: USING passes
  // (user A owns the row as it stands), so it's the new FK value that must
  // fail WITH CHECK on re-evaluation.
  it("user A cannot UPDATE their own view_topics row to re-point topic_id at user B's topic", async () => {
    const { data, error } = await userA.client
      .from("view_topics")
      .update({ topic_id: seedB.topicId })
      .eq("id", seedA.viewTopicId)
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();

    const { data: unchanged } = await userA.client
      .from("view_topics")
      .select("topic_id")
      .eq("id", seedA.viewTopicId)
      .single();
    expect(unchanged?.topic_id).toBe(seedA.topicId);
  });

  it("user A cannot UPDATE their own view_evidence row to re-point evidence_id at user B's evidence", async () => {
    const { data, error } = await userA.client
      .from("view_evidence")
      .update({ evidence_id: seedB.evidenceId })
      .eq("id", seedA.viewEvidenceId)
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();

    const { data: unchanged } = await userA.client
      .from("view_evidence")
      .select("evidence_id")
      .eq("id", seedA.viewEvidenceId)
      .single();
    expect(unchanged?.evidence_id).toBe(seedA.evidenceId);
  });

  // ADR-004: cascade must remove only the join rows, never the parent
  // entities. Uses a fresh, self-contained seed (not seedA, which other
  // tests above still depend on) so this can delete a view without
  // disturbing the rest of the suite.
  //
  // view_id/topic_id/evidence_id are all NOT NULL, so ON DELETE SET NULL
  // isn't a valid configuration here, and ON DELETE RESTRICT/NO ACTION
  // would have made the delete below fail with a foreign-key-violation
  // error instead of succeeding. A clean delete followed by an empty
  // read-back is therefore only possible if the join rows were actually
  // removed by CASCADE -- not merely hidden from userA by RLS, since RLS
  // would hide an orphaned row from its own would-be owner too (the
  // two-sided EXISTS check requires the now-deleted view to still exist).
  it("deleting a view cascades to its view_topics and view_evidence rows without touching the linked topic or evidence_items row", async () => {
    const cascadeSeed = await seedTopicAndViews(userA, { withSecondView: false });

    const { error: deleteError } = await userA.client
      .from("views")
      .delete()
      .eq("id", cascadeSeed.viewId);
    expect(deleteError).toBeNull();

    const [viewTopicAfter, viewEvidenceAfter] = await Promise.all([
      userA.client
        .from("view_topics")
        .select("id")
        .eq("id", cascadeSeed.viewTopicId),
      userA.client
        .from("view_evidence")
        .select("id")
        .eq("id", cascadeSeed.viewEvidenceId),
    ]);
    expect(viewTopicAfter.data).toEqual([]);
    expect(viewEvidenceAfter.data).toEqual([]);

    const [topicAfter, evidenceAfter] = await Promise.all([
      userA.client.from("topics").select("id").eq("id", cascadeSeed.topicId),
      userA.client
        .from("evidence_items")
        .select("id")
        .eq("id", cascadeSeed.evidenceId),
    ]);
    expect(topicAfter.data).toHaveLength(1);
    expect(evidenceAfter.data).toHaveLength(1);
  });

  // Same reasoning as the view-delete cascade test above: view_topics.topic_id
  // is NOT NULL, so a clean delete followed by an empty read-back is only
  // possible via CASCADE, not an orphaned-but-RLS-hidden row.
  it("deleting a topic cascades its view_topics rows without touching the linked view", async () => {
    const cascadeSeed = await seedTopicAndViews(userA, { withSecondView: false });

    const { error: deleteError } = await userA.client
      .from("topics")
      .delete()
      .eq("id", cascadeSeed.topicId);
    expect(deleteError).toBeNull();

    const { data: viewTopicAfter } = await userA.client
      .from("view_topics")
      .select("id")
      .eq("id", cascadeSeed.viewTopicId);
    expect(viewTopicAfter).toEqual([]);

    const { data: viewAfter } = await userA.client
      .from("views")
      .select("id")
      .eq("id", cascadeSeed.viewId);
    expect(viewAfter).toHaveLength(1);
  });

  // Same reasoning as the view-delete cascade test above: view_evidence.evidence_id
  // is NOT NULL, so a clean delete followed by an empty read-back is only
  // possible via CASCADE, not an orphaned-but-RLS-hidden row.
  it("deleting an evidence_items row cascades its view_evidence rows without touching the linked view", async () => {
    const cascadeSeed = await seedTopicAndViews(userA, { withSecondView: false });

    const { error: deleteError } = await userA.client
      .from("evidence_items")
      .delete()
      .eq("id", cascadeSeed.evidenceId);
    expect(deleteError).toBeNull();

    const { data: viewEvidenceAfter } = await userA.client
      .from("view_evidence")
      .select("id")
      .eq("id", cascadeSeed.viewEvidenceId);
    expect(viewEvidenceAfter).toEqual([]);

    const { data: viewAfter } = await userA.client
      .from("views")
      .select("id")
      .eq("id", cascadeSeed.viewId);
    expect(viewAfter).toHaveLength(1);
  });

  // ADR-006 atomic capture: create_view_evidence inserts the evidence_items
  // row and its view_evidence link inside one server-side transaction (see
  // migration 20260811154206_create_view_evidence_rpc.sql). Happy path -- a
  // valid, owned view_id creates both rows, correctly linked, with link/note
  // on the evidence and stance on the link.
  it("create_view_evidence inserts a linked evidence_items + view_evidence row for the owner", async () => {
    const { data: evidenceId, error } = await userA.client.rpc(
      "create_view_evidence",
      {
        p_view_id: seedA.viewId,
        p_link: "https://example.com/atomic-happy-path",
        p_note: "Atomic happy-path note",
        p_stance: "context",
      },
    );
    expect(error).toBeNull();
    expect(evidenceId).toBeTruthy();

    const { data: evidence } = await userA.client
      .from("evidence_items")
      .select("id, user_id, link, note")
      .eq("id", evidenceId)
      .single();
    expect(evidence?.user_id).toBe(userA.id);
    expect(evidence?.link).toBe("https://example.com/atomic-happy-path");
    expect(evidence?.note).toBe("Atomic happy-path note");

    const { data: link } = await userA.client
      .from("view_evidence")
      .select("view_id, evidence_id, stance")
      .eq("evidence_id", evidenceId)
      .single();
    expect(link?.view_id).toBe(seedA.viewId);
    expect(link?.evidence_id).toBe(evidenceId);
    expect(link?.stance).toBe("context");
  });

  // Atomicity + tenancy in one: user A calls create_view_evidence with user
  // B's view_id. The evidence_items insert would pass RLS on its own (owned
  // by A), but the view_evidence insert fails the two-sided WITH CHECK (A
  // doesn't own B's view), aborting the whole transaction. The RPC must error
  // AND leave no orphaned evidence_items row -- probed via a unique note
  // marker so a stray orphan can't hide among A's other seeded evidence rows.
  // The probe runs as user A: evidence_items is directly owned, so if an
  // orphan (user_id = A, no link) existed, A could read it back -- an empty
  // result therefore means the row was rolled back, not merely RLS-hidden.
  it("create_view_evidence rolls back the evidence_items row when the view belongs to another user", async () => {
    const orphanMarker = `orphan-probe-${randomUUID()}`;

    const { error } = await userA.client.rpc("create_view_evidence", {
      p_view_id: seedB.viewId,
      p_link: "https://example.com/should-not-persist",
      p_note: orphanMarker,
      p_stance: "for",
    });
    expect(error).not.toBeNull();

    const { data: orphans } = await userA.client
      .from("evidence_items")
      .select("id")
      .eq("note", orphanMarker);
    expect(orphans).toEqual([]);
  });
});
