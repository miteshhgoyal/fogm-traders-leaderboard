import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "fogm_admin";
const MAX_AGE = 60 * 60 * 8; // 8 hours, no sliding

function adminKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET not configured");
  return new TextEncoder().encode(secret);
}

export function isAdminConfigured(): boolean {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  return !!(email && email.includes("@") && pass && pass.length >= 12 && secret && secret.length >= 32);
}

export async function createAdminSession(): Promise<void> {
  const token = await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(adminKey());
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}

/** Returns true if the admin cookie is valid and ADMIN_EMAIL is still set. Throws on misconfiguration. */
export async function requireAdmin(): Promise<{ email: string }> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!isAdminConfigured() || !adminEmail) {
    throw Object.assign(new Error("admin_not_configured"), { status: 503 });
  }
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) throw Object.assign(new Error("unauthorized"), { status: 401 });
  try {
    const { payload } = await jwtVerify(token, adminKey(), { algorithms: ["HS256"] });
    if (payload.sub !== "admin") throw new Error("invalid token");
    // Re-check that env is still set (removing env value locks everyone out)
    if (!process.env.ADMIN_EMAIL) throw new Error("admin removed");
    return { email: adminEmail };
  } catch (e) {
    if (e instanceof Error && (e as { status?: number }).status) throw e;
    throw Object.assign(new Error("unauthorized"), { status: 401 });
  }
}

export function adminClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() ?? "127.0.0.1";
}
