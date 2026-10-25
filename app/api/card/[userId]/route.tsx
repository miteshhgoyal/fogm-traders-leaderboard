import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { MOCK_DB, formatMoney, formatNumber, initialsOf } from "@/lib/api";
import { avatarPngSrc } from "@/lib/avatar-url";
import { tierFor } from "@/lib/card-theme";
import { CARD_SIZE, CardView, type CardData, type CardFormat } from "@/lib/card-view";
import { resolveEntry } from "@/lib/rank";

const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

async function font(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(path.join(process.cwd(), "assets", "fonts", file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Fetch the (transformed, PNG) avatar and embed it as a data URI. Any failure → initials. */
async function embedAvatar(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(avatarPngSrc(url), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ userId: string }> }): Promise<Response> {
  const { userId } = await ctx.params;
  const url = new URL(req.url);
  const format: CardFormat = url.searchParams.get("format") === "og" ? "og" : "story";

  const entry = await resolveEntry(userId);
  if (!entry) return new Response("Not found", { status: 404 });

  const comp = MOCK_DB.competition;
  const cur = { code: comp.currency.code, locale: comp.currency.locale };
  const total = MOCK_DB.contestStats.tradersEnrolled;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const data: CardData = {
    rank: entry.rank,
    total,
    topPct: Math.max(1, Math.ceil((entry.rank / total) * 100)),
    name: entry.name, // already "Anonymous trader" for non-consenting users
    avatar: await embedAvatar(entry.avatarUrl),
    initials: initialsOf(entry.name),
    countryCode: entry.countryCode,
    city: entry.city,
    savedText: formatMoney(entry.netProfit, cur),
    tradesText: formatNumber(entry.tradesCount, cur.locale),
    topSegment: entry.topInstrument,
    trend: entry.trend,
    tier: tierFor(entry.rank),
    anonymous: entry.avatarUrl === null && entry.name === "Anonymous trader",
    contestTitle: comp.title,
    siteHost: site ? new URL(site).host : "fogm",
    totalText: formatNumber(total, cur.locale),
  };

  const [regular, semi] = await Promise.all([font("Inter-Regular.otf"), font("Inter-SemiBold.otf")]);
  const { width, height } = CARD_SIZE[format];
  const image = new ImageResponse(<CardView d={data} format={format} />, {
    width,
    height,
    fonts: [
      { name: "Inter", data: regular, weight: 400, style: "normal" },
      { name: "Inter", data: semi, weight: 600, style: "normal" },
    ],
    headers: {
      "Cache-Control": CACHE,
      ...(url.searchParams.get("download") === "1" ? { "Content-Disposition": 'attachment; filename="fogm-rank-card.png"' } : {}),
    },
  });
  return image;
}
