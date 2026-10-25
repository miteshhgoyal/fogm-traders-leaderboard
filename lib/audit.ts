import { dbConnect } from "./db";
import { AuditLog } from "./models/AuditLog";

export async function logAudit(opts: {
  actor: string;
  action: string;
  target: string;
  before?: object | null;
  after?: object | null;
  ip: string;
}): Promise<void> {
  try {
    await dbConnect();
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
