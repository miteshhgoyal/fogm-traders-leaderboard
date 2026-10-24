import { API_BASE, USE_MOCK, mockEntryByUserId, type LeaderboardEntry, type SessionUser } from "./api";
import { dbConnect } from "./db";
import { User, type IUser } from "./models/User";

const OBJECT_ID = /^[a-f0-9]{24}$/i;
export const isObjectId = (s: string): boolean => OBJECT_ID.test(s);


export function toSessionUser(id: string, u: Pick<IUser, "name" | "avatarUrl" | "publicConsent" | "country">): SessionUser {
  return { userId: id, name: u.name, avatarUrl: u.avatarUrl, publicConsent: u.publicConsent, country: u.country ?? undefined };
}

/**
 * The leaderboard row for a user id.
 *  - mock mode: merged into MOCK_DB at rank 27 (and public identity rules applied).
 *  - real mode: the contest service joins on userId and returns the row already anonymised for
 *    non-consenting users. ASSUMED endpoint: GET {API_BASE}/leaderboard/users/:userId  → LeaderboardEntry | 404.
 */
export async function getRankEntry(userId: string, user: SessionUser | null): Promise<LeaderboardEntry | null> {
  if (USE_MOCK) return mockEntryByUserId(userId, user);
  const res = await fetch(`${API_BASE}/leaderboard/users/${encodeURIComponent(userId)}`, { headers: { Accept: "application/json" }, next: { revalidate: 60 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`leaderboard lookup failed: ${res.status}`);
  return (await res.json()) as LeaderboardEntry;
}

/** Resolves a public user id (a Mongo ObjectId, or a mock trader id in mock mode) to a leaderboard row. */
export async function resolveEntry(userId: string): Promise<LeaderboardEntry | null> {
  if (USE_MOCK && userId.startsWith("u_mock_")) return mockEntryByUserId(userId, null);
  if (!isObjectId(userId)) return null;
  await dbConnect();
  const doc = await User.findById(userId).lean();
  if (!doc) return null;
  return getRankEntry(userId, toSessionUser(userId, doc));
}
