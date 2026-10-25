import { json, sameOrigin, fail } from "@/lib/http";
import { clearAdminSession } from "@/lib/admin-auth";

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  await clearAdminSession();
  return json({ ok: true });
}
