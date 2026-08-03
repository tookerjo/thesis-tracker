// Creates one persistent, reusable test user for manually exercising the
// /dev-login route against a local `supabase start` instance. Idempotent --
// safe to re-run.
//
// Credentials (local-only, meaningless outside your own Docker Postgres --
// same reasoning as tests/rls-tenancy.test.ts's hardcoded TEST_PASSWORD):
//   email:    dev@thesis-tracker.local
//   password: dev-login-local-only
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.test.local", quiet: true });

const SUPABASE_URL = process.env.SUPABASE_TEST_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_ROLE_KEY. " +
      "See .env.test.local (must point at a local `supabase start` instance).",
  );
}

// Same local-only guard as tests/rls-tenancy.test.ts -- this uses the
// service role key, so refuse anything that isn't obviously local.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(SUPABASE_URL)) {
  throw new Error(
    `Refusing to seed a dev user against non-local Supabase URL: ${SUPABASE_URL}`,
  );
}

const DEV_USER_EMAIL = "dev@thesis-tracker.local";
const DEV_USER_PASSWORD = "dev-login-local-only";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: existing, error: listError } =
    await admin.auth.admin.listUsers();
  if (listError) throw listError;

  const alreadyExists = existing.users.some(
    (user) => user.email === DEV_USER_EMAIL,
  );
  if (alreadyExists) {
    console.log(`Dev user already exists: ${DEV_USER_EMAIL}`);
    return;
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email: DEV_USER_EMAIL,
    password: DEV_USER_PASSWORD,
    email_confirm: true,
  });
  if (createError) throw createError;

  console.log(`Created dev user: ${DEV_USER_EMAIL} / ${DEV_USER_PASSWORD}`);
}

main();
