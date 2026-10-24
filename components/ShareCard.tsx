"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface ShareCardProps {
  userId: string;
  /** Overall rank, used only for the prefilled share text. */
  rank: number | null;
  /** Absolute site origin for share links. Falls back to window.location.origin. */
  siteUrl?: string;
}

const BTN =
  "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-hairline-strong bg-card px-4 text-cell font-semibold text-ink transition duration-200 hover:-translate-y-px hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const ICON: Record<string, string> = {
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  whatsapp: "M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.8a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.82 9.82 0 0 1 9.88 9.88c0 5.45-4.44 9.89-9.9 9.89zM20.5 3.5A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.44-8.41z",
  linkedin: "M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z",
  facebook: "M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z",
  telegram: "M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z",
  link: "M10.59 13.41a1 1 0 0 1 0-1.41l3-3a1 1 0 1 1 1.41 1.41l-3 3a1 1 0 0 1-1.41 0zM7.05 16.95a4 4 0 0 1 0-5.66l2.12-2.12 1.41 1.41-2.12 2.12a2 2 0 1 0 2.83 2.83l2.12-2.12 1.41 1.41-2.12 2.12a4 4 0 0 1-5.65 0zm9.9-9.9a4 4 0 0 1 0 5.66l-2.12 2.12-1.41-1.41 2.12-2.12a2 2 0 1 0-2.83-2.83L10.59 7.6 9.17 6.17l2.12-2.12a4 4 0 0 1 5.66 0z",
  download: "M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1zM5 19a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z",
  share: "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.3 3.3 0 0 0 0-1.4l7.05-4.11A3 3 0 1 0 15 5a3 3 0 0 0 .09.7L8.04 9.81a3 3 0 1 0 0 4.38l7.12 4.16c-.05.2-.08.41-.08.65a2.92 2.92 0 1 0 2.92-2.92z",
};

function Glyph({ name }: { name: keyof typeof ICON }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d={ICON[name]} />
    </svg>
  );
}

/** Tilt-on-hover card preview + share actions. */
export default function ShareCard({ userId, rank, siteUrl }: ShareCardProps) {
  const [origin, setOrigin] = useState(siteUrl ?? "");
  const [toast, setToast] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tilt = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!siteUrl) setOrigin(window.location.origin);
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [siteUrl]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const pageUrl = `${origin}/u/${encodeURIComponent(userId)}`;
  const text = rank ? `I'm #${rank} in the Pride Pool 🏆` : "I'm on the Pride Pool leaderboard 🏆";
  const enc = encodeURIComponent;
  const links = [
    { key: "x", label: "Share on X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(pageUrl)}`, name: "X" },
    { key: "whatsapp", label: "Share on WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${pageUrl}`)}`, name: "WhatsApp" },
    { key: "linkedin", label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(pageUrl)}`, name: "LinkedIn" },
    { key: "facebook", label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(pageUrl)}`, name: "Facebook" },
    { key: "telegram", label: "Share on Telegram", href: `https://t.me/share/url?url=${enc(pageUrl)}&text=${enc(text)}`, name: "Telegram" },
  ] as const;

  const storyUrl = `/api/card/${encodeURIComponent(userId)}?format=story`;

  const nativeShare = useCallback(async () => {
    try {
      const res = await fetch(storyUrl);
      const blob = await res.blob();
      const file = new File([blob], "fogm-rank-card.png", { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text, url: pageUrl });
      } else {
        await navigator.share({ text, url: pageUrl });
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // user closed the sheet
      flash("Could not open the share sheet");
    }
  }, [storyUrl, text, pageUrl, flash]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      flash("Link copied");
    } catch {
      flash("Copy failed. Select the link manually");
    }
  }, [pageUrl, flash]);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = tilt.current;
    if (!el || reduced || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-py * 8).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(px * 8).toFixed(2)}deg`);
  };
  const onLeave = () => {
    tilt.current?.style.setProperty("--rx", "0deg");
    tilt.current?.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="grid gap-5">
      <div className="mx-auto w-full max-w-[320px] [perspective:900px]">
        <div
          ref={tilt}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-hairline bg-alt shadow-[0_24px_60px_-24px_color-mix(in_oklab,var(--accent)_45%,transparent)] transition-transform duration-200 ease-soft [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] motion-reduce:transition-none"
        >
          {!loaded && <div aria-hidden="true" className="fg-sk absolute inset-0" />}
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic OG image, already sized by the route */}
          <img
            src={`/api/card/${encodeURIComponent(userId)}?format=story`}
            alt={rank ? `Your rank card: #${rank} in the Pride Pool` : "Your rank card"}
            width={1080}
            height={1350}
            onLoad={() => setLoaded(true)}
            className={`size-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        </div>
      </div>

      <div role="group" aria-label="Share your rank card" className="flex flex-wrap items-center justify-center gap-2">
        {canNativeShare && (
          <button type="button" onClick={() => void nativeShare()} aria-label="Share rank card" className={`${BTN} border-transparent bg-linear-to-br from-accent to-accent-2 text-accent-ink`}>
            <Glyph name="share" /> Share
          </button>
        )}
        {links.map((l) => (
          <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.label} title={l.label} className={BTN}>
            <Glyph name={l.key} />
            <span className="sr-only sm:not-sr-only">{l.name}</span>
          </a>
        ))}
        <button type="button" onClick={() => void copy()} aria-label="Copy link" className={BTN}>
          <Glyph name="link" /> <span className="sr-only sm:not-sr-only">Copy link</span>
        </button>
        <a href={`${storyUrl}&download=1`} download="fogm-rank-card.png" aria-label="Download PNG" className={BTN}>
          <Glyph name="download" /> <span className="sr-only sm:not-sr-only">Download</span>
        </a>
      </div>

      <div role="status" aria-live="polite" className="h-5 text-center text-meta text-mute">
        {toast}
      </div>
    </div>
  );
}
