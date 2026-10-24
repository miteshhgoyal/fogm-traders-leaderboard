import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { fail, json, readJson, sameOrigin } from "@/lib/http";
import { OtpCode } from "@/lib/models/OtpCode";
import { User } from "@/lib/models/User";
import { clientIp, hit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(254), code: z.string().regex(/^\d{6}$/) });
const MAX_ATTEMPTS = 5;

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return fail(400, "invalid_code");
  const { email, code } = parsed.data;

  const ip = await hit(`verify:ip:${clientIp(req)}`, 30, 60 * 60);
  if (!ip.ok) return fail(429, "rate_limited", { retryAfter: ip.retryAfter });

  await dbConnect();
  const found = await OtpCode.findOne({ email });
  if (!found || found.expiresAt.getTime() <= Date.now()) {
    if (found) await OtpCode.deleteOne({ _id: found._id });
    return fail(400, "expired");
  }

  // Count the attempt BEFORE comparing, atomically, so parallel guesses cannot exceed 5.
  const doc = await OtpCode.findOneAndUpdate({ _id: found._id, attempts: { $lt: MAX_ATTEMPTS } }, { $inc: { attempts: 1 } }, { new: true });
  if (!doc) {
    await OtpCode.deleteOne({ _id: found._id });
    return fail(400, "too_many_attempts");
  }

  const expected = Buffer.from(doc.hash, "hex");
  const actual = createHash("sha256").update(doc.salt + code).digest();
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!match) {
    const attemptsLeft = MAX_ATTEMPTS - doc.attempts;
    if (attemptsLeft <= 0) {
      await OtpCode.deleteOne({ _id: doc._id }); // burned
      return fail(400, "too_many_attempts");
    }
    return fail(400, "invalid_code", { attemptsLeft });
  }

  await OtpCode.deleteOne({ _id: doc._id });
  const country = req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry");
  const user = await User.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, name: "", avatarUrl: null, publicConsent: false, profileComplete: false, country: country && country !== "XX" ? country : null } },
    { upsert: true, new: true },
  );
  if (!user) return fail(500, "server");
  await createSession({ userId: String(user._id), email: user.email });
  return json({ ok: true, profileComplete: user.profileComplete });
}
