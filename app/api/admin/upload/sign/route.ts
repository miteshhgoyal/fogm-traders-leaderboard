import { createHash } from "node:crypto";
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
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) return fail(503, "cloudinary_not_configured");
  
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "fogm/brand";
  const publicId = `brand_${timestamp}`;
  const overwrite = "true";
  const invalidate = "true";
  
  const toSign = `folder=${folder}&invalidate=${invalidate}&overwrite=${overwrite}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha256").update(toSign).digest("hex");
  
  return json({
    ok: true,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    apiKey,
    timestamp,
    signature,
    folder,
    publicId,
    overwrite,
    invalidate,
  });
}
