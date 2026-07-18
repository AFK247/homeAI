import "server-only";

import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/*
 * Transactional email via Resend. One thin `sendEmail` helper the rest of the app calls —
 * password resets, verification, receipts later. FAIL-OPEN by design: if RESEND_API_KEY is
 * unset (local dev), we log the email instead of throwing, so flows that trigger an email
 * still complete. In production the key is set and mail actually sends.
 */

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  if (!resend) {
    // No key configured — don't break the calling flow; make the content visible in logs so
    // developers can still follow (e.g. copy a reset link) without a real inbox.
    logger.warn({ to, subject }, "RESEND_API_KEY unset — email not sent (dev). Content:");
    logger.warn({ html }, "email body");
    return;
  }
  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
  if (error) {
    logger.error({ err: error, to, subject }, "email send failed");
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
