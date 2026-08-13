import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_TEST_URL;
const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_TEST_URL / SUPABASE_TEST_ANON_KEY / SUPABASE_TEST_SERVICE_ROLE_KEY. " +
      "See .env.test.local (must point at a local `supabase start` instance).",
  );
}

// Same guard as the other suites: real DB, real auth users -- refuse to run
// against anything that isn't obviously local.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(SUPABASE_URL)) {
  throw new Error(
    `Refusing to run view-topics-action tests against non-local Supabase URL: ${SUPABASE_URL}`,
  );
}

const url: string = SUPABASE_URL;
const anonKey: string = ANON_KEY;
const serviceRoleKey: string = SERVICE_ROLE_KEY;

// linkTopic/unlinkTopic call createClient() from @/lib/supabase/server (request-
// scoped cookies). Mock it to hand back a real authenticated client, so the real
// action runs against local Supabase with real RLS. vi.hoisted keeps `client`
// swappable per test despite vi.mock hoisting. Same pattern as
// tests/topics-actions.test.ts.
const h = vi.hoisted(() => ({ client: null as SupabaseClient | null }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => h.client,
}));

import { linkTopic, unlinkTopic } from "@/app/views/[id]/actions";

const TEST_PASSWORD = "password-for-view-topics-action-tests-only";
const adminClient = createClient(url, serviceRoleKey);

type TestUser = { id: string; client: SupabaseClient };

async function createSignedInUser(label: string): Promise<TestUser> {
  const email = `${label}-${randomUUID()}@view-topics-action-test.local`;

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
  if (createError || !created.user) {
    throw createError ?? new Error(`Failed to create ${label}`);
  }

  const anonClient = createClient(url, anonKey);
  const { data: session, error: signInError } =
    await anonClient.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (signInError || !session.session) {
    throw signInError ?? new Error(`Failed to sign in ${label}`);
  }

  const client = createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${session.session.access_token}` },
    },
  });

  return { id: created.user.id, client };
}

async function seedView(user: TestUser, title: string): Promise<string> {
  const { data, error } = await user.client
    .from("views")
    .insert({ user_id: user.id, title })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function seedTopic(user: TestUser, name: string): Promise<string> {
  const { data, error } = await user.client
    .from("topics")
    .insert({ user_id: user.id, name })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function countLink(
  user: TestUser,
  viewId: string,
  topicId: string,
): Promise<number> {
  const { data } = await user.client
    .from("view_topics")
    .select("id")
    .eq("view_id", viewId)
    .eq("topic_id", topicId);
  return data?.length ?? 0;
}

describe("linkTopic / unlinkTopic server actions", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    userA = await createSignedInUser("user-a");
    userB = await createSignedInUser("user-b");
  });

  afterAll(async () => {
    await adminClient.auth.admin.deleteUser(userA.id);
    await adminClient.auth.admin.deleteUser(userB.id);
  });

  it("linkTopic links a view to a topic the user owns", async () => {
    h.client = userA.client;
    const viewId = await seedView(userA, "Link success view");
    const topicId = await seedTopic(userA, "Link success topic");

    const result = await linkTopic({ viewId, topicId });
    expect(result).toEqual({ ok: true });
    expect(await countLink(userA, viewId, topicId)).toBe(1);
  });

  // Load-bearing two-sided-ownership assertion: user B cannot link user A's
  // view (or topic). RLS's view_topics_owner_insert WITH CHECK requires the
  // caller to own BOTH parents, so this fails closed and writes no row.
  it("linkTopic refuses to link another user's view and writes no row", async () => {
    const viewId = await seedView(userA, "A's view for cross-tenant link");
    const topicId = await seedTopic(userB, "B's topic");

    h.client = userB.client;
    const result = await linkTopic({ viewId, topicId });
    expect(result).toEqual({ error: "Unable to link topic right now." });

    // Probe as user A (owns the view) -- an empty result means no row exists,
    // not merely that RLS hides it from B.
    expect(await countLink(userA, viewId, topicId)).toBe(0);
  });

  // Duplicate handling forced directly through the action (not via the UI's
  // unlinked-only dropdown): link the same pair twice. The unique
  // (view_id, topic_id) constraint must be caught and translated, leaving
  // exactly one row.
  it("linkTopic returns a friendly error on a duplicate link and keeps one row", async () => {
    h.client = userA.client;
    const viewId = await seedView(userA, "Duplicate link view");
    const topicId = await seedTopic(userA, "Duplicate link topic");

    const first = await linkTopic({ viewId, topicId });
    expect(first).toEqual({ ok: true });

    const second = await linkTopic({ viewId, topicId });
    expect(second).toEqual({ error: "That topic is already linked." });

    expect(await countLink(userA, viewId, topicId)).toBe(1);
  });

  it("unlinkTopic removes a link the user owns", async () => {
    h.client = userA.client;
    const viewId = await seedView(userA, "Unlink success view");
    const topicId = await seedTopic(userA, "Unlink success topic");
    await linkTopic({ viewId, topicId });
    expect(await countLink(userA, viewId, topicId)).toBe(1);

    const result = await unlinkTopic({ viewId, topicId });
    expect(result).toEqual({ ok: true });
    expect(await countLink(userA, viewId, topicId)).toBe(0);
  });

  // User B cannot delete user A's link: RLS's owner_delete USING filters the
  // row out of B's candidate set, so the delete is a zero-row no-op and A's
  // link survives.
  it("unlinkTopic cannot remove another user's link", async () => {
    h.client = userA.client;
    const viewId = await seedView(userA, "A's linked view");
    const topicId = await seedTopic(userA, "A's linked topic");
    await linkTopic({ viewId, topicId });

    h.client = userB.client;
    const result = await unlinkTopic({ viewId, topicId });
    expect(result).toEqual({ ok: true }); // no-op, not an error

    expect(await countLink(userA, viewId, topicId)).toBe(1);
  });
});
