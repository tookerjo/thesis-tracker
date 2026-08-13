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

// Same guard as rls-tenancy.test.ts: this exercises the real actions against a
// real database with real auth users, so refuse to run against anything that
// isn't an obviously-local Supabase instance.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(SUPABASE_URL)) {
  throw new Error(
    `Refusing to run topics-action tests against non-local Supabase URL: ${SUPABASE_URL}`,
  );
}

// Narrowed to string after the guards above; re-bound so createSignedInUser
// (a nested closure, where TS doesn't carry the module-level narrowing) can use
// them without a non-null assertion.
const url: string = SUPABASE_URL;
const anonKey: string = ANON_KEY;
const serviceRoleKey: string = SERVICE_ROLE_KEY;

// The actions call createClient() from @/lib/supabase/server, which reads
// next/headers cookies() -- request-scoped, unusable outside a Next request.
// Mock it so createClient() hands back a real, authenticated supabase-js client
// (built below exactly like rls-tenancy.test.ts builds its user clients). The
// rest of each action then runs for real: auth.getUser() hits the real auth
// endpoint, and the topics write goes through real RLS.
//
// vi.hoisted keeps `client` mutable despite vi.mock being hoisted above the
// module body -- each test points it at userA or userB before calling the action.
const h = vi.hoisted(() => ({ client: null as SupabaseClient | null }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => h.client,
}));

import { createTopic } from "@/app/topics/new/actions";
import { updateTopic } from "@/app/topics/[id]/edit/actions";

const TEST_PASSWORD = "password-for-topics-action-tests-only";
const adminClient = createClient(url, serviceRoleKey);

type TestUser = { id: string; client: SupabaseClient };

async function createSignedInUser(label: string): Promise<TestUser> {
  const email = `${label}-${randomUUID()}@topics-action-test.local`;

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

describe("createTopic / updateTopic server actions", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    userA = await createSignedInUser("user-a");
    userB = await createSignedInUser("user-b");
  });

  afterAll(async () => {
    // Deleting the auth users cascades through topics via ON DELETE CASCADE.
    await adminClient.auth.admin.deleteUser(userA.id);
    await adminClient.auth.admin.deleteUser(userB.id);
  });

  // --- createTopic ---------------------------------------------------------

  it("createTopic creates a topic owned by the session user with name + framing_note", async () => {
    h.client = userA.client;
    const name = `Create success ${randomUUID()}`;

    const result = await createTopic({ name, framingNote: "why it matters" });
    expect(result).toHaveProperty("id");
    const id = (result as { id: string }).id;

    const { data: row } = await userA.client
      .from("topics")
      .select("user_id, name, framing_note")
      .eq("id", id)
      .single();
    expect(row?.user_id).toBe(userA.id);
    expect(row?.name).toBe(name);
    expect(row?.framing_note).toBe("why it matters");
  });

  it("createTopic stores a whitespace-only framingNote as null", async () => {
    h.client = userA.client;
    const name = `Create blank framing ${randomUUID()}`;

    const result = await createTopic({ name, framingNote: "   " });
    const id = (result as { id: string }).id;

    const { data: row } = await userA.client
      .from("topics")
      .select("framing_note")
      .eq("id", id)
      .single();
    expect(row?.framing_note).toBeNull();
  });

  it("createTopic rejects a blank name and writes no row", async () => {
    h.client = userA.client;
    const marker = `blank-name-probe-${randomUUID()}`;

    const result = await createTopic({ name: "   ", framingNote: marker });
    expect(result).toEqual({ error: "Topic name is required." });

    // framing_note carried the unique marker; if a row had been written despite
    // the blank name, it would show up here.
    const { data: rows } = await userA.client
      .from("topics")
      .select("id")
      .eq("framing_note", marker);
    expect(rows).toEqual([]);
  });

  // No cross-tenant case for createTopic: it takes no user_id input -- ownership
  // is always the session user derived from auth.uid() -- so there is no forgery
  // surface to test here. The forge-a-user_id case lives at the DB layer in
  // rls-tenancy.test.ts ("user A cannot insert a topics row using user B's user_id").

  // --- updateTopic ---------------------------------------------------------

  it("updateTopic updates name and framing_note on an owned topic", async () => {
    h.client = userA.client;
    const { data: seed } = await userA.client
      .from("topics")
      .insert({ user_id: userA.id, name: "Before", framing_note: "before note" })
      .select("id")
      .single();
    const id = seed!.id as string;

    const result = await updateTopic({
      id,
      name: "Renamed",
      framingNote: "updated note",
    });
    expect(result).toEqual({ id });

    const { data: row } = await userA.client
      .from("topics")
      .select("name, framing_note")
      .eq("id", id)
      .single();
    expect(row?.name).toBe("Renamed");
    expect(row?.framing_note).toBe("updated note");
  });

  it("updateTopic clears framing_note when given whitespace", async () => {
    h.client = userA.client;
    const { data: seed } = await userA.client
      .from("topics")
      .insert({ user_id: userA.id, name: "Has note", framing_note: "some note" })
      .select("id")
      .single();
    const id = seed!.id as string;

    await updateTopic({ id, name: "Has note", framingNote: "   " });

    const { data: row } = await userA.client
      .from("topics")
      .select("framing_note")
      .eq("id", id)
      .single();
    expect(row?.framing_note).toBeNull();
  });

  // Core CLAUDE.md #2 app-layer assertion: updateTopic re-derives user_id from
  // the session and scopes the update with .eq("user_id", user.id), so user B
  // updating user A's topic matches zero rows and fails closed -- independent of
  // the DB-layer RLS coverage in rls-tenancy.test.ts.
  it("updateTopic refuses to update another user's topic and leaves it unchanged", async () => {
    h.client = userA.client;
    const { data: seed } = await userA.client
      .from("topics")
      .insert({ user_id: userA.id, name: "Owned by A", framing_note: "A's note" })
      .select("id")
      .single();
    const id = seed!.id as string;

    h.client = userB.client;
    const result = await updateTopic({
      id,
      name: "hijacked by B",
      framingNote: "B's note",
    });
    expect(result).toEqual({ error: "Unable to update topic right now." });

    const { data: row } = await userA.client
      .from("topics")
      .select("name, framing_note")
      .eq("id", id)
      .single();
    expect(row?.name).toBe("Owned by A");
    expect(row?.framing_note).toBe("A's note");
  });

  it("updateTopic rejects a blank name and leaves the row unchanged", async () => {
    h.client = userA.client;
    const { data: seed } = await userA.client
      .from("topics")
      .insert({ user_id: userA.id, name: "Keep me", framing_note: "keep note" })
      .select("id")
      .single();
    const id = seed!.id as string;

    const result = await updateTopic({ id, name: "   ", framingNote: "changed" });
    expect(result).toEqual({ error: "Topic name is required." });

    const { data: row } = await userA.client
      .from("topics")
      .select("name, framing_note")
      .eq("id", id)
      .single();
    expect(row?.name).toBe("Keep me");
    expect(row?.framing_note).toBe("keep note");
  });
});
