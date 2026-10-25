import { requireAdmin } from "@/lib/admin-auth";
import { fail, json, sameOrigin } from "@/lib/http";
import nodemailer from "nodemailer";

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  const host = process.env.SMTP_HOST;
  if (!host) return fail(503, "smtp_not_configured", { message: "SMTP is not configured. Set SMTP_HOST in your environment." });
  
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
  
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: admin.email, // Only send to the env admin email
      subject: "FOGM Admin: Test email",
      text: "This is a test email from the FOGM admin panel. If you receive this, your email configuration is working correctly.",
    });
  } catch (e) {
    return fail(502, "send_failed", { message: e instanceof Error ? e.message : "Failed to send email." });
  }
  
  return json({ ok: true });
}
