import mongoose from "mongoose";

/**
 * Cached connection. In dev, Next re-evaluates modules on every hot reload, so the
 * connection (and the in-flight promise) live on `globalThis` to avoid opening a new pool each time.
 */
const g = globalThis as unknown as {
  _mongoose?: { conn: typeof mongoose | null; p: Promise<typeof mongoose> | null };
};
const cache = (g._mongoose ??= { conn: null, p: null });

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  cache.p ??= mongoose.connect(uri, { bufferCommands: false });
  try {
    cache.conn = await cache.p;
  } catch (e) {
    cache.p = null; // allow a retry on the next request
    throw e;
  }
  return cache.conn;
}
