/*
 * Email HTML templates. Plain inline-styled HTML (email clients ignore <style>/external
 * CSS), brand green header, minimal and mobile-safe. Kept framework-free on purpose —
 * these render inside mail clients, not the app.
 */

const BRAND_GREEN = "#1C4E3F";

function shell(heading: string, body: string): string {
  return `
  <div style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:24px 16px;">
      <div style="background:${BRAND_GREEN};border-radius:16px 16px 0 0;padding:24px;text-align:center;">
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:0.5px;">Home AI</span>
      </div>
      <div style="background:#fff;border-radius:0 0 16px 16px;padding:32px 24px;">
        <h1 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;">${heading}</h1>
        ${body}
      </div>
      <p style="text-align:center;color:#9a968c;font-size:12px;margin-top:16px;">
        Home AI — AI interior design for Bangladesh
      </p>
    </div>
  </div>`;
}

/** Password-reset email: a greeting + a big button + a fallback link + expiry note. */
export function resetPasswordEmail(url: string): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 20px;color:#4a4a4a;font-size:15px;line-height:1.6;">
      We received a request to reset your Home AI password. Click the button below to choose a
      new one. If you didn't request this, you can safely ignore this email.
    </p>
    <a href="${url}" style="display:inline-block;background:${BRAND_GREEN};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:15px;">
      Reset password
    </a>
    <p style="margin:24px 0 0;color:#9a968c;font-size:13px;line-height:1.6;">
      This link expires in 1 hour. If the button doesn't work, copy and paste this URL:<br/>
      <a href="${url}" style="color:${BRAND_GREEN};word-break:break-all;">${url}</a>
    </p>`;
  return { subject: "Reset your Home AI password", html: shell("Reset your password", body) };
}
