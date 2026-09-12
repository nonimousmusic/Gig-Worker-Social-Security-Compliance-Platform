/**
 * Creates the demo login user (compliance@quickmove.in) and attaches their
 * profile to the seeded QuickMove organization.
 *
 * Usage:
 *  	node scripts/seed-demo-user.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (reads
 * .env.local then .env).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function loadEnv() {
  const env = {};
  for (const file of [join(root, ".env.local"), join(root, ".env")]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";
const EMAIL = env.DEMO_EMAIL || "compliance@quickmove.in";
const PASSWORD = env.DEMO_PASSWORD || "Compliance@2025";
const FULL_NAME = "Arjun Verma (Compliance Officer)";

// 1. Find or create the auth user.
const { data: page } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
let userId = page?.users?.find((u) => u.email === EMAIL)?.id;

if (!userId) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: FULL_NAME },
  });
  if (error) {
    console.error("createUser failed:", error.message);
    process.exit(1);
  }
  userId = data.user.id;
}

// 2. Attach the profile to the demo organization.
const { error: profileError } = await supabase.from("profiles").upsert(
  {
    id: userId,
    organization_id: DEMO_ORG_ID,
    email: EMAIL,
    full_name: FULL_NAME,
    role: "ORG_ADMIN",
    is_email_verified: true,
  },
  { onConflict: "id" }
);

if (profileError) {
  console.error("profile upsert failed:", profileError.message);
  process.exit(1);
}

console.log("Demo user ready:");
console.log(`  Email:    ${EMAIL}`);
console.log(`  Password: ${PASSWORD}`);
console.log(`  Org:      ${DEMO_ORG_ID}`);