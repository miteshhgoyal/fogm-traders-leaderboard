import { z } from "zod";
import type { MeResponse } from "@/lib/api";
import { isAllowedAvatarUrl } from "@/lib/cloudinary";
import { dbConnect } from "@/lib/db";
import { fail, json, readJson, sameOrigin } from "@/lib/http";
import { User } from "@/lib/models/User";
import { getRankEntry, isObjectId, toSessionUser } from "@/lib/rank";
import { clearSession, getSession } from "@/lib/session";

export const runtime = "nodejs";

const SIGNED_OUT: MeResponse = { user: null, entry: null };

export async function GET(): Promise<Response> {
  const session = await getSession({ slide: true });
  if (!session || !isObjectId(session.userId)) return json(SIGNED_OUT);
  await dbConnect();
  const doc = await User.findById(session.userId).lean();
  if (!doc) {
    await clearSession(); // account deleted: drop the stale cookie
    return json(SIGNED_OUT);
  }
  const id = String(doc._id);
  const entry = await getRankEntry(id, toSessionUser(id, doc)).catch(() => null);
  const body: MeResponse = {
    user: { id, email: doc.email, name: doc.name, avatarUrl: doc.avatarUrl, publicConsent: doc.publicConsent, country: doc.country, profileComplete: doc.profileComplete },
    entry,
  };
  return json(body);
}

const Patch = z
  .object({
    name: z.string().trim().min(2).max(30).optional(),
    avatarUrl: z.string().url().max(500).nullable().optional(),
    publicConsent: z.boolean().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: "empty" });

export async function PATCH(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  const session = await getSession({ slide: true });
  if (!session || !isObjectId(session.userId)) return fail(401, "unauthorized");
  const parsed = Patch.safeParse(await readJson(req));
  if (!parsed.success) return fail(400, "invalid_input", { message: "Display name must be 2 to 30 characters." });
  const { name, avatarUrl, publicConsent } = parsed.data;
  if (typeof avatarUrl === "string" && !isAllowedAvatarUrl(avatarUrl, session.userId)) {
    return fail(400, "invalid_avatar", { message: "That photo could not be verified. Please upload it again." });
  }

  await dbConnect();
  const set: Record<string, unknown> = {};
  if (name !== undefined) set.name = name.replace(/[\u0000-\u001f\u007f]/g, "");
  if (avatarUrl !== undefined) set.avatarUrl = avatarUrl;
  if (publicConsent !== undefined) set.publicConsent = publicConsent;

  const updated = await User.findByIdAndUpdate(session.userId, { $set: set }, { new: true });
  if (!updated) return fail(404, "not_found");
  if (!updated.profileComplete && updated.name.trim().length >= 2) {
    updated.profileComplete = true;
    await updated.save();
  }
  return json({ ok: true });
}
