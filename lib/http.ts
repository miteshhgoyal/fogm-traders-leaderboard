/** Tiny helpers shared by the route handlers. */

export function json(data: object, status = 200, headers?: Record<string, string>): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export const fail = (status: number, error: string, extra: object = {}): Response => json({ ok: false, error, ...extra }, status);

/**
 * CSRF guard for every mutating route: the Origin header must be this site.
 * Accepts the request URL's origin, NEXT_PUBLIC_SITE_URL, and the forwarded host (behind a proxy).
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(req.url).origin);
  } catch {
    /* ignore */
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      allowed.add(new URL(site).origin);
    } catch {
      /* ignore */
    }
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
    allowed.add(`${proto}://${host}`);
  }
  return allowed.has(origin);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return (await req.json()) as unknown;
  } catch {
    return null;
  }
}
