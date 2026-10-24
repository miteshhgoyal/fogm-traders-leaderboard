import { signAvatarUpload } from "@/lib/cloudinary";
import { fail, json, sameOrigin } from "@/lib/http";
import { isObjectId } from "@/lib/rank";
import { hit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";


export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const session = await getSession();
  if (!session || !isObjectId(session.userId)) return fail(401, "unauthorized");
  const limit = await hit(`avatar:${session.userId}`, 20, 60 * 60);
  if (!limit.ok) return fail(429, "rate_limited", { retryAfter: limit.retryAfter });
  return json({ ok: true, ...signAvatarUpload(session.userId) });
}
