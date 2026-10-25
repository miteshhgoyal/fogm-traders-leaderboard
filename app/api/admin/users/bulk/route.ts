import { z } from "zod";
import { requireAdmin, adminClientIp } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { fail, json, readJson, sameOrigin } from "@/lib/http";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/User";

const BulkSchema = z.object({
  action: z.enum(["disable", "enable", "force_sign_out", "delete"]),
  userIds: z.array(z.string()).min(1).max(500),
});

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  const parsed = BulkSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(400, "invalid_input");
  
  const { action, userIds } = parsed.data;
  await dbConnect();
  
  let result: { modifiedCount?: number; deletedCount?: number } = {};
  
  if (action === "disable") {
    result = await User.updateMany({ _id: { $in: userIds } }, { $set: { status: "disabled" } });
  } else if (action === "enable") {
    result = await User.updateMany({ _id: { $in: userIds } }, { $set: { status: "active" } });
  } else if (action === "force_sign_out") {
    result = await User.updateMany({ _id: { $in: userIds } }, { $inc: { sessionVersion: 1 } });
  } else if (action === "delete") {
    result = await User.deleteMany({ _id: { $in: userIds } });
  }
  
  await logAudit({
    actor: admin.email,
    action: `bulk_${action}`,
    target: `users:${userIds.length}`,
    before: null,
    after: { userIds: userIds.slice(0, 10), total: userIds.length },
    ip: adminClientIp(req),
  });
  
  return json({ ok: true, affected: result.modifiedCount ?? result.deletedCount ?? 0 });
}
