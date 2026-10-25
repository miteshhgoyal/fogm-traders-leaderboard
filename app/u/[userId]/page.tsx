import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ACCENT } from "@/lib/card-theme";
import { resolveEntry } from "@/lib/rank";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

type Props = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const entry = await resolveEntry(userId);
  if (!entry) return { title: "Rank card not found" };
  const title = `I'm ranked #${entry.rank} in the FOGM Trading Championship 🏆`;
  const description = "Trade forex, gold and indices on live accounts. The best performers climb the board and win.";
  const image = `${SITE}/api/card/${encodeURIComponent(userId)}?format=og`;
  return {
    metadataBase: SITE ? new URL(SITE) : undefined,
    title,
    description,
    openGraph: { title, description, type: "website", url: `${SITE}/u/${userId}`, images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function SharePage({ params }: Props) {
  // cacheComponents: the per-user lookup is request-time data, so it streams inside <Suspense>
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center text-[14px] text-black/60">Loading rank card…</main>}>
      <ShareContent params={params} />
    </Suspense>
  );
}

async function ShareContent({ params }: Props) {
  const { userId } = await params;
  const entry = await resolveEntry(userId);
  if (!entry) notFound();
  const btn =
    "inline-flex h-12 items-center justify-center rounded-full px-6 text-[14px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col items-center justify-center gap-8 px-5 py-16 text-center font-sans">
      <h1 className="text-[clamp(26px,5vw,36px)] font-semibold leading-[1.15] tracking-[-0.025em]">
        {entry.name} is ranked #{entry.rank} in the FOGM Trading Championship
      </h1>
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic OG image */}
      <img
        src={`/api/card/${encodeURIComponent(userId)}?format=story`}
        alt={`Rank card: #${entry.rank} in the FOGM Trading Championship`}
        width={1080}
        height={1350}
        className="h-auto w-full max-w-[360px] rounded-2xl border border-black/10 shadow-xl"
      />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className={`${btn} focus-visible:ring-black`}
          style={{ background: `linear-gradient(135deg, ${ACCENT.a}, ${ACCENT.b})`, color: ACCENT.ink }}
        >
          See your rank →
        </Link>
        <Link href="/#leaderboard" className={`${btn} border border-black/15 focus-visible:ring-black`}>
          View the leaderboard
        </Link>
      </div>
    </main>
  );
}
