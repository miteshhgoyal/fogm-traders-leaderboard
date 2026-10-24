import { fail, json, sameOrigin } from "@/lib/http";
import { clearSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  await clearSession();
  return json({ ok: true });
}
