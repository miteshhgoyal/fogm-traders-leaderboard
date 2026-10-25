import { requireAdmin } from "@/lib/admin-auth";
import { fail } from "@/lib/http";
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
  
  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  
  const entries = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(10000).lean();
  
  const header = "id,actor,action,target,ip,createdAt\n";
  const rows = entries
    .map((e) => [
      String(e._id),
      `"${(e.actor ?? "").replace(/"/g, '""')}"`,
      `"${(e.action ?? "").replace(/"/g, '""')}"`,
      `"${(e.target ?? "").replace(/"/g, '""')}"`,
      e.ip ?? "",
      e.createdAt ? new Date(e.createdAt).toISOString() : "",
    ].join(","))
    .join("\n");
  
  return new Response(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="fogm-audit.csv"',
      "Cache-Control": "no-store",
    },
  });
}
