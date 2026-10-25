import { dbConnect } from "./db";
import { RateLimit } from "./models/RateLimit";

export interface HitResult {
  ok: boolean;
  /** Seconds until the window resets (only meaningful when ok is false). */
  retryAfter: number;
}

/**
 * Fixed-window counter in Mongo. `hit` increments atomically, so concurrent requests cannot slip past the limit.
 */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<HitResult> {
  await dbConnect();
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  // The TTL monitor runs about once a minute, so an expired window can linger: start a fresh one.
  await RateLimit.updateOne({ key, resetAt: { $lte: now } }, { $set: { count: 0, resetAt } });

  const run = () =>
    RateLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { resetAt } },
      { upsert: true, new: true },
    );
  let doc;
  try {
    doc = await run();
  } catch (e) {
    // two first-ever requests can race on the unique index: the loser just retries as an update
    if (typeof e === "object" && e !== null && (e as { code?: number }).code === 11000) doc = await run();
    else throw e;
  }
  if (!doc) return { ok: true, retryAfter: 0 };
  return { ok: doc.count <= limit, retryAfter: Math.max(1, Math.ceil((doc.resetAt.getTime() - now.getTime()) / 1000)) };
}

/** Best-effort client IP. Only trust x-forwarded-for when you sit behind a proxy you control. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() ?? "127.0.0.1";
}
