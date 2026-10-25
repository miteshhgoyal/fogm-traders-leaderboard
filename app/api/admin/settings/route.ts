import { requireAdmin, adminClientIp } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { fail, json, readJson, sameOrigin } from "@/lib/http";
import { dbConnect } from "@/lib/db";
import { SiteSettings } from "@/lib/models/SiteSettings";

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  await dbConnect();
  const settings = await SiteSettings.findOne({ key: "main" }).lean();
  return json(settings ?? {});
}

export async function PATCH(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  const body = await readJson(req);
  if (!body || typeof body !== "object") return fail(400, "invalid_input");
  
  await dbConnect();
  const before = await SiteSettings.findOne({ key: "main" }).lean();
  
  // Never allow writing admin credentials fields
  const safe = { ...(body as Record<string, unknown>) };
  delete safe.key;
  
  const updated = await SiteSettings.findOneAndUpdate(
    { key: "main" },
    { $set: { ...safe, updatedAt: new Date() } },
    { upsert: true, new: true }
  );
  
  await logAudit({ actor: admin.email, action: "update_settings", target: "settings:main", before, after: safe, ip: adminClientIp(req) });
  
  // Invalidate the settings cache tag
  try {
    const { revalidateTag } = await import("next/cache");
    revalidateTag("settings", "max");
  } catch {
    /* cache not available in this context */
  }
  
  return json({ ok: true, settings: updated });
}
