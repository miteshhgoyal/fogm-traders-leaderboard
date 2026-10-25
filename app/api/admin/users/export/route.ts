import { requireAdmin } from "@/lib/admin-auth";
import { fail } from "@/lib/http";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/User";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  await dbConnect();
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? "";
  const status = url.searchParams.get("status");
  
  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (status === "active" || status === "disabled") filter.status = status;
  
  const users = await User.find(filter).limit(50000).lean();
  
  const header = "id,name,email,country,status,profileComplete,showName,showPhoto,loginCount,lastLoginAt,createdAt\n";
  const rows = users
    .map((u) =>
      [
        String(u._id),
        `"${(u.name ?? "").replace(/"/g, '""')}"`,
        `"${(u.email ?? "").replace(/"/g, '""')}"`,
        u.country ?? "",
        u.status ?? "active",
        u.profileComplete ? "true" : "false",
        u.showName ? "true" : "false",
        u.showPhoto ? "true" : "false",
        u.loginCount ?? 0,
        u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : "",
        u.createdAt ? new Date(u.createdAt).toISOString() : "",
      ].join(",")
    )
    .join("\n");
  
  return new Response(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="fogm-users.csv"',
      "Cache-Control": "no-store",
    },
  });
}
