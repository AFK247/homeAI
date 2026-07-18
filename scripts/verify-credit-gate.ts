/*
 * Integration check: the credit gate wired into the generate flow. We can't easily fire the AI
 * for real here, so we exercise the exact gate helpers the router uses (grantAnon → reserve →
 * refund) against the real DB, proving the wiring: fresh anon is granted then debited, running
 * out blocks, and a failed render refunds. Run:
 *   bun --conditions=react-server run scripts/verify-credit-gate.ts
 */
import { eq } from "drizzle-orm";
import { DEFAULT_MODEL } from "@/server/service/credit/models";
import { db } from "@/db/client";
import { creditAccounts } from "@/db/schemas/billing.schema";
import { CreditService, InsufficientCreditsError } from "@/server/service/credit/credit.service";

let fail = 0;
const ok = (label: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${pass ? "✓" : "✗"} ${label}: ${JSON.stringify(got)}${pass ? "" : ` (want ${JSON.stringify(want)})`}`);
  if (!pass) fail++;
};

const anon = `gate-${Date.now()}`;

async function main() {
  // Fresh anon → grant 10 (as reserveCredits does)
  await CreditService.grantAnon(anon);
  ok("fresh anon granted", (await CreditService.getBalance({ anonymousId: anon })).free, 10);

  // Simulate 5 free renders (free model = 2 credits each): 10 → 0
  for (let i = 1; i <= 5; i++) {
    const r = await CreditService.reserve({ anonymousId: anon }, DEFAULT_MODEL);
    ok(`render ${i} debited 2`, [r.fromFree, r.fromPaid], [2, 0]);
  }
  ok("balance after 5 renders", (await CreditService.getBalance({ anonymousId: anon })).free, 0);

  // 6th render → blocked (InsufficientCredits → router maps to FORBIDDEN no_credits)
  let blocked = false;
  try {
    await CreditService.reserve({ anonymousId: anon }, DEFAULT_MODEL);
  } catch (e) {
    blocked = e instanceof InsufficientCreditsError;
  }
  ok("6th render blocked (out of credits)", blocked, true);

  // Refund path: grant fresh, reserve, then refund (AI failure) → balance restored
  const anon2 = `gate2-${Date.now()}`;
  await CreditService.grantAnon(anon2);
  const r = await CreditService.reserve({ anonymousId: anon2 }, DEFAULT_MODEL);
  ok("after reserve", (await CreditService.getBalance({ anonymousId: anon2 })).free, 8);
  await CreditService.refund(r.accountId, r.fromFree, r.fromPaid);
  ok("after refund (render failed)", (await CreditService.getBalance({ anonymousId: anon2 })).free, 10);

  await db.delete(creditAccounts).where(eq(creditAccounts.anonymousId, anon));
  await db.delete(creditAccounts).where(eq(creditAccounts.anonymousId, anon2));
  console.log(fail === 0 ? "\n✅ GATE OK" : `\n❌ ${fail} FAILED`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
