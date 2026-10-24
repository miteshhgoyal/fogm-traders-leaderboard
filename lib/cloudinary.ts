import { v2 as cloudinary } from "cloudinary";

export const AVATAR_FOLDER = "fogm/avatars";

function config() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) throw new Error("Cloudinary env vars are not set");
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return { cloud_name, api_key, api_secret };
}

export interface SignedUpload {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  overwrite: string;
  invalidate: string;
}

/** Signed payload for a direct browser upload. The API secret never leaves the server. */
export function signAvatarUpload(userId: string): SignedUpload {
  const { cloud_name, api_key, api_secret } = config();
  const timestamp = Math.floor(Date.now() / 1000);
  // exactly the params that are signed AND sent by the client (strings, as they travel in the form body)
  const params = { folder: AVATAR_FOLDER, invalidate: "true", overwrite: "true", public_id: userId, timestamp };
  const signature = cloudinary.utils.api_sign_request(params, api_secret);
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
    apiKey: api_key,
    timestamp,
    signature,
    folder: params.folder,
    publicId: params.public_id,
    overwrite: params.overwrite,
    invalidate: params.invalidate,
  };
}

/** Only this user's own Cloudinary upload may be stored as their avatar. */
export function isAllowedAvatarUrl(raw: string, userId: string): boolean {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  return (
    u.protocol === "https:" &&
    u.hostname === "res.cloudinary.com" &&
    u.pathname.startsWith(`/${cloud}/`) &&
    u.pathname.startsWith(`/${cloud}/image/upload/`) &&
    u.pathname.includes(`/${AVATAR_FOLDER}/${userId}`)
  );
}
