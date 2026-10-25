import { requireAdmin } from "@/lib/admin-auth";
import { fail, json, sameOrigin } from "@/lib/http";

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  try {
    const { revalidateTag } = await import("next/cache");
    revalidateTag("settings");
  } catch {
    /* ignore */
  }
  
  return json({ ok: true, revalidatedAt: new Date().toISOString() });
}
