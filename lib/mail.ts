import nodemailer from "nodemailer";

function transport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

function html(code: string): string {
  const digits = code
    .split("")
    .map((d) => `<td style="width:44px;height:56px;text-align:center;font:600 28px/56px Inter,Arial,sans-serif;color:#0b0b1a;background:#f3f4fb;border-radius:12px">${esc(d)}</td><td style="width:8px"></td>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f7fb;font-family:Inter,Arial,sans-serif;color:#0b0b1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:24px;border:1px solid #e4e6f2">
<tr><td style="padding:32px 32px 8px"><span style="display:inline-block;padding:6px 14px;border-radius:999px;background:linear-gradient(135deg,#4338ca,#7c5cff);color:#fff;font:600 13px Inter,Arial,sans-serif">FOGM</span></td></tr>
<tr><td style="padding:8px 32px 0;font:600 22px/1.3 Inter,Arial,sans-serif">Your verification code</td></tr>
<tr><td style="padding:8px 32px 20px;font:400 15px/1.6 Inter,Arial,sans-serif;color:#5b5e78">Enter this code to access your rank card in the FOGM Trading Championship. It expires in 10 minutes.</td></tr>
<tr><td style="padding:0 32px 24px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table></td></tr>
<tr><td style="padding:0 32px 32px;font:400 12px/1.5 Inter,Arial,sans-serif;color:#8a8da6">If you did not ask for this code, you can ignore this email. Nobody can log in without it.</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Sends the OTP email. In development with no SMTP configured the code is printed to the SERVER console only
 * (never logged otherwise, never sent to the browser).
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const t = transport();
  if (!t) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP is not configured");
    console.log(`[dev mail] OTP for ${to}: ${code}`);
    return;
  }
  await t.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: `${code} is your FOGM verification code`,
    text: `Your FOGM verification code is ${code}. It expires in 10 minutes. If you did not request it, ignore this email.`,
    html: html(code),
  });
}
