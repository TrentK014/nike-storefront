#!/usr/bin/env node
/**
 * Create test shopper accounts for the QA fleet in a Supabase project.
 * The storefront has no sign-up page, so accounts are created with the admin API.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/qa/create-test-shoppers.mjs [count] [out.json]
 *
 * Writes { email, password } pairs to out.json (default
 * ~/.config/qa-agent/nike-storefront-beta-shoppers.json, mode 600). Never commit it.
 * Re-running keeps existing accounts and resets their passwords.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role, not anon).");
  process.exit(1);
}
const count = Number(process.argv[2] ?? 10);
const out = process.argv[3] ?? join(homedir(), ".config", "qa-agent", "nike-storefront-beta-shoppers.json");

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: existing, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;

const shoppers = [];
for (let i = 1; i <= count; i++) {
  const email = `qa-shopper-${String(i).padStart(2, "0")}@example.com`;
  const password = randomBytes(18).toString("base64url");
  const found = existing.users.find((u) => u.email === email);
  const { error } = found
    ? await admin.auth.admin.updateUserById(found.id, { password })
    : await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  shoppers.push({ email, password });
  console.log(`${found ? "reset" : "created"} ${email}`);
}

mkdirSync(dirname(out), { recursive: true, mode: 0o700 });
writeFileSync(out, JSON.stringify({ project: url, shoppers }, null, 2), { mode: 0o600 });
console.log(`\nWrote ${shoppers.length} shoppers to ${out}`);
