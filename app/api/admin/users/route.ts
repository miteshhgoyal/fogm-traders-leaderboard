import { z } from "zod";
import { requireAdmin, adminClientIp } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { fail, json, readJson, sameOrigin } from "@/lib/http";
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
  const profileComplete = url.searchParams.get("profileComplete");
  const country = url.searchParams.get("country");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get("pageSize") ?? "25")));
  const sortField = url.searchParams.get("sortField") ?? "createdAt";
  const sortDir = url.searchParams.get("sortDir") === "asc" ? 1 : -1;
  
  const showName = url.searchParams.get("showName");
  const showPhoto = url.searchParams.get("showPhoto");

  const filter: Record<string, unknown> = {};
  if (search.trim()) {
    const safeRegex = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: safeRegex, $options: "i" } },
      { email: { $regex: safeRegex, $options: "i" } },
    ];
  }
  if (status === "active" || status === "disabled") filter.status = status;
  if (profileComplete === "true") filter.profileComplete = true;
  if (profileComplete === "false") filter.profileComplete = false;
  if (showName === "true") filter.showName = true;
  if (showName === "false") filter.showName = false;
  if (showPhoto === "true") filter.showPhoto = true;
  if (showPhoto === "false") filter.showPhoto = false;
  if (country) filter.country = country;
  
  const allowedSortFields = ["createdAt", "lastLoginAt", "loginCount", "name", "email", "country", "status"];
  const sortKey = allowedSortFields.includes(sortField) ? sortField : "createdAt";
  
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ [sortKey]: sortDir })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);
  
  return json({
    total,
    page,
    pageSize,
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      country: u.country,
      status: u.status,
      profileComplete: u.profileComplete,
      showName: u.showName,
      showPhoto: u.showPhoto,
      loginCount: u.loginCount,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    })),
  });
}

const PatchSchema = z.object({
  userId: z.string(),
  name: z.string().trim().min(2).max(30).optional(),
  country: z.string().max(2).optional(),
  showName: z.boolean().optional(),
  showPhoto: z.boolean().optional(),
  status: z.enum(["active", "disabled"]).optional(),
  forceSignOut: z.boolean().optional(),
});

export async function PATCH(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  const parsed = PatchSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(400, "invalid_input");
  
  const { userId, name, country, showName, showPhoto, status, forceSignOut } = parsed.data;
  
  await dbConnect();
  const before = await User.findById(userId).lean();
  if (!before) return fail(404, "not_found");
  
  const set: Record<string, unknown> = {};
  if (name !== undefined) set.name = name;
  if (country !== undefined) set.country = country;
  if (showName !== undefined) set.showName = showName;
  if (showPhoto !== undefined) set.showPhoto = showPhoto;
  if (status !== undefined) set.status = status;
  if (forceSignOut) set.sessionVersion = (before.sessionVersion ?? 0) + 1;
  
  await User.findByIdAndUpdate(userId, { $set: set });
  
  await logAudit({
    actor: admin.email,
    action: forceSignOut ? "force_sign_out" : "edit_user",
    target: `user:${userId}`,
    before: { name: before.name, status: before.status, showName: before.showName, showPhoto: before.showPhoto },
    after: set,
    ip: adminClientIp(req),
  });
  
  return json({ ok: true });
}

export async function DELETE(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return fail(400, "missing_userId");
  
  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) return fail(404, "not_found");
  
  await User.findByIdAndDelete(userId);
  
  await logAudit({
    actor: admin.email,
    action: "delete_user",
    target: `user:${userId}`,
    before: { email: user.email, name: user.name },
    after: null,
    ip: adminClientIp(req),
  });
  
  return json({ ok: true });
}
