import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "fogm_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const REFRESH_AFTER = 60 * 60 * 24; // slide the expiry at most once a day

export interface Session {
  userId: string;
  email: string;
}

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters");
  return new TextEncoder().encode(secret);
}

const cookieOptions = (maxAge: number) =>
  ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  });

async function sign(s: Session): Promise<string> {
  return new SignJWT({ email: s.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

/** Sets the session cookie. Call from route handlers only. */
export async function createSession(s: Session): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await sign(s), cookieOptions(MAX_AGE));
}

export async function clearSession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", cookieOptions(0));
}

/**
 * Reads and verifies the session. With `{ slide: true }` (route handlers only) a session older than a day
 * is re-issued, so active users never get logged out (sliding 30-day window).
 */
export async function getSession(opts?: { slide?: boolean }): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    const session: Session = { userId: payload.sub, email: payload.email };
    if (opts?.slide && typeof payload.iat === "number" && Date.now() / 1000 - payload.iat > REFRESH_AFTER) {
      try {
        jar.set(SESSION_COOKIE, await sign(session), cookieOptions(MAX_AGE));
      } catch {
        /* cookies are read-only in this context; the next route-handler call will refresh */
      }
    }
    return session;
  } catch {
    return null; // bad signature, expired, malformed
  }
}
