import { requireAdmin } from "@/lib/admin-auth";
import { signBrandUpload } from "@/lib/cloudinary";
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

  const signed = signBrandUpload();
  return json({
    ok: true,
    ...signed,
  });
}
