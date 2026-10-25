import { requireAdmin } from "@/lib/admin-auth";
import { fail, json } from "@/lib/http";
import { dbConnect } from "@/lib/db";
import { AuditLog } from "@/lib/models/AuditLog";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  await dbConnect();
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get("pageSize") ?? "25")));
  
  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (from || to) {
    filter.createdAt = {};
    if (from) (filter.createdAt as Record<string, unknown>).$gte = new Date(from);
    if (to) (filter.createdAt as Record<string, unknown>).$lte = new Date(to);
  }
  
  const [total, entries] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
  ]);
  
  return json({
    total,
    page,
    pageSize,
    entries: entries.map((e) => ({ id: String(e._id), actor: e.actor, action: e.action, target: e.target, before: e.before, after: e.after, ip: e.ip, createdAt: e.createdAt })),
  });
}
