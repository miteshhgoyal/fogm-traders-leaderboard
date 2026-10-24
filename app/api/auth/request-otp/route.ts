import { createHash, randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { fail, json, readJson, sameOrigin } from "@/lib/http";
import { sendOtpEmail } from "@/lib/mail";
import { OtpCode } from "@/lib/models/OtpCode";
import { clientIp, hit } from "@/lib/rate-limit";


const Body = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
const OTP_TTL_MS = 10 * 60 * 1000;

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return fail(400, "invalid_email");
  const { email } = parsed.data;

  // 3 sends / email / 15 min, 10 / IP / hour
  const [byEmail, byIp] = await Promise.all([hit(`otp:email:${email}`, 3, 15 * 60), hit(`otp:ip:${clientIp(req)}`, 10, 60 * 60)]);
  if (!byEmail.ok || !byIp.ok) return fail(429, "rate_limited", { retryAfter: Math.max(byEmail.retryAfter, byIp.retryAfter) });

  await dbConnect();
  const code = String(randomInt(100000, 1000000));
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(salt + code).digest("hex");

  await OtpCode.deleteMany({ email }); // older codes for this address die
  await OtpCode.create({ email, hash, salt, attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL_MS) });

  try {
    await sendOtpEmail(email, code);
  } catch (e) {
    await OtpCode.deleteMany({ email });
    console.error("[request-otp] mail failed:", e instanceof Error ? e.message : "unknown error"); // never the code
    return fail(502, "send_failed", { message: "We could not send the email. Please try again shortly." });
  }
  // Same response whether or not an account exists: no enumeration.
  return json({ ok: true });
}
