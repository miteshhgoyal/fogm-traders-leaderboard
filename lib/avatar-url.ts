/* Client-safe helpers for Cloudinary delivery URLs (no SDK, no secrets). */

const MARK = "/image/upload/";

/** Insert a transformation after `/image/upload/`. Non-Cloudinary URLs pass through unchanged. */
export function cloudinaryTransform(url: string, transform: string): string {
  const i = url.indexOf(MARK);
  if (i === -1 || !url.startsWith("https://res.cloudinary.com/")) return url;
  const rest = url.slice(i + MARK.length);
  // already transformed (a transform segment has commas / no version "v123")
  if (/^[a-z]{1,3}_[^/]*\//.test(rest) && !/^v\d+\//.test(rest)) return url;
  return `${url.slice(0, i + MARK.length)}${transform}/${rest}`;
}

/** Avatar delivery transform used everywhere on the site. */
export const AVATAR_TRANSFORM = "c_fill,g_face,w_256,h_256,f_auto,q_auto";
export const avatarSrc = (url: string): string => cloudinaryTransform(url, AVATAR_TRANSFORM);
/** PNG variant for the OG card (satori cannot decode webp/avif). */
export const avatarPngSrc = (url: string): string => cloudinaryTransform(url, "c_fill,g_face,w_256,h_256,f_png");
