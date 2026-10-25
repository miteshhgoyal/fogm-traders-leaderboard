import { requireAdmin } from "@/lib/admin-auth";
import { fail } from "@/lib/http";
import { dbConnect } from "@/lib/db";
import { AuditLog } from "@/lib/models/AuditLog";

function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Prevent CSV formula injection by prefixing = + - @ or control chars
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

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

  const filter: Record<string, unknown> = {};
  if (action && action !== "all") filter.action = action;
  if (from || to) {
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    filter.createdAt = dateFilter;
  }

  const entries = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(10000).lean();

  const header = "id,actor,action,target,ip,createdAt\n";
  const rows = entries
    .map((e) =>
      [
        sanitizeCsvCell(String(e._id)),
        sanitizeCsvCell(e.actor),
        sanitizeCsvCell(e.action),
        sanitizeCsvCell(e.target),
        sanitizeCsvCell(e.ip),
        sanitizeCsvCell(e.createdAt ? new Date(e.createdAt).toISOString() : ""),
      ].join(",")
    )
    .join("\n");

  return new Response(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fogm-audit.csv"',
      "Cache-Control": "no-store",
    },
  });
}
