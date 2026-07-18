/*
 * Phase-1 credit-system verification (docs/CREDIT_SYSTEM.md). Exercises the full ledger
 * lifecycle against the real DB and asserts every balance transition. Run:
 *   bun --conditions=react-server run scripts/verify-credits.ts
 * Cleans up its own test rows at the end.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schemas/auth.schema";
import { creditAccounts } from "@/db/schemas/billing.schema";
import { CreditService, InsufficientCreditsError } from "@/server/service/credit/credit.service";

let failures = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "✓" : "✗"} ${label}: got ${JSON.stringify(got)}${ok ? "" : ` want ${JSON.stringify(want)}`}`);
  if (!ok) failures++;
}

const ts = Date.now();
const anonId = `verif-anon-${ts}`;
const userId = `verif-user-${ts}`;

async function main() {
  // Real user row (FK target) — cleaned up at the end.
  await db.insert(users).values({
    id: userId,
    name: "Verify",
    email: `${userId}@verify.local`,
    emailVerified: false,
  });

  // 1. Anon grant → 10 free
  await CreditService.grantAnon(anonId);
  check("anon grant", await CreditService.getBalance({ anonymousId: anonId }), {
    free: 10,
    paid: 0,
    total: 10,
  });

  // 2. Anon grant is idempotent (no second grant)
  await CreditService.grantAnon(anonId);
  check("anon grant idempotent", (await CreditService.getBalance({ anonymousId: anonId })).free, 10);

  // 3. Free-model reserve (cost 2) debits free bucket
  const r1 = await CreditService.reserve({ anonymousId: anonId }, "cf-flux-klein");
  check("free reserve fromFree/fromPaid", [r1.fromFree, r1.fromPaid], [2, 0]);
  check("after free reserve", (await CreditService.getBalance({ anonymousId: anonId })).free, 8);

  // 4. Premium reserve for anon → InsufficientCredits (no paid credits)
  let premiumBlocked = false;
  try {
    await CreditService.reserve({ anonymousId: anonId }, "gemini-nano-banana");
  } catch (e) {
    premiumBlocked = e instanceof InsufficientCreditsError;
  }
  check("premium blocked for free-only user", premiumBlocked, true);

  // 5. Signup grant → SET to 70 free (replaces whatever the user account had: none here)
  await CreditService.grantSignup(userId);
  check("signup grant", await CreditService.getBalance({ userId }), {
    free: 70,
    paid: 0,
    total: 70,
  });

  // 6. Signup grant once-per-account (no double)
  await CreditService.grantSignup(userId);
  check("signup grant once", (await CreditService.getBalance({ userId })).free, 70);

  // 7. Purchase → REPLACE: 70 free wiped, set to 1200 paid
  await CreditService.grantPurchase(userId, 1200, `pay-${ts}`);
  check("purchase replaces balance", await CreditService.getBalance({ userId }), {
    free: 0,
    paid: 1200,
    total: 1200,
  });

  // 8. Premium reserve now works (cost 40, paid bucket)
  const r2 = await CreditService.reserve({ userId }, "gemini-nano-banana");
  check("premium reserve fromPaid", [r2.fromFree, r2.fromPaid], [0, 40]);
  check("after premium reserve", (await CreditService.getBalance({ userId })).paid, 1160);

  // 9. Refund the premium reserve (AI failure path) → back to 1200
  await CreditService.refund(r2.accountId, r2.fromFree, r2.fromPaid, "gemini-nano-banana");
  check("after refund", (await CreditService.getBalance({ userId })).paid, 1200);

  // 10. Ledger completeness — assert the SET of reasons (order within a same-timestamp txn is
  // non-deterministic, so compare sorted, not sequence).
  const hist = await CreditService.history({ userId });
  check("user ledger reasons (sorted set)", [...new Set(hist.map((h) => h.reason))].sort(), [
    "expire", // wipe of the 70 free on purchase
    "generation",
    "purchase",
    "refund",
    "signup_grant",
  ]);
  check("user ledger row count", hist.length, 5);

  // cleanup
  await db.delete(creditAccounts).where(eq(creditAccounts.userId, userId));
  await db.delete(creditAccounts).where(eq(creditAccounts.anonymousId, anonId));
  await db.delete(users).where(eq(users.id, userId));

  console.log(failures === 0 ? "\n✅ ALL PASS" : `\n❌ ${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify crashed:", e);
  process.exit(1);
});
