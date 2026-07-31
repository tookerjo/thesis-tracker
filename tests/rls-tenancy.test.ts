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
};

// withSecondView: user A gets a second view solely so a same-user
// view_relationships row can exist to test read-blocking on — a
// relationship needs two distinct views, and the no-self-link check
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
    .insert({ user_id: user.id, title: "View 1", hypothesis: "Hypothesis 1" })
    .select()
    .single();
  if (viewError) throw viewError;

  let secondViewId = "";
  if (opts.withSecondView) {
    const { data: view2, error: view2Error } = await user.client
      .from("views")
      .insert({ user_id: user.id, title: "View 2", hypothesis: "Hypothesis 2" })
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

  const { data: evidence, error: evidenceError } = await user.client
    .from("evidence_items")
    .insert({
      view_id: view.id,
      content: "Some evidence",
      supports_or_contradicts: "for",
    })
    .select()
    .single();
  if (evidenceError) throw evidenceError;

  return {
    topicId: topic.id,
    viewId: view.id,
    secondViewId,
    viewTopicId: viewTopic.id,
    evidenceId: evidence.id,
  };
}

async function seedViewRelationship(
  user: TestUser,
  viewIdA: string,
  viewIdB: string,
): Promise<string> {
  const { data, error } = await user.client
    .from("view_relationships")
    .insert({ view_id_a: viewIdA, view_id_b: viewIdB, relationship_type: "related" })
    .select()
    .single();
  if (error) throw error;
  return data.id as string;
}

describe("cross-tenant RLS boundaries", () => {
  let userA: TestUser;
  let userB: TestUser;
  let seedA: Seed;
  let seedB: Seed;
  let relationshipAId: string;

  beforeAll(async () => {
    userA = await createSignedInUser("user-a");
    userB = await createSignedInUser("user-b");

    seedA = await seedTopicAndViews(userA, { withSecondView: true });
    seedB = await seedTopicAndViews(userB, { withSecondView: false });

    relationshipAId = await seedViewRelationship(
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
  it("user A can read their own topic, view, and evidence", async () => {
    const [topic, view, evidence] = await Promise.all([
      userA.client.from("topics").select("*").eq("id", seedA.topicId),
      userA.client.from("views").select("*").eq("id", seedA.viewId),
      userA.client.from("evidence_items").select("*").eq("id", seedA.evidenceId),
    ]);
    expect(topic.data).toHaveLength(1);
    expect(view.data).toHaveLength(1);
    expect(evidence.data).toHaveLength(1);
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
      .eq("id", relationshipAId);
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

  it("user A cannot create a view_relationships row linking to user B's view", async () => {
    const { data, error } = await userA.client
      .from("view_relationships")
      .insert({
        view_id_a: seedA.viewId,
        view_id_b: seedB.viewId,
        relationship_type: "related",
      })
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

  it("user A cannot insert an evidence_items row against user B's view", async () => {
    const { data, error } = await userA.client
      .from("evidence_items")
      .insert({
        view_id: seedB.viewId,
        content: "Evidence attempting cross-tenant link",
        supports_or_contradicts: "for",
      })
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
      .eq("id", relationshipAId);
    expect(error).toBeNull();

    const { data } = await userA.client
      .from("view_relationships")
      .select("id")
      .eq("id", relationshipAId);
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

  // Distinct from the existing INSERT-relink test above: this confirms
  // WITH CHECK is re-evaluated on UPDATE too, not just enforced once at row
  // creation. USING passes here (user A owns the row as it stands) — it's
  // the new view_id_b value that must fail WITH CHECK. Verified via user
  // A's own client for the same service_role-grant reason noted above.
  it("user A cannot UPDATE a view_relationships row to relink view_id_b to user B's view", async () => {
    const { data, error } = await userA.client
      .from("view_relationships")
      .update({ view_id_b: seedB.viewId })
      .eq("id", relationshipAId)
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();

    const { data: unchanged } = await userA.client
      .from("view_relationships")
      .select("view_id_b")
      .eq("id", relationshipAId)
      .single();
    expect(unchanged?.view_id_b).toBe(seedA.secondViewId);
  });
});
