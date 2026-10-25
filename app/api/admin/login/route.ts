import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { fail, json, readJson, sameOrigin } from "@/lib/http";
import { createAdminSession, isAdminConfigured, adminClientIp } from "@/lib/admin-auth";
import { dbConnect } from "@/lib/db";
import { RateLimit } from "@/lib/models/RateLimit";

const Body = z.object({
  email: z.string().email().max(254),
  password: z.string().max(200),
});

const FAIL_DELAY_MS = 500;
const MAX_PER_15_MIN = 5;
const MAX_PER_DAY = 10;

async function checkRateLimit(ip: string): Promise<{ ok: boolean; retryAfter: number }> {
  await dbConnect();
  const now = new Date();
  
  const key15m = `admin_login:15m:${ip}`;
  const key1d = `admin_login:1d:${ip}`;
  
  const [rec15m, rec1d] = await Promise.all([
    RateLimit.findOne({ key: key15m }),
    RateLimit.findOne({ key: key1d }),
  ]);
  
  if (rec15m && rec15m.count >= MAX_PER_15_MIN && rec15m.resetAt > now) {
    return { ok: false, retryAfter: Math.ceil((rec15m.resetAt.getTime() - now.getTime()) / 1000) };
  }
  if (rec1d && rec1d.count >= MAX_PER_DAY && rec1d.resetAt > now) {
    return { ok: false, retryAfter: Math.ceil((rec1d.resetAt.getTime() - now.getTime()) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

async function recordFailure(ip: string): Promise<void> {
  await dbConnect();
  const now = new Date();
  const reset15m = new Date(now.getTime() + 15 * 60 * 1000);
  const reset1d = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  await Promise.all([
    RateLimit.findOneAndUpdate(
      { key: `admin_login:15m:${ip}` },
      { $inc: { count: 1 }, $setOnInsert: { resetAt: reset15m } },
      { upsert: true, new: true }
    ),
    RateLimit.findOneAndUpdate(
      { key: `admin_login:1d:${ip}` },
      { $inc: { count: 1 }, $setOnInsert: { resetAt: reset1d } },
      { upsert: true, new: true }
    ),
  ]);
}

function sha256(s: string): Buffer {
  return createHash("sha256").update(s).digest();
}

// Constant-length comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  // Pad to same length using sha256 of each, so timingSafeEqual always gets equal-length buffers
  const ha = sha256(a);
  const hb = sha256(b);
  return timingSafeEqual(ha, hb);
}

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  
  if (!isAdminConfigured()) {
    return fail(503, "admin_not_configured", { message: "Admin is not configured on this server." });
  }
  
  const ip = adminClientIp(req);
  const rl = await checkRateLimit(ip);
  if (!rl.ok) {
    return fail(429, "rate_limited", { message: `Too many attempts. Try again in ${Math.ceil(rl.retryAfter / 60)} min.`, retryAfter: rl.retryAfter });
  }
  
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) {
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
    return fail(400, "invalid_credentials", { message: "Invalid credentials." });
  }
  
  const { email, password } = parsed.data;
  const envEmail = process.env.ADMIN_EMAIL ?? "";
  const envPass = process.env.ADMIN_PASSWORD ?? "";
  
  // ALWAYS run both comparisons (same code path for wrong email or wrong password)
  const emailOk = safeCompare(email, envEmail);
  const passOk = safeCompare(password, envPass);
  
  if (!emailOk || !passOk) {
    await recordFailure(ip);
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
    return fail(401, "invalid_credentials", { message: "Invalid credentials." });
  }
  
  await createAdminSession();
  return json({ ok: true });
}
