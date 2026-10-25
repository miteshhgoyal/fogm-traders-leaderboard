import { requireAdmin } from "@/lib/admin-auth";
import { fail } from "@/lib/http";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/User";

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
  const search = url.searchParams.get("search")?.trim() ?? "";
  const status = url.searchParams.get("status");

  const filter: Record<string, unknown> = {};
  if (search) {
    const safeRegex = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: safeRegex, $options: "i" } },
      { email: { $regex: safeRegex, $options: "i" } },
    ];
  }
  if (status === "active" || status === "disabled") filter.status = status;

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(50000).lean();

  const header = "id,name,email,country,status,profileComplete,showName,showPhoto,loginCount,lastLoginAt,createdAt\n";
  const rows = users
    .map((u) =>
      [
        sanitizeCsvCell(String(u._id)),
        sanitizeCsvCell(u.name),
        sanitizeCsvCell(u.email),
        sanitizeCsvCell(u.country ?? ""),
        sanitizeCsvCell(u.status ?? "active"),
        sanitizeCsvCell(u.profileComplete ? "true" : "false"),
        sanitizeCsvCell(u.showName ? "true" : "false"),
        sanitizeCsvCell(u.showPhoto ? "true" : "false"),
        sanitizeCsvCell(u.loginCount ?? 0),
        sanitizeCsvCell(u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : ""),
        sanitizeCsvCell(u.createdAt ? new Date(u.createdAt).toISOString() : ""),
      ].join(",")
    )
    .join("\n");

  return new Response(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fogm-users.csv"',
      "Cache-Control": "no-store",
    },
  });
}
