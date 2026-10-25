import { dbConnect } from "./db";
import { AuditLog } from "./models/AuditLog";

interface AuditOpts {
  actor: string;
  action: string;
  target: string;
  before?: object | null;
  after?: object | null;
  ip: string;
}

// In-memory deduplication window (2 seconds)
const recentLogs = new Map<string, number>();

function pruneRecent() {
  const now = Date.now();
  for (const [key, time] of recentLogs.entries()) {
    if (now - time > 5000) recentLogs.delete(key);
  }
}

export async function logAudit(opts: AuditOpts): Promise<void> {
  try {
    pruneRecent();
    const payloadStr = opts.after ? JSON.stringify(opts.after) : "";
    const dedupKey = `${opts.action}::${opts.target}::${payloadStr}`;
    const now = Date.now();

    const last = recentLogs.get(dedupKey);
    if (last && now - last < 2000) {
      return; // Skip duplicate log within 2 seconds
    }
    recentLogs.set(dedupKey, now);

    await dbConnect();

    // Secondary DB-level check within 2000ms for multi-instance deployments
    const twoSecAgo = new Date(now - 2000);
    const existing = await AuditLog.findOne({
      action: opts.action,
      target: opts.target,
      createdAt: { $gte: twoSecAgo },
    }).lean();

    if (existing) {
      const existingAfter = existing.after ? JSON.stringify(existing.after) : "";
      if (existingAfter === payloadStr) {
        return;
      }
    }

    await AuditLog.create({
      actor: opts.actor,
      action: opts.action,
      target: opts.target,
      before: opts.before ?? null,
      after: opts.after ?? null,
      ip: opts.ip,
    });
  } catch {
    // Audit failure must never break the main operation
  }
}
