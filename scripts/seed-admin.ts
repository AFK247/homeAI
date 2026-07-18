/*
 * Seed the first admin account from env (ADMIN_EMAIL / ADMIN_PASSWORD).
 *
 *   bun run db:seed:admin
 *   (expands to: bun --conditions=react-server run scripts/seed-admin.ts)
 *
 * IDEMPOTENT — safe to run repeatedly:
 *   - no such user   → creates it via Better Auth (correct scrypt password hash), then role=admin
 *   - user exists    → just ensures role=admin (password untouched)
 *
 * We go through auth.api.signUpEmail rather than inserting rows directly so the password is
 * hashed exactly the way Better Auth's sign-in expects — never hand-roll the credential hash.
 * Requires --conditions=react-server because it imports the server-only auth + db modules.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schemas/auth.schema";
import { auth } from "@/lib/auth/auth";
import { env } from "@/lib/env";

async function main() {
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env to seed an admin.",
    );
    process.exit(1);
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    if (existing.role === "admin") {
      console.log(`✓ Admin already exists: ${email} (role=admin) — nothing to do.`);
      return;
    }
    await db.update(users).set({ role: "admin" }).where(eq(users.id, existing.id));
    console.log(`✓ Promoted existing user to admin: ${email}`);
    return;
  }

  // Create the account through Better Auth so the password hash is in its native format.
  const result = await auth.api.signUpEmail({
    body: { email, password, name: "Admin" },
  });

  if (!result?.user?.id) {
    console.error("❌ Failed to create admin user via Better Auth.");
    process.exit(1);
  }

  await db.update(users).set({ role: "admin" }).where(eq(users.id, result.user.id));
  console.log(`✓ Created admin: ${email} (role=admin)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Admin seed failed:", err);
    process.exit(1);
  });
