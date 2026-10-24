"use client";

/* ──────────────────────────────────────────────────────────────────────────
 * FOGM — premium fintech leaderboard landing page (v3: USD, real names, join popup).
 *
 * Where things live (all in this file unless noted):
 *   • THEME / PRESETS / ACTIVE_PRESET / SHOW_THEME_STUDIO ... "THEME CONFIG"
 *   • Animation helpers: useReveal, Reveal, CountUp, onSpot, Track (marquee/ticker) ... "ANIMATION HELPERS"
 *   • Data: lib/api.ts (types, MOCK_DB, async API functions, formatters). `useLandingData()` is the only consumer.
 * ────────────────────────────────────────────────────────────────────────── */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Inter } from "next/font/google";
import Avatar from "@/components/Avatar";
import AuthProvider from "@/components/AuthProvider";
import { useAuth } from "@/components/auth-context";
import {
  formatCompactMoney,
  formatMoney,
  formatNumber,
  getActivity,
  getCompetition,
  getContent,
  getLeaderboard,
  getPastEditions,
  getPoolHistory,
  getPoolStats,
  getPrizeTiers,
  getSegmentBreakdown,
  getWinners,
  timeAgo,
  type ActivityItem,
  type Competition,
  type ContentPayload,
  type ContestStatus,
  type LeaderboardEntry,
  type LeaderboardPage,
  type PastEdition,
  type Period,
  type PoolHistoryPoint,
  type PoolStats,
  type PrizeTier,
  type SegmentBreakdown,
  type WinnersPayload,
} from "@/lib/api";

/* ═══════════════════════════ THEME CONFIG ═══════════════════════════════
 * Single source of truth. Change the hex values (or ACTIVE_PRESET) and the
 * whole page re-skins in both light and dark. Every tint is derived with
 * color-mix() from these variables — nothing accent-coloured is hardcoded.
 * ════════════════════════════════════════════════════════════════════════ */
interface Tone {
  accent: string;
  accent2: string;
  accentInk: string;
}
interface Palette {
  light: Tone;
  dark: Tone;
}

const BRAND = { name: "FOGM", tagline: "Make your move." };

const URLS = { join: "#join", login: "#login" }; // swap for real sign-up / login URLs
const VERIFICATION_DAYS = 7; // shown as "final winners are declared on {endsAt + verification}"

const THEME: Palette = {
  light: { accent: "#3b36e0", accent2: "#7a5cff", accentInk: "#ffffff" },
  dark: { accent: "#8b87ff", accent2: "#b49bff", accentInk: "#0b0b1a" },
};

const PRESETS = {
  indigo: {
    light: { accent: "#4338ca", accent2: "#7c5cff", accentInk: "#ffffff" },
    dark: { accent: "#8b87ff", accent2: "#b49bff", accentInk: "#0b0b1a" },
  },
  emerald: {
    light: { accent: "#047857", accent2: "#0d9488", accentInk: "#ffffff" },
    dark: { accent: "#34d399", accent2: "#5eead4", accentInk: "#04130d" },
  },
  rose: {
    light: { accent: "#be123c", accent2: "#db2777", accentInk: "#ffffff" },
    dark: { accent: "#fb7185", accent2: "#f9a8d4", accentInk: "#1a060b" },
  },
  amber: {
    light: { accent: "#b45309", accent2: "#c2410c", accentInk: "#ffffff" },
    dark: { accent: "#fbbf24", accent2: "#fb923c", accentInk: "#1a1004" },
  },
  cyan: {
    light: { accent: "#0e7490", accent2: "#0369a1", accentInk: "#ffffff" },
    dark: { accent: "#22d3ee", accent2: "#67e8f9", accentInk: "#04141a" },
  },
} satisfies Record<string, Palette>;
type PresetKey = keyof typeof PRESETS;

const ACTIVE_PRESET: PresetKey | "custom" = "custom";
const SHOW_THEME_STUDIO = false; // floating live palette (bottom-left): preset swatches + 2 native colour inputs

function resolvePalette(p: PresetKey | "custom"): Palette {
  return p === "custom" ? THEME : PRESETS[p];
}

const NEUTRALS = {
  light: `--bg:#ffffff;--bg-alt:#f5f6fb;--card:#ffffff;--ink:#0a0b14;--mute:#5b6070;--faint:#8d93a5;
--hairline:#e6e8f0;--hairline-strong:#cfd3e0;--up:#0f8f4f;--down:#d9304a;
--shadow:0 1px 2px rgba(20,22,50,.04),0 18px 48px -22px color-mix(in oklab,var(--accent) 26%,transparent);
--shadow-lg:0 2px 4px rgba(20,22,50,.04),0 40px 90px -34px color-mix(in oklab,var(--accent) 38%,transparent);
--inset:inset 0 0 0 transparent;color-scheme:light;`,
  dark: `--bg:#05060d;--bg-alt:#0a0b16;--card:#0f1120;--ink:#ffffff;--mute:rgba(255,255,255,.72);--faint:#8d93a5;
--hairline:rgba(255,255,255,.10);--hairline-strong:rgba(255,255,255,.2);--up:#3ddc84;--down:#ff6b7f;
--shadow:0 1px 0 rgba(255,255,255,.04),0 18px 48px -24px rgba(0,0,0,.6);
--shadow-lg:0 1px 0 rgba(255,255,255,.05),0 40px 90px -30px rgba(0,0,0,.7);
--inset:inset 0 1px 0 rgba(255,255,255,.07);color-scheme:dark;`,
};

function themeCss(p: Palette): string {
  const vars = (t: Tone) => `--accent:${t.accent};--accent-2:${t.accent2};--accent-ink:${t.accentInk};`;
  return `.fogm{${vars(p.light)}${NEUTRALS.light}}
.dark .fogm{${vars(p.dark)}${NEUTRALS.dark}}`;
}


/** Runs before first paint (inline in SSR HTML): system preference first, then a saved choice. */
const THEME_BOOT = `try{var s=localStorage.getItem('fogm-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;

/* ═══════════════════════════ FONT (Inter only) ═══════════════════════════ */
const fontInter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

/* ═══════════════════════════ FORMAT CONTEXT ═════════════════════════════
 * All money goes through here, using the competition's currency + locale.
 * ════════════════════════════════════════════════════════════════════════ */
interface Fmt {
  money: (n: number) => string;
  compact: (n: number) => string;
  /** full amount below $100K, compact above: keeps big numbers inside small tiles */
  auto: (n: number) => string;
  num: (n: number) => string;
  date: (iso: string, o?: Intl.DateTimeFormatOptions) => string;
}
function makeFmt(cur?: Competition["currency"]): Fmt {
  const opts = cur ? { code: cur.code, locale: cur.locale } : undefined;
  return {
    money: (n) => formatMoney(n, opts),
    compact: (n) => formatCompactMoney(n, opts),
    auto: (n) => (n >= 1e5 ? formatCompactMoney(n, opts) : formatMoney(n, opts)),
    num: (n) => formatNumber(n, cur?.locale),
    date: (iso, o) =>
      new Intl.DateTimeFormat(cur?.locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC", ...o }).format(new Date(iso)),
  };
}
const FmtCtx = createContext<Fmt>(makeFmt());
const useFmt = () => useContext(FmtCtx);
const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

/* ═══════════════════════════ ANIMATION HELPERS ══════════════════════════ */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** IntersectionObserver, fires once. Returns [ref, seen]. */
function useReveal<T extends HTMLElement>(threshold = 0.15): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

const REVEAL_BASE =
  "opacity-0 blur-[3px] transition duration-500 ease-soft [transition-delay:var(--d,0ms)] motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:blur-none data-[in=true]:translate-x-0 data-[in=true]:translate-y-0 data-[in=true]:scale-100 data-[in=true]:opacity-100 data-[in=true]:blur-none";
const REVEAL_FROM = {
  up: "translate-y-3",
  fade: "",
  scale: "scale-[0.97]",
  left: "-translate-x-3",
  right: "translate-x-3",
} as const;
type RevealVariant = keyof typeof REVEAL_FROM;

/** Fade + 12px translate + blur-to-sharp when scrolled into view (500ms). */
function Reveal({ variant = "up", delay = 0, className, children }: { variant?: RevealVariant; delay?: number; className?: string; children: ReactNode }) {
  const [ref, seen] = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} data-in={seen} className={cn(REVEAL_BASE, REVEAL_FROM[variant], className)} style={{ "--d": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

/** Marks `data-in` once visible. Children use ST (stagger) / fg-draw / fg-bar etc. */
function InView({ className, children, threshold }: { className?: string; children: ReactNode; threshold?: number }) {
  const [ref, seen] = useReveal<HTMLDivElement>(threshold);
  return (
    <div ref={ref} data-in={seen} className={cn("group/iv", className)}>
      {children}
    </div>
  );
}
/** Stagger-in for children of <InView> (60ms steps via --i). */
const ST =
  "opacity-0 translate-y-3 transition duration-500 ease-soft [transition-delay:calc(var(--i,0)*60ms)] group-data-[in=true]/iv:translate-y-0 group-data-[in=true]/iv:opacity-100 motion-reduce:translate-y-0";

/** easeOutExpo count-up (~1.4s) that starts when scrolled into view. min-width keeps layout still while counting. */
function CountUp({ value, format, duration = 1400, className }: { value: number; format: (n: number) => string; duration?: number; className?: string }) {
  const [ref, seen] = useReveal<HTMLSpanElement>(0.2);
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced) {
      fromRef.current = value;
      setShown(value);
      return;
    }
    const from = fromRef.current;
    const dur = from === 0 ? duration : 700;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const v = from + (value - from) * e;
      fromRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, duration, reduced]);
  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)} style={{ minWidth: `${format(value).length}ch` }}>
      {format(Math.round(shown))}
    </span>
  );
}

/** Cursor-follow spotlight: sets --mx/--my for `.fg-spot::before`. */
function onSpot(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

function useWidth(ref: React.RefObject<HTMLElement | null>, fallback: number): number {
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.round(el.getBoundingClientRect().width) || fallback);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(Math.round(el.getBoundingClientRect().width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}

function useNow(ms: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Infinite marquee: renders children twice and scrolls -50% (pauses on hover). */
function Track({ children, dur = 60 }: { children: ReactNode; dur?: number }) {
  return (
    <div className="group/tr flex w-max animate-[f-scroll_var(--dur)_linear_infinite] hover:[animation-play-state:paused]" style={{ "--dur": `${dur}s` } as CSSProperties}>
      <div className="flex">{children}</div>
      <div className="flex" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════ ICONS ══════════════════════════════════════ */
const ICONS: Record<string, string> = {
  check: "M20 6 9 17l-5-5",
  x: "M18 6 6 18M6 6l12 12",
  search: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM21 21l-4.3-4.3",
  menu: "M4 6h16M4 12h16M4 18h16",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 16v-5M12 8h.01",
  bolt: "M13 2 3 14h8l-1 8 10-12h-8l1-8Z",
  up: "M12 19V5M5 12l7-7 7 7",
  userplus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19 8v6M22 11h-6",
  laptop: "M4 5h16v11H4zM2 19h20",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3",
  arrow: "M5 12h14M13 6l6 6-6 6",
};
function Icon({ name, size = 16, stroke = 2, className }: { name: keyof typeof ICONS; size?: number; stroke?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d={ICONS[name]} />
    </svg>
  );
}

function LogoGlyph({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="text-accent">
      <rect width="32" height="32" rx="10" fill="currentColor" />
      <path d="M9 21.5 15 15l3.5 3.5L24 11" stroke="var(--accent-ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 11H24v5.5" stroke="var(--accent-ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Crown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 36" fill="currentColor" aria-hidden="true">
      <path d="M4 30 2 10l10 9L22 3l10 16 10-9-2 20Z" />
      <rect x="4" y="31" width="36" height="4" rx="2" />
    </svg>
  );
}

function Flag({ code, size = 16 }: { code: string; size?: number }) {
  const id = useId();
  if (code === "IN") {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" aria-label="India" role="img" className="shrink-0 rounded-full">
        <defs>
          <clipPath id={id}>
            <circle cx="10" cy="10" r="10" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          <rect width="20" height="7" fill="#ff9933" />
          <rect width="20" height="6.5" y="6.7" fill="#ffffff" />
          <rect width="20" height="7" y="13" fill="#138808" />
          <circle cx="10" cy="10" r="2.1" fill="none" stroke="#000080" strokeWidth=".9" />
        </g>
      </svg>
    );
  }
  return (
    <span className="inline-grid shrink-0 place-items-center text-faint" title={code} role="img" aria-label={code}>
      <Icon name="globe" size={size} stroke={1.8} />
    </span>
  );
}

function Movement({ movement, previousRank }: { movement: number; previousRank: number | null }) {
  if (previousRank === null) return <Pill tone="accent">NEW</Pill>;
  if (movement === 0) return <span className="text-meta text-faint" aria-label="No change">–</span>;
  const up = movement > 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-meta font-semibold", up ? "text-up" : "text-down")} aria-label={`${up ? "Up" : "Down"} ${Math.abs(movement)} places`}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" className="animate-[f-pulse1_.8s_ease-out_.5s_1_both]">
        <path d={up ? "M5 1 9.5 9h-9z" : "M5 9 .5 1h9z"} />
      </svg>
      {Math.abs(movement)}
    </span>
  );
}

/* ═══════════════════════════ PRIMITIVES ═════════════════════════════════ */
const WRAP = "mx-auto w-full max-w-[1160px] px-5 sm:px-8";
const SHADOW = "shadow-[0_8px_30px_-12px_color-mix(in_oklab,var(--accent)_20%,transparent)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.07)]";

function Card({ className, children, spot, ...rest }: { className?: string; children: ReactNode; spot?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} onPointerMove={spot ? onSpot : rest.onPointerMove} className={cn("relative overflow-clip rounded-2xl border border-hairline bg-card p-5 md:p-6", SHADOW, spot && "fg-spot", className)}>
      {children}
    </div>
  );
}

const PILL_TONE = {
  accent: "bg-accent/10 text-accent",
  mute: "bg-ink/5 text-mute",
  up: "bg-up/10 text-up",
} as const;
function Pill({ tone = "mute", className, children }: { tone?: keyof typeof PILL_TONE; className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-meta font-semibold", PILL_TONE[tone], className)}>{children}</span>;
}

function LiveDot({ on = true }: { on?: boolean }) {
  return (
    <span className={cn("relative size-2 shrink-0 rounded-full", on ? "bg-up" : "bg-faint")}>
      {on && <span className="absolute inset-0 animate-[f-ping_1.8s_ease-out_infinite] rounded-full bg-up" />}
    </span>
  );
}

const BTN_BASE = "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-cell font-semibold transition duration-200 active:scale-[.98] disabled:opacity-50";
const BTN_VARIANT = {
  primary: "bg-linear-to-br from-accent to-accent-2 text-accent-ink shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--accent)_60%,transparent)] hover:-translate-y-px",
  ghost: "border border-hairline-strong bg-card text-ink hover:border-accent hover:-translate-y-px",
  white: "bg-white text-[#14143a] hover:-translate-y-px shadow-[0_10px_30px_-12px_rgba(0,0,0,.35)]",
} as const;
function Button({ variant = "primary", size = "md", href, className, children, ...rest }: { variant?: keyof typeof BTN_VARIANT; size?: "md" | "lg"; href?: string; className?: string; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = cn(BTN_BASE, BTN_VARIANT[variant], size === "lg" ? "h-12" : "h-11", className);
  if (href) return <a href={href} className={cls} onClick={rest.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement> | undefined}>{children}</a>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("mb-3 inline-flex items-center gap-3 text-label uppercase text-accent before:h-px before:w-8 before:bg-accent", className)}>{children}</span>;
}

function Stat({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-hairline bg-alt p-4", className)}>
      <div className="truncate text-label uppercase text-faint">{label}</div>
      <div className="mt-2 text-stat text-ink">{children}</div>
    </div>
  );
}

function Section({ id, alt, children }: { id: string; alt?: boolean; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24 border-t border-hairline py-16 md:py-24", alt && "bg-alt")}>
      <div className={WRAP}>{children}</div>
    </section>
  );
}

function SectionHead({ id, eyebrow, title, sub, center, className }: { id: string; eyebrow: string; title: ReactNode; sub?: ReactNode; center?: boolean; className?: string }) {
  return (
    <Reveal className={cn("mb-10", center && "text-center", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={`${id}-title`} className={cn("text-title text-ink", sub ? "mb-4" : "")}>
        {title}
      </h2>
      {sub && <p className={cn("max-w-[600px] text-body text-mute", center && "mx-auto")}>{sub}</p>}
    </Reveal>
  );
}

const GRAD_TEXT = "bg-linear-to-br from-accent to-accent-2 bg-clip-text text-transparent";

function InfoTip({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={label} aria-expanded={open} aria-describedby={id} onClick={() => setOpen((o) => !o)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        className={cn("relative ml-1.5 inline-grid size-4 place-items-center rounded-full border text-[10px] font-semibold leading-none before:absolute before:-inset-3 before:content-['']", open ? "border-accent text-accent" : "border-hairline-strong text-faint")}>
        i
      </button>
      <span role="tooltip" id={id} className={cn("pointer-events-none absolute right-[-8px] top-[calc(100%+8px)] z-30 w-60 max-w-[70vw] rounded-xl bg-ink px-3 py-3 text-left text-meta font-normal normal-case tracking-normal text-bg shadow-xl transition duration-200", open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")}>
        {text}
      </span>
    </span>
  );
}

/* ═══════════════════════════ CHARTS (inline SVG) ════════════════════════ */
interface Pt {
  x: number;
  y: number;
}
function smoothPath(p: Pt[]): string {
  if (p.length < 2) return "";
  let d = `M${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const c1y = Math.min(hi, Math.max(lo, p1.y + (p2.y - p0.y) / 6));
    const c2y = Math.min(hi, Math.max(lo, p2.y - (p3.y - p1.y) / 6));
    d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${c1y.toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}
function niceMax(v: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1))));
  const n = v / pow;
  return ([1, 2, 4, 6, 8, 10].find((s) => n <= s) ?? 10) * pow;
}

function AreaChart({ labels, values, formatY, formatTip, height = 200, ariaLabel }: { labels: string[]; values: number[]; formatY: (n: number) => string; formatTip: (i: number) => string; height?: number; ariaLabel: string }) {
  const gid = useId();
  const wrap = useRef<HTMLDivElement | null>(null);
  const w = useWidth(wrap, 560);
  const [ref, seen] = useReveal<HTMLDivElement>(0.2);
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 52, r: 12, t: 12, b: 28 };
  const iw = Math.max(w - pad.l - pad.r, 40);
  const ih = height - pad.t - pad.b;
  const max = niceMax(Math.max(...values, 1) * 1.05);
  const pts: Pt[] = values.map((v, i) => ({ x: pad.l + (values.length === 1 ? iw / 2 : (i / (values.length - 1)) * iw), y: pad.t + ih - (v / max) * ih }));
  const line = smoothPath(pts);
  const area = `${line}L${pts[pts.length - 1].x.toFixed(1)} ${pad.t + ih}L${pts[0].x.toFixed(1)} ${pad.t + ih}Z`;
  const ticks = [0, 1, 2, 3, 4].map((k) => ({ v: (max * k) / 4, y: pad.t + ih - (k / 4) * ih }));
  const xi = [0, Math.floor((labels.length - 1) / 2), labels.length - 1];
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(values.length - 1, Math.round(((e.clientX - r.left - pad.l) / iw) * (values.length - 1)))));
  };
  return (
    <div ref={(n) => { wrap.current = n; ref.current = n; }} data-in={seen} className="relative w-full" onPointerMove={move} onPointerLeave={() => setHover(null)}>
      <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={ariaLabel} className="block overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.28 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={t.y} y2={t.y} stroke="var(--hairline)" strokeDasharray={i === 0 ? undefined : "3 5"} />
            <text x={pad.l - 8} y={t.y + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--faint)" }}>{formatY(t.v)}</text>
          </g>
        ))}
        {xi.map((i, k) => (
          <text key={k} x={pts[i].x} y={height - 6} textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"} fontSize="11" style={{ fill: "var(--faint)" }}>{labels[i]}</text>
        ))}
        <path className="fg-fade" d={area} fill={`url(#${gid})`} />
        <path className="fg-draw" d={line} pathLength={1} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null && (
          <g>
            <line x1={pts[hover].x} x2={pts[hover].x} y1={pad.t} y2={pad.t + ih} stroke="var(--accent)" strokeOpacity=".35" />
            <circle cx={pts[hover].x} cy={pts[hover].y} r="5" fill="var(--card)" stroke="var(--accent)" strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-[110%] whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-meta font-semibold text-bg" style={{ left: Math.min(Math.max(pts[hover].x, 70), w - 70), top: pts[hover].y }}>
          {formatTip(hover)}
        </div>
      )}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const W = 64;
  const H = 20;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts: Pt[] = values.map((v, i) => ({ x: 1.5 + (i / (values.length - 1)) * (W - 3), y: H - 2.5 - ((v - min) / span) * (H - 5) }));
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="block overflow-visible">
      <path className="fg-draw" d={smoothPath(pts)} pathLength={1} fill="none" stroke={up ? "var(--up)" : "var(--down)"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════ ASYNC STATES ═══════════════════════════════ */
type ResState = "loading" | "ready" | "error";
interface Res<T> {
  state: ResState;
  data: T | null;
  error: string | null;
}
const loadingRes = <T,>(): Res<T> => ({ state: "loading", data: null, error: null });

function Sk({ w = "100%", h = 16, className, style }: { w?: number | string; h?: number | string; className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cn("fg-sk rounded-lg", className)} style={{ width: w, height: h, ...style }} />;
}

function ErrorBox({ message, onRetry, what }: { message: string | null; onRetry: () => void; what: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline-strong px-5 py-8 text-center text-body text-mute">
      <b className="text-ctitle text-ink">Couldn&apos;t load {what}</b>
      <span>{message ?? "Something went wrong."}</span>
      <Button variant="ghost" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function Async<T>({ res, what, onRetry, skeleton, isEmpty, emptyText, children }: { res: Res<T>; what: string; onRetry: () => void; skeleton: ReactNode; isEmpty?: (d: T) => boolean; emptyText?: string; children: (d: T) => ReactNode }) {
  if (res.state === "error" && !res.data) return <ErrorBox message={res.error} onRetry={onRetry} what={what} />;
  if (!res.data) return <>{skeleton}</>;
  if (isEmpty?.(res.data))
    return (
      <div className="px-5 py-10 text-center text-body text-mute">
        <b className="mb-1 block text-ctitle text-ink">Nothing here yet</b>
        {emptyText ?? `No ${what} to show right now.`}
      </div>
    );
  return <>{children(res.data)}</>;
}

function combine<A, B>(a: Res<A>, b: Res<B>): Res<[A, B]> {
  if (a.data && b.data) return { state: "ready", data: [a.data, b.data], error: null };
  if (a.state === "error" || b.state === "error") return { state: "error", data: null, error: a.error ?? b.error };
  return loadingRes();
}

function Ago({ iso }: { iso: string }) {
  const now = useNow(15000);
  return <>{timeAgo(iso, now ?? undefined)}</>;
}

const STATUS_LABEL: Record<ContestStatus, { badge: string; pill: string }> = {
  upcoming: { badge: "Starting soon", pill: "UPCOMING" },
  registration_open: { badge: "Registration open", pill: "REGISTRATION OPEN" },
  active: { badge: "Live · Contest running", pill: "ACTIVE" },
  ended: { badge: "Contest ended", pill: "ENDED" },
  winners_declared: { badge: "Winners declared", pill: "WINNERS DECLARED" },
};

/* ═══════════════════════════ DATA HOOK ══════════════════════════════════ */
interface DataShape {
  competition: Competition;
  pool: PoolStats;
  winners: WinnersPayload;
  prizes: PrizeTier[];
  activity: ActivityItem[];
  history: PoolHistoryPoint[];
  segments: SegmentBreakdown[];
  past: PastEdition[];
  content: ContentPayload;
}
type DataKey = keyof DataShape;
type DataState = { [K in DataKey]: Res<DataShape[K]> };

const FETCH: { [K in DataKey]: () => Promise<DataShape[K]> } = {
  competition: getCompetition,
  pool: getPoolStats,
  winners: getWinners,
  prizes: getPrizeTiers,
  activity: getActivity,
  history: getPoolHistory,
  segments: getSegmentBreakdown,
  past: getPastEditions,
  content: getContent,
};
const ALL_KEYS = Object.keys(FETCH) as DataKey[];
const LIVE_KEYS: DataKey[] = ["competition", "pool", "winners", "activity", "history", "segments"];
const PAGE_SIZE = 20;
const REFRESH_MS = 60_000;

interface BoardData {
  key: string; // `${period}|${query}` the data belongs to
  page: LeaderboardPage;
  top3: LeaderboardEntry[];
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Unexpected error");

/** `sessionKey` changes when the signed-in user (or their public profile) changes, so the board refetches. */
function useLandingData(sessionKey: string) {
  const [state, setState] = useState<DataState>(() => ({
    competition: loadingRes(),
    pool: loadingRes(),
    winners: loadingRes(),
    prizes: loadingRes(),
    activity: loadingRes(),
    history: loadingRes(),
    segments: loadingRes(),
    past: loadingRes(),
    content: loadingRes(),
  }));

  const loadKeys = useCallback(async (keys: DataKey[], silent: boolean) => {
    if (!silent) {
      setState((s) => {
        const next = { ...s };
        for (const k of keys) (next[k] as Res<unknown>) = { state: "loading", data: s[k].data, error: null };
        return next;
      });
    }
    async function settle<K extends DataKey>(k: K) {
      try {
        const data = await FETCH[k]();
        setState((s) => ({ ...s, [k]: { state: "ready", data, error: null } }));
      } catch (e) {
        setState((s) => (silent && s[k].data ? s : { ...s, [k]: { state: "error", data: null, error: errMsg(e) } }));
      }
    }
    await Promise.allSettled(keys.map((k) => settle(k)));
  }, []);

  useEffect(() => {
    void loadKeys(ALL_KEYS, false);
    const id = setInterval(() => void loadKeys(LIVE_KEYS, true), REFRESH_MS);
    return () => clearInterval(id);
  }, [loadKeys]);

  /* leaderboard */
  const [period, setPeriodRaw] = useState<Period>("overall");
  const [search, setSearch] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDq(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const key = `${period}|${dq}`;
  const [limitState, setLimitState] = useState({ key: "overall|", n: PAGE_SIZE });
  const limit = limitState.key === key ? limitState.n : PAGE_SIZE;
  const [board, setBoard] = useState<Res<BoardData>>(loadingRes());
  const reqId = useRef(0);

  const loadBoard = useCallback(
    async (silent: boolean) => {
      const id = ++reqId.current;
      if (!silent) setBoard((b) => ({ state: "loading", data: b.data, error: null }));
      try {
        const [pageRes, topRes] = await Promise.allSettled([
          getLeaderboard({ period, page: 1, pageSize: limit, search: dq }),
          dq ? getLeaderboard({ period, page: 1, pageSize: 3 }) : Promise.resolve<LeaderboardPage | null>(null),
        ]);
        if (id !== reqId.current) return;
        if (pageRes.status === "rejected") throw pageRes.reason;
        const page = pageRes.value;
        const top = topRes.status === "fulfilled" && topRes.value ? topRes.value.entries : page.entries.slice(0, 3);
        setBoard({ state: "ready", data: { key, page, top3: top }, error: null });
      } catch (e) {
        if (id !== reqId.current) return;
        setBoard((b) => (silent && b.data ? b : { state: "error", data: null, error: errMsg(e) }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionKey only forces a refetch
    [period, dq, limit, key, sessionKey],
  );

  useEffect(() => {
    void loadBoard(false);
    const id = setInterval(() => void loadBoard(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [loadBoard]);

  // when the viewer signs in / out / edits their profile, refresh the lists that can contain them
  const firstSession = useRef(true);
  useEffect(() => {
    if (firstSession.current) {
      firstSession.current = false;
      return;
    }
    void loadKeys(["winners", "activity"], true);
  }, [sessionKey, loadKeys]);

  return {
    ...state,
    retry: (k: DataKey) => void loadKeys([k], false),
    board,
    retryBoard: () => void loadBoard(false),
    period,
    setPeriod: (p: Period) => setPeriodRaw(p),
    search,
    setSearch,
    query: dq,
    hasMore: !!board.data && board.data.page.entries.length < board.data.page.total,
    loadMore: () => setLimitState({ key, n: limit + PAGE_SIZE }),
  };
}

type Landing = ReturnType<typeof useLandingData>;

/* ═══════════════════════════ NAV ════════════════════════════════════════ */
type Mode = "light" | "dark";
function ThemeToggle({ mode, onToggle }: { mode: Mode; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="relative grid size-11 shrink-0 place-items-center rounded-full text-mute transition hover:bg-ink/5 hover:text-ink">
      <Icon name="sun" size={18} className={cn("col-start-1 row-start-1 transition duration-500", mode === "dark" ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100")} />
      <Icon name="moon" size={18} className={cn("col-start-1 row-start-1 transition duration-500", mode === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0")} />
    </button>
  );
}

/** Avatar button + dropdown for a signed-in user. */
function AccountMenu() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const u = auth.user;
  if (!u) return null;
  const shown = u.name || u.email;
  const item = "flex h-11 w-full items-center rounded-xl px-3 text-left text-cell font-medium text-ink transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  return (
    <div ref={wrap} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-full transition hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
        <Avatar name={shown} src={u.avatarUrl} size={36} />
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-hairline bg-card p-2 shadow-xl">
          <div className="border-b border-hairline px-3 pb-3 pt-2">
            <div className="truncate text-cell font-semibold text-ink">{shown}</div>
            <div className="truncate text-meta text-mute">{u.email}</div>
          </div>
          <div className="pt-2">
            <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); auth.openModal("card"); }}>My rank card</button>
            <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); auth.openModal("photo"); }}>Change photo</button>
            <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); void auth.logout(); }}>Log out</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Nav({ mode, onToggle, declared }: { mode: Mode; onToggle: () => void; declared: boolean }) {
  const auth = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);
  const links = [
    { href: "#leaderboard", label: "Leaderboard" },
    { href: "#winners", label: declared ? "Winners" : "Leaders" },
    { href: "#how", label: "How to enter" },
    { href: "#faq", label: "FAQs" },
  ];
  return (
    <header className={cn(WRAP, "sticky top-4 z-50 mt-4")}>
      <div className={cn("flex h-16 items-center justify-between gap-4 rounded-full border bg-bg/60 pl-5 pr-2 backdrop-blur-xl transition duration-300", scrolled || open ? "border-hairline bg-bg/80 shadow-[0_8px_30px_-12px_rgba(0,0,0,.18)]" : "border-hairline/60")}>
        <a href="#top" className="inline-flex items-center gap-2 text-ctitle text-ink" aria-label={`${BRAND.name} home`}>
          <LogoGlyph size={24} />
          {BRAND.name}
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="flex h-11 items-center rounded-full px-4 text-cell font-medium text-mute transition hover:bg-accent/10 hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle mode={mode} onToggle={onToggle} />
          {auth.user ? (
            <AccountMenu />
          ) : (
            <>
              <span className="hidden sm:contents"><Button variant="ghost" href={URLS.login} onClick={(e) => { e.preventDefault(); auth.openModal("join"); }}>Log in</Button></span>
              <Button href={URLS.join} onClick={(e) => { e.preventDefault(); auth.openModal("join"); }}><span className="sm:hidden">Join</span><span className="hidden sm:inline">Join the pool</span></Button>
            </>
          )}
          <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}
            className="grid size-11 place-items-center rounded-full text-ink transition hover:bg-ink/5 md:hidden">
            <Icon name={open ? "x" : "menu"} size={20} />
          </button>
        </div>
      </div>
      <div id="mobile-menu" aria-hidden={!open}
        className={cn("absolute inset-x-5 top-full mt-2 origin-top rounded-2xl border border-hairline bg-card p-3 shadow-xl transition duration-300 sm:inset-x-8 md:hidden", open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0")}>
        {links.map((l) => (
          <a key={l.href} href={l.href} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className="flex h-12 items-center border-b border-hairline px-3 text-body font-medium">
            {l.label}
          </a>
        ))}
        {!auth.user && (
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" href={URLS.login} className="flex-1" onClick={(e) => { e.preventDefault(); setOpen(false); auth.openModal("join"); }}>Log in</Button>
            <Button href={URLS.join} className="flex-1" onClick={(e) => { e.preventDefault(); setOpen(false); auth.openModal("join"); }}>Join the pool</Button>
          </div>
        )}
      </div>
    </header>
  );
}

/* ═══════════════════════════ COUNTDOWN ══════════════════════════════════ */
function Countdown({ target, label, compact }: { target: string; label: string; compact?: boolean }) {
  const now = useNow(1000);
  const ms = now === null ? null : Math.max(0, Date.parse(target) - now);
  const minuteKey = ms === null ? -1 : Math.floor(ms / 60000);
  // screen-reader text changes once a minute (polite + throttled)
  const live = useMemo(() => {
    if (minuteKey < 0) return "";
    return `${label}: ${Math.floor(minuteKey / 1440)} days, ${Math.floor((minuteKey % 1440) / 60)} hours, ${minuteKey % 60} minutes`;
  }, [minuteKey, label]);
  const total = ms === null ? 0 : Math.floor(ms / 1000);
  const parts = [
    { v: Math.floor(total / 86400), u: "Days" },
    { v: Math.floor((total % 86400) / 3600), u: "Hrs" },
    { v: Math.floor((total % 3600) / 60), u: "Min" },
    { v: total % 60, u: "Sec" },
  ];
  return (
    <div>
      <div className="mb-2 text-label uppercase text-faint">{label}</div>
      <div className="grid grid-cols-4 gap-2" aria-hidden="true">
        {parts.map((p) => (
          <div key={p.u} className={cn("rounded-xl border border-hairline bg-alt text-center", compact ? "px-1 py-2" : "px-2 py-3")}>
            <b className="block text-ctitle tabular-nums">{ms === null ? "––" : String(p.v).padStart(2, "0")}</b>
            <span className="text-label uppercase text-faint">{p.u}</span>
          </div>
        ))}
      </div>
      <span className="sr-only" aria-live="polite" role="timer">{live}</span>
    </div>
  );
}

function countdownTarget(c: Competition | null): { t: string; l: string } | null {
  if (!c || c.status === "ended" || c.status === "winners_declared") return null;
  if (c.status === "registration_open") return { t: c.registrationClosesAt, l: "Registration closes in" };
  if (c.status === "upcoming") return { t: c.startsAt, l: "Contest starts in" };
  return { t: c.endsAt, l: "Contest ends in" };
}

/* ═══════════════════════════ HERO ═══════════════════════════════════════ */
function Word({ i, grad, children }: { i: number; grad?: boolean; children: ReactNode }) {
  return (
    <span className="fg-word inline-block overflow-hidden pb-1 align-top">
      <span className={grad ? GRAD_TEXT : undefined} style={{ "--w": i } as CSSProperties}>{children}</span>
    </span>
  );
}

const MEDAL = {
  1: { badge: "bg-linear-to-br from-[#ffe08a] to-gold text-[#1b1405]", ped: "from-gold/35 to-gold/5 border-gold/40", ink: "text-gold" },
  2: { badge: "bg-linear-to-br from-[#f1f4fb] to-silver text-[#1b1405]", ped: "from-silver/35 to-silver/5 border-silver/40", ink: "text-silver" },
  3: { badge: "bg-linear-to-br from-[#f0c29b] to-bronze text-[#1b1405]", ped: "from-bronze/35 to-bronze/5 border-bronze/40", ink: "text-bronze" },
} as const;
const rankBadge = (rank: number, zone: boolean) =>
  cn("grid size-7 shrink-0 place-items-center rounded-full text-meta font-semibold", rank <= 3 ? MEDAL[rank as 1 | 2 | 3].badge : zone ? "bg-accent/10 text-accent" : "bg-ink/5 text-mute");

function Top3Card({ d }: { d: Landing }) {
  const f = useFmt();
  const c = d.competition.data;
  const declared = c?.status === "winners_declared";
  const heading = d.winners.data?.heading ?? (declared ? "Winners" : "Current leaders (provisional)");
  const board = d.board.data && d.board.data.key.startsWith("overall") ? d.board.data.top3 : null;
  const rows: { rank: number; name: string; avatar: string | null; saved: number; flag: string; movement: number; prev: number | null; hasMv: boolean }[] | null =
    board && board.length >= 3
      ? board.slice(0, 3).map((e) => ({ rank: e.rank, name: e.name, avatar: e.avatarUrl, saved: e.brokerageSaved, flag: e.countryCode, movement: e.movement, prev: e.previousRank, hasMv: true }))
      : d.winners.data && d.winners.data.winners.length >= 3
        ? d.winners.data.winners.slice(0, 3).map((w) => ({ rank: w.rank, name: w.name, avatar: w.avatarUrl, saved: w.brokerageSaved, flag: w.countryCode, movement: 0, prev: 0, hasMv: false }))
        : null;
  const cd = countdownTarget(c);
  return (
    <div className={cn("fg-in relative overflow-clip rounded-2xl border border-hairline bg-card/70 p-5 backdrop-blur-xl md:p-6", SHADOW)} style={{ "--hd": "400ms" } as CSSProperties}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-label uppercase text-mute">
          <Icon name="trophy" size={14} className="text-accent" />
          {heading}
        </span>
        <LiveDot on={!declared} />
      </div>
      <div className="flex flex-col gap-1" role="list" aria-label="Top three">
        {rows
          ? rows.map((r) => (
              <div key={r.rank} role="listitem" className="flex h-14 items-center gap-3 rounded-xl px-3 transition hover:bg-accent/10">
                <span className={rankBadge(r.rank, true)}>{r.rank}</span>
                <Avatar name={r.name} src={r.avatar} size={36} />
                <span className="min-w-0 flex-1 truncate text-cell font-medium text-ink">{r.name}</span>
                {r.hasMv && <Movement movement={r.movement} previousRank={r.prev} />}
                <span className="text-cell font-semibold tabular-nums text-ink">{f.money(r.saved)}</span>
              </div>
            ))
          : [0, 1, 2].map((i) => (
              <div key={i} className="flex h-14 items-center gap-3 px-3">
                <Sk w={28} h={28} className="rounded-full" />
                <Sk w={36} h={36} className="rounded-full" />
                <Sk h={16} className="flex-1" />
                <Sk w={64} h={16} />
              </div>
            ))}
      </div>
      {cd && (
        <div className="mt-4 border-t border-hairline pt-4">
          <Countdown target={cd.t} label={cd.l} compact />
        </div>
      )}
      <a href="#leaderboard" className="mt-4 inline-flex h-11 items-center gap-2 text-cell font-semibold text-accent transition hover:gap-3">
        View full leaderboard <Icon name="arrow" size={16} />
      </a>
    </div>
  );
}

function SpecStat({ label, unit, loading, children }: { label: string; unit?: string; loading: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-4">
      <div className="min-h-9 text-spec text-ink">
        {loading ? (
          <Sk w="70%" h={32} />
        ) : (
          <>
            {children}
            {unit && <small className="ml-1 text-meta font-medium text-mute">{unit}</small>}
          </>
        )}
      </div>
      <div className="mt-1 truncate text-label uppercase text-faint">{label}</div>
    </div>
  );
}

function Hero({ d }: { d: Landing }) {
  const f = useFmt();
  const auth = useAuth();
  const now = useNow(60000);
  const c = d.competition.data;
  const p = d.pool.data;
  const status = c?.status;
  const ended = status === "ended" || status === "winners_declared";
  const daysLeft = c && now !== null ? Math.max(0, Math.ceil((Date.parse(c.endsAt) - now) / 86400000)) : null;
  const hd = (ms: number) => ({ "--hd": `${ms}ms` }) as CSSProperties;
  return (
    <section id="top" aria-label="Introduction" className="relative -mt-20 isolate overflow-clip pb-16 pt-32 md:pb-20 md:pt-36">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="fg-grid absolute inset-0 opacity-[0.04]" />
        <div className="absolute -left-24 -top-24 size-[420px] animate-[f-drift1_20s_ease-in-out_infinite_alternate] rounded-full bg-accent/15 blur-[80px]" />
        <div className="absolute -right-16 top-8 size-[380px] animate-[f-drift2_24s_ease-in-out_infinite_alternate] rounded-full bg-accent-2/15 blur-[80px]" />
      </div>
      <div className={cn(WRAP, "grid items-center gap-10 text-center lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:text-left")}>
        <div className="flex flex-col items-center lg:items-start">
          <div className="fg-in" style={hd(0)}>
            {c ? (
              <span className="inline-flex h-8 items-center gap-2 rounded-full border border-hairline-strong bg-card/70 px-4 text-meta font-medium backdrop-blur">
                <LiveDot on={status === "active" || status === "registration_open"} />
                {STATUS_LABEL[c.status].badge}
              </span>
            ) : d.competition.state === "error" ? (
              <span className="inline-flex h-8 items-center rounded-full border border-hairline-strong px-4 text-meta font-medium">{BRAND.tagline}</span>
            ) : (
              <Sk w={176} h={32} className="rounded-full" />
            )}
          </div>
          <h1 className="mt-5 text-hero text-ink">
            <span className="block"><Word i={0}>Trade</Word> <Word i={1}>smart.</Word></span>
            <span className="block"><Word i={2}>Climb</Word> <Word i={3}>the</Word> <Word i={4} grad>Board!</Word></span>
          </h1>
          <div className="fg-in mt-5 min-h-[52px] max-w-[480px] text-lead text-mute" style={hd(700)}>
            {c ? c.subtitle : d.competition.state === "error" ? "Trade as you normally do and climb the leaderboard." : (
              <div className="grid gap-2"><Sk h={16} /><Sk h={16} w="70%" /></div>
            )}
          </div>
          <div className="fg-in mt-8 flex flex-wrap justify-center gap-3 lg:justify-start" style={hd(850)}>
            {ended ? (
              <Button size="lg" href="#winners">{status === "winners_declared" ? "See the winners" : "See the final standings"}</Button>
            ) : (
              <Button size="lg" href={URLS.join} onClick={(e) => { e.preventDefault(); auth.user ? auth.openModal("card") : auth.openModal("join"); }}>{auth.user ? "My rank card" : "Join the pool"}</Button>
            )}
            <Button size="lg" variant="ghost" href="#leaderboard">View leaderboard</Button>
          </div>
          <div className="fg-in mt-10 grid w-full max-w-[480px] grid-cols-3 divide-x divide-hairline rounded-2xl border border-hairline bg-card/60 text-left backdrop-blur" style={hd(1000)} role="group" aria-label="Contest at a glance">
            <SpecStat label="Pool" loading={!p}>{p && <CountUp value={p.poolSize} format={f.compact} />}</SpecStat>
            <SpecStat label="Enrolled" loading={!p}>{p && <CountUp value={p.tradersEnrolled} format={f.num} />}</SpecStat>
            <SpecStat label="Days left" loading={!c || daysLeft === null} unit={ended || daysLeft === 0 ? undefined : "days"}>
              {c && daysLeft !== null && (ended || daysLeft === 0 ? "Ended" : <CountUp value={daysLeft} format={(n) => String(n)} duration={1200} />)}
            </SpecStat>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[520px] text-left lg:mx-0 lg:ml-auto">
          <Top3Card d={d} />
        </div>
      </div>
    </section>
  );
}

function TickerItem({ a }: { a: ActivityItem }) {
  const f = useFmt();
  const icon = a.kind === "saving" ? "bolt" : a.kind === "rank_up" ? "up" : "userplus";
  return (
    <span className="inline-flex h-11 items-center gap-2 whitespace-nowrap border-r border-hairline px-6 text-meta text-mute">
      <span className="grid size-5 place-items-center rounded-full bg-accent/10 text-accent"><Icon name={icon} size={12} /></span>
      <b className="font-semibold text-ink">{a.name}</b>
      {a.kind === "saving" && <>saved <span className="font-semibold text-up">{f.money(a.amount)}</span> on {a.segment}</>}
      {a.kind === "rank_up" && <>climbed the board in {a.segment}</>}
      {a.kind === "joined" && <>joined the pool · {a.segment}</>}
      <span className="text-faint">· {timeAgo(a.at)}</span>
    </span>
  );
}

function TickerStrip({ d }: { d: Landing }) {
  return (
    <div role="region" aria-label="Live activity" className="flex h-11 items-center overflow-hidden border-y border-hairline bg-bg">
      <Async res={d.activity} what="activity" onRetry={() => d.retry("activity")}
        skeleton={<div className="flex w-full gap-6 px-6"><Sk w={240} h={16} /><Sk w={200} h={16} /><Sk w={260} h={16} /><Sk w={220} h={16} /></div>}
        isEmpty={(a) => a.length === 0} emptyText="Activity will show up here as traders save.">
        {(items) => (
          <Track dur={Math.max(40, items.length * 7)}>
            {items.map((a) => <TickerItem key={a.id} a={a} />)}
          </Track>
        )}
      </Async>
    </div>
  );
}

/* ═══════════════════════════ LEADERBOARD ════════════════════════════════ */
const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "overall", label: "Overall" },
];
const COLS = "grid-cols-[28px_minmax(0,1fr)_auto] md:grid-cols-[28px_minmax(0,1fr)_56px_56px_64px_152px] lg:grid-cols-[28px_minmax(0,1fr)_72px_152px] xl:grid-cols-[28px_minmax(0,1fr)_56px_56px_64px_152px]";
const PED = { 1: "h-10 [--pd:300ms]", 2: "h-8 [--pd:100ms]", 3: "h-6 [--pd:500ms]" } as const;

function Podium({ entries, heading, tiers, declared }: { entries: LeaderboardEntry[]; heading: string; tiers: PrizeTier[] | null; declared: boolean }) {
  const f = useFmt();
  const top = entries.slice(0, 3);
  if (top.length < 3) return null;
  const order = { 1: "sm:order-2", 2: "sm:order-1", 3: "sm:order-3" } as const;
  return (
    <Card className="mb-4 pb-0 md:mb-6 md:pb-0">
      <div className="flex items-center justify-center gap-2 text-label uppercase text-mute">
        <Icon name="trophy" size={14} className="text-accent" />
        {heading}
      </div>
      <InView className="mt-4 grid grid-cols-1 gap-2 pb-4 sm:grid-cols-3 sm:items-end sm:gap-4 sm:pb-0" threshold={0.25}>
        {top.map((e) => {
          const r = e.rank as 1 | 2 | 3;
          const prize = tiers?.find((t) => t.id === e.prizeTierId)?.reward;
          return (
            <div key={e.rank} className={cn("flex min-w-0 flex-col", order[r])}>
              <div className="relative flex items-center gap-3 rounded-xl bg-alt p-3 sm:flex-col sm:gap-1 sm:bg-transparent sm:px-1 sm:pb-3 sm:pt-5 sm:text-center">
                {r === 1 && (
                  <>
                    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 hidden size-36 -translate-x-1/2 animate-[f-breathe_5s_ease-in-out_infinite] rounded-full bg-gold/20 blur-2xl sm:block" />
                    <Crown className="absolute -top-1 left-1/2 -ml-[14px] hidden h-6 w-7 text-gold opacity-0 drop-shadow sm:block group-data-[in=true]/iv:animate-[f-crown_.7s_cubic-bezier(.3,1.5,.5,1)_.6s_forwards]" />
                  </>
                )}
                <div className="relative shrink-0" role="img" aria-label={`Rank ${r}`}>
                  <span className={cn("block rounded-full p-[3px]", MEDAL[r].badge)}><Avatar name={e.name} src={e.avatarUrl} size={r === 1 ? 56 : 48} className="border-2 border-card" /></span>
                  <span className={cn("absolute -bottom-1 -left-1 grid size-6 place-items-center rounded-full border-2 border-card text-meta font-semibold", MEDAL[r].badge)}>{r}</span>
                  <span className="absolute -bottom-1 -right-1 grid rounded-full border-2 border-card bg-card"><Flag code={e.countryCode} size={14} /></span>
                </div>
                <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
                  <div className="truncate text-cell font-medium text-ink">{e.name}</div>
                  <div className={cn("text-ink", r === 1 ? "text-pod1" : "text-pod")}>
                    <CountUp value={e.brokerageSaved} format={f.money} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:items-center">
                  {prize && <span className="hidden sm:block"><Pill tone="accent" className="max-w-full whitespace-normal text-center">{prize}</Pill></span>}
                  <Movement movement={e.movement} previousRank={e.previousRank} />
                </div>
              </div>
              <div aria-hidden="true" className={cn("hidden origin-bottom scale-y-0 place-items-center rounded-t-xl border border-b-0 bg-linear-to-b text-ctitle transition duration-700 ease-soft [transition-delay:var(--pd)] group-data-[in=true]/iv:scale-y-100 sm:grid", PED[r], MEDAL[r].ped, MEDAL[r].ink)}>
                {r}
              </div>
            </div>
          );
        })}
      </InView>
      <span className="sr-only">{declared ? "Final podium" : "Provisional podium"}</span>
    </Card>
  );
}

function Row({ e, i, plain }: { e: LeaderboardEntry; i: number; plain?: boolean }) {
  const f = useFmt();
  return (
    <div role="row" style={{ "--i": i } as CSSProperties}
      className={cn("grid min-h-[60px] items-center gap-x-3 border-b border-hairline px-4 py-3 text-cell transition-colors hover:bg-accent/10 md:h-[60px] md:py-0", COLS,
        !plain && "opacity-0 [animation-delay:calc(var(--i,0)*40ms)] group-data-[in=true]/iv:animate-[f-rowin_.5s_var(--ease)_both]",
        e.inWinningZone && "bg-accent/[0.04] shadow-[inset_2px_0_0_var(--accent)]", e.isYou && "bg-accent/10")}>
      <div role="cell"><span className={rankBadge(e.rank, e.inWinningZone)}>{e.rank}</span></div>
      <div role="cell" className="min-w-0">
        <div className="flex items-center gap-3">
          <Avatar name={e.name} src={e.avatarUrl} size={36} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate font-medium text-ink">{e.name}</span>
              {e.isYou && <Pill tone="accent">You</Pill>}
            </div>
            <div className="hidden truncate text-meta text-faint md:block">{e.city} · {e.topSegment}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-mute md:hidden">
              <Movement movement={e.movement} previousRank={e.previousRank} />
              <span>{f.num(e.tradesCount)} trades</span>
              <span>{e.city}</span>
            </div>
          </div>
        </div>
      </div>
      <div role="cell" className="hidden md:block lg:hidden xl:block"><Movement movement={e.movement} previousRank={e.previousRank} /></div>
      <div role="cell" className="hidden text-right tabular-nums md:block">{f.num(e.tradesCount)}</div>
      <div role="cell" className="hidden md:block lg:hidden xl:block"><Sparkline values={e.trend} /></div>
      <div role="cell" className="flex items-center justify-end gap-2 font-semibold tabular-nums text-ink">
        {f.money(e.brokerageSaved)}
        <Flag code={e.countryCode} />
      </div>
    </div>
  );
}

function SideCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("p-5 md:p-5", className)}>
      <h3 className="mb-3 text-ctitle text-ink">{title}</h3>
      {children}
    </Card>
  );
}

function Sidebar({ d, cutoff, you }: { d: Landing; cutoff: { rank: number; saved: number } | null; you: LeaderboardEntry | null }) {
  const f = useFmt();
  return (
    <aside aria-label="Contest summary" className="fg-scroll flex flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
      <SideCard title="Winning zone">
        {cutoff ? (
          <>
            <div className="text-stat text-ink">{f.money(cutoff.saved)}</div>
            <p className="mt-1 text-meta text-mute">needed to enter the top {cutoff.rank}.{you && you.brokerageSaved < cutoff.saved ? ` You are ${f.money(cutoff.saved - you.brokerageSaved)} away.` : ""}</p>
          </>
        ) : (
          <div className="grid gap-2"><Sk h={32} w="60%" /><Sk h={14} /></div>
        )}
      </SideCard>

      <SideCard title="Prizes">
        <Async res={d.prizes} what="prizes" onRetry={() => d.retry("prizes")} skeleton={<div className="grid gap-3"><Sk h={20} /><Sk h={20} /><Sk h={20} /></div>} isEmpty={(t) => t.length === 0}>
          {(tiers) => (
            <ul className="grid gap-3">
              {tiers.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 text-cell">
                  <span className="font-medium text-ink">{t.ranksFrom === t.ranksTo ? `#${t.ranksFrom}` : `#${t.ranksFrom}–${t.ranksTo}`}</span>
                  <span className="text-right text-mute">{t.reward}</span>
                </li>
              ))}
            </ul>
          )}
        </Async>
      </SideCard>

      <SideCard title="Recent activity">
        <Async res={d.activity} what="activity" onRetry={() => d.retry("activity")} skeleton={<div className="grid gap-3">{[0, 1, 2, 3, 4].map((i) => <Sk key={i} h={20} />)}</div>} isEmpty={(a) => a.length === 0}>
          {(items) => (
            <ul className="grid gap-3">
              {items.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-meta">
                  <Avatar name={a.name} src={a.avatarUrl} size={36} />
                  <span className="min-w-0 flex-1 truncate text-mute"><b className="font-semibold text-ink">{a.name}</b> {a.kind === "saving" ? <>saved <b className="font-semibold text-up">{f.money(a.amount)}</b></> : a.kind === "rank_up" ? "climbed the board" : "joined the pool"}</span>
                  <span className="shrink-0 text-faint">{timeAgo(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Async>
      </SideCard>
    </aside>
  );
}

function LeaderboardSection({ d }: { d: Landing }) {
  const f = useFmt();
  const c = d.competition.data;
  const declared = c?.status === "winners_declared";
  const metric = c?.metricLabel ?? "Brokerage Saved";
  const metricHelp = c?.metricHelp ?? "";
  const tiers = d.prizes.data;
  const idx = PERIODS.findIndex((p) => p.id === d.period);
  const data = d.board.data;
  const stale = !!data && data.key.split("|")[0] !== d.period;
  const busy = d.board.state === "loading" && !!data && !stale;
  const tabsRef = useRef<HTMLDivElement>(null);
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (idx + (e.key === "ArrowRight" ? 1 : PERIODS.length - 1)) % PERIODS.length;
    d.setPeriod(PERIODS[n].id);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>("button")[n]?.focus();
  };
  const rows = data ? (d.query ? data.page.entries : data.page.entries.filter((e) => e.rank > 3)) : [];
  const you = data ? (data.page.you ?? data.page.entries.find((e) => e.isYou) ?? null) : null;

  return (
    <Section id="leaderboard" alt>
      <SectionHead id="leaderboard" eyebrow="Leaderboard" title={<>Who&apos;s climbing the board</>}
        sub={<>Ranked by <b className="font-semibold text-ink">{metric}</b>: the brokerage refunded to each trader from the pool. {declared ? "Final standings are verified and locked." : "Ranks 1 to 20 are the winning zone. They are current leaders until winners are declared."}</>} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <Reveal>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6">
              <div role="tablist" aria-label="Leaderboard period" ref={tabsRef} onKeyDown={onTabKey} className="relative grid h-11 w-full grid-cols-3 rounded-full border border-hairline bg-ink/5 p-1 sm:w-[360px]">
                <span aria-hidden="true" className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full bg-linear-to-br from-accent to-accent-2 shadow-md transition-transform duration-500 ease-soft" style={{ transform: `translateX(${idx * 100}%)` }} />
                {PERIODS.map((p) => (
                  <button key={p.id} type="button" role="tab" id={`tab-${p.id}`} aria-selected={d.period === p.id} aria-controls="board-panel" tabIndex={d.period === p.id ? 0 : -1} onClick={() => d.setPeriod(p.id)}
                    className={cn("relative z-10 h-9 rounded-full text-cell font-medium transition-colors", d.period === p.id ? "text-accent-ink" : "text-mute hover:text-ink")}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:max-w-[300px]">
                <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-faint" />
                <input type="search" value={d.search} onChange={(e) => d.setSearch(e.target.value)} placeholder="Search traders" aria-label="Search traders" autoComplete="off" spellCheck={false}
                  className="h-11 w-full rounded-xl border border-hairline-strong bg-card pl-10 pr-11 text-cell text-ink outline-none transition placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent/15" />
                {d.search && (
                  <button type="button" aria-label="Clear search" onClick={() => d.setSearch("")} className="absolute right-0 top-0 grid size-11 place-items-center text-faint hover:text-ink"><Icon name="x" size={16} /></button>
                )}
              </div>
            </div>
          </Reveal>

          <div id="board-panel" role="tabpanel" aria-labelledby={`tab-${d.period}`} aria-busy={d.board.state === "loading"}>
            <Async res={stale ? { state: "loading", data: null, error: null } : d.board} what="the leaderboard" onRetry={d.retryBoard}
              skeleton={
                <>
                  <Card className="mb-4 md:mb-6"><Sk h={216} className="rounded-xl" /></Card>
                  <Card className="grid gap-3 p-4 md:p-4">{[0, 1, 2, 3, 4, 5].map((i) => <Sk key={i} h={44} />)}</Card>
                </>
              }>
              {(b) => (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-meta text-mute">
                    <span aria-live="polite"><b className="font-semibold text-ink">{f.num(b.page.total)}</b> {b.page.total === 1 ? "trader" : "traders"}{d.query ? <> match &ldquo;{d.query}&rdquo;</> : " ranked"}</span>
                    <span className="inline-flex items-center gap-2"><LiveDot />Last updated <Ago iso={b.page.updatedAt} /></span>
                  </div>
                  <Podium key={b.key.split("|")[0]} entries={b.top3} heading={d.winners.data?.heading ?? (declared ? "Winners" : "Current leaders (provisional)")} tiers={tiers} declared={declared} />
                  <Card className={cn("p-0 md:p-0 transition-opacity", busy && "opacity-60")}>
                    {rows.length === 0 ? (
                      <div className="px-5 py-12 text-center text-body text-mute">
                        <b className="mb-1 block text-ctitle text-ink">No trader matches &lsquo;{d.query}&rsquo;</b>
                        Check the spelling, or try a shorter name.
                        <div className="mt-4"><Button variant="ghost" onClick={() => d.setSearch("")}>Clear search</Button></div>
                      </div>
                    ) : (
                      <div role="table" aria-label={`${PERIODS[idx].label} leaderboard`}>
                        <div role="row" className={cn("sticky top-24 z-10 hidden h-11 items-center gap-x-3 rounded-t-2xl border-b border-hairline bg-card/90 px-4 text-label uppercase text-faint backdrop-blur-md md:grid", COLS)}>
                          <div role="columnheader">#</div>
                          <div role="columnheader">Participant</div>
                          <div role="columnheader" className="lg:hidden xl:block">Move</div>
                          <div role="columnheader" className="text-right">Trades</div>
                          <div role="columnheader" className="lg:hidden xl:block">Trend</div>
                          <div role="columnheader" className="flex items-center justify-end whitespace-nowrap">{metric}{metricHelp && <InfoTip text={metricHelp} label={`What is ${metric}?`} />}</div>
                        </div>
                        <InView key={b.key} threshold={0.05}>
                          <div role="rowgroup">
                            {rows.map((e, i) => (
                              <div key={`${b.key}-${e.rank}`} className="contents">
                                <Row e={e} i={i % PAGE_SIZE} />
                                {!d.query && e.rank === b.page.cutoffRank && (
                                  <div role="row" style={{ "--i": (i % PAGE_SIZE) + 1 } as CSSProperties} className="flex min-h-11 items-center gap-3 border-b border-hairline bg-accent/10 px-4 text-meta font-semibold text-accent">
                                    <span aria-hidden="true" className="h-px flex-1 bg-accent/30" />
                                    <span role="cell" className="text-center">Winning zone cutoff · {f.money(b.page.cutoffSaved)} needed to enter the top {b.page.cutoffRank}</span>
                                    <span aria-hidden="true" className="h-px flex-1 bg-accent/30" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </InView>
                      </div>
                    )}
                    {you && (
                      <div className="fg-gborder sticky bottom-4 z-10 m-3 overflow-clip rounded-xl shadow-xl" role="complementary" aria-label="Your rank">
                        <span className="absolute right-3 top-0 z-10 rounded-b-md bg-linear-to-br from-accent to-accent-2 px-2 pb-0.5 text-label uppercase text-accent-ink">Your rank</span>
                        <Row e={you} i={0} plain />
                      </div>
                    )}
                    {d.hasMore && (
                      <div className="flex justify-center p-5"><Button variant="ghost" onClick={d.loadMore} disabled={busy}>Load more</Button></div>
                    )}
                  </Card>
                  <div className="mt-4 flex flex-wrap justify-between gap-2 px-1 text-meta text-faint">
                    <span>Showing {f.num(b.page.entries.length)} of {f.num(b.page.total)}</span>
                    <span>Names and photos are shown only for traders who opted in.</span>
                  </div>
                </>
              )}
            </Async>
          </div>
        </div>
        <div className="lg:col-span-4">
          <Sidebar d={d} cutoff={data ? { rank: data.page.cutoffRank, saved: data.page.cutoffSaved } : null} you={you} />
        </div>
      </div>
    </Section>
  );
}

/* ═══════════════════════════ POOL (bento) ═══════════════════════════════ */
function PoolSection({ d }: { d: Landing }) {
  const f = useFmt();
  const head = combine(d.competition, d.pool);
  const stagger = (i: number) => ({ "--i": i }) as CSSProperties;
  return (
    <Section id="pool">
      <SectionHead id="pool" eyebrow="The pool" title="Where the money goes" sub="A fixed pool refunds trading brokerage to participants until it runs out. Here is how much has been used so far." />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <Reveal className="h-full lg:col-span-2">
          <Card className="h-full">
            <Async res={head} what="pool overview" onRetry={() => { d.retry("competition"); d.retry("pool"); }}
              skeleton={<div className="grid gap-4"><Sk h={28} w="50%" /><Sk h={8} className="rounded-full" /><Sk h={200} className="rounded-xl" /></div>}>
              {([c, p]) => (
                <InView>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <h3 className="flex flex-wrap items-center gap-3 text-ctitle text-ink">
                      {c.title}
                      <Pill tone="accent" className="tracking-[0.14em]"><LiveDot on={c.status === "active" || c.status === "registration_open"} />{STATUS_LABEL[c.status].pill}</Pill>
                    </h3>
                    <span className="text-meta text-mute">{f.date(c.startsAt)} – {f.date(c.endsAt)}</span>
                  </div>
                  <div className="mt-5 text-body text-mute">
                    <b className="text-feat text-ink"><CountUp value={p.used} format={f.money} /></b> of {f.money(p.poolSize)} refunded so far
                  </div>
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-meta text-mute">
                    <div className="flex gap-1"><dt>Remaining</dt><dd className="font-semibold text-ink">{f.money(p.remaining)}</dd></div>
                    <div className="flex gap-1"><dt>Turnover</dt><dd className="font-semibold text-ink">{f.compact(p.totalTurnover)}</dd></div>
                    <div className="flex gap-1"><dt>Largest saving</dt><dd className="font-semibold text-ink">{f.money(p.largestSingleSaving)}</dd></div>
                  </dl>
                  <div className="mt-6 text-label uppercase text-faint">Pool used, last 14 days</div>
                  <div className="mt-3 min-h-[200px]">
                    <Async res={d.history} what="pool history" onRetry={() => d.retry("history")} skeleton={<Sk h={200} className="rounded-xl" />} isEmpty={(h) => h.length < 2}>
                      {(h) => (
                        <AreaChart labels={h.map((x) => f.date(x.date, { day: "numeric", month: "short", year: undefined }))} values={h.map((x) => x.used)} formatY={f.compact}
                          formatTip={(i) => `${f.date(h[i].date, { day: "numeric", month: "short", year: undefined })} · ${f.money(h[i].used)}`}
                          ariaLabel={`Area chart of cumulative pool used, from ${f.money(h[0].used)} to ${f.money(h[h.length - 1].used)}`} />
                      )}
                    </Async>
                  </div>
                  <div className="mt-5 flex items-start gap-3 rounded-xl bg-accent/10 p-4 text-cell text-mute">
                    <Icon name="info" size={16} className="mt-0.5 text-accent" />
                    <span><b className="font-semibold text-ink">{c.metricLabel}.</b> {c.metricHelp}</span>
                  </div>
                </InView>
              )}
            </Async>
          </Card>
        </Reveal>
        <Reveal variant="right" className="h-full">
          <Card className="h-full">
            <h3 className="text-ctitle text-ink">Saved by segment</h3>
            <p className="mb-5 mt-1 text-meta text-mute">Where the refunds are coming from</p>
            <Async res={d.segments} what="segment breakdown" onRetry={() => d.retry("segments")} skeleton={<div className="grid gap-5">{[0, 1, 2, 3].map((i) => <Sk key={i} h={40} />)}</div>} isEmpty={(s) => s.length === 0}>
              {(segs) => (
                <InView className="grid gap-5">
                  {segs.map((s, i) => (
                    <div key={s.segment}>
                      <div className="flex items-baseline justify-between gap-3 text-cell">
                        <span className="font-medium text-ink">{s.segment}</span>
                        <span className="text-meta text-mute">{f.money(s.saved)} · {s.sharePct}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
                        <div className="fg-bar h-full rounded-full bg-linear-to-r from-accent to-accent-2" style={{ "--p": s.sharePct / 100, transitionDelay: `${i * 100 + 150}ms` } as CSSProperties} />
                      </div>
                    </div>
                  ))}
                </InView>
              )}
            </Async>
          </Card>
        </Reveal>
      </div>
      <InView className="mt-4 grid grid-cols-2 gap-4 md:mt-6 md:gap-6 lg:grid-cols-4">
        {d.pool.data ? (
          <>
            <div className={ST} style={stagger(0)}><Stat label="Traders enrolled"><CountUp value={d.pool.data.tradersEnrolled} format={f.num} /></Stat></div>
            <div className={ST} style={stagger(1)}><Stat label="Traders benefited"><CountUp value={d.pool.data.tradersBenefited} format={f.num} /></Stat></div>
            <div className={ST} style={stagger(2)}><Stat label="Total trades"><CountUp value={d.pool.data.totalTrades} format={f.num} /></Stat></div>
            <div className={ST} style={stagger(3)}><Stat label="Avg saved / trader"><CountUp value={d.pool.data.avgSavedPerBeneficiary} format={f.auto} /></Stat></div>
          </>
        ) : d.pool.state === "error" ? (
          <div className="col-span-full"><ErrorBox message={d.pool.error} onRetry={() => d.retry("pool")} what="pool stats" /></div>
        ) : (
          [0, 1, 2, 3].map((i) => <Sk key={i} h={98} className="rounded-xl" />)
        )}
      </InView>
    </Section>
  );
}

/* ═══════════════════════════ WINNERS / CHAMPION ═════════════════════════ */
function ChampionCard({ e, isFinal }: { e: LeaderboardEntry; isFinal: boolean }) {
  const f = useFmt();
  return (
    <Card spot className="fg-gborder fg-wash h-full">
      <Pill tone="accent" className="uppercase tracking-[0.1em]"><Icon name="trophy" size={12} />{isFinal ? "Champion" : "Current #1 · provisional"}</Pill>
      <div className="mt-4 flex items-center gap-4"><Avatar name={e.name} src={e.avatarUrl} size={64} /><div className="min-w-0 break-words text-title text-ink">{e.name}</div></div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-cell text-mute">
        <Flag code={e.countryCode} />{e.city}
        {(e.movement !== 0 || e.previousRank === null) && (<><span aria-hidden="true">·</span><Movement movement={e.movement} previousRank={e.previousRank} /></>)}
      </div>
      <div className={cn("mt-5 text-feat", GRAD_TEXT)}><CountUp value={e.brokerageSaved} format={f.money} /></div>
      <div className="mb-4 text-meta text-mute">brokerage saved</div>
      <AreaChart labels={e.trend.map((_, i) => `Day ${i + 1}`)} values={e.trend} formatY={f.compact} formatTip={(i) => `Day ${i + 1} · ${f.money(e.trend[i])}`} height={180}
        ariaLabel={`Cumulative brokerage saved by ${e.name} over 14 days, ending at ${f.money(e.brokerageSaved)}`} />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Saved", f.money(e.brokerageSaved)], ["Trades", f.num(e.tradesCount)], ["Turnover", f.compact(e.turnover)], ["Top segment", e.topSegment]].map(([l, v]) => (
          <div key={l} className="min-w-0 rounded-xl border border-hairline bg-alt p-3">
            <div className="truncate text-label uppercase text-faint">{l}</div>
            <div className="mt-1 text-cell font-medium text-ink [overflow-wrap:anywhere]">{v}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WinnersSection({ d }: { d: Landing }) {
  const f = useFmt();
  const c = d.competition.data;
  const w = d.winners;
  const declared = c?.status === "winners_declared";
  const finalDate = c ? (c.winnersDeclaredAt ?? new Date(Date.parse(c.endsAt) + VERIFICATION_DAYS * 86400000).toISOString()) : null;
  const heading = w.data?.heading ?? (declared ? "Winners" : "Current leaders (provisional)");
  return (
    <Section id="winners">
      <SectionHead id="winners" center eyebrow={heading}
        title={declared ? "Meet the winners" : "Who's leading right now"}
        sub={declared ? "Verified and declared. Congratulations to everyone in the winning zone." : "These are provisional standings. Winners are confirmed only after the contest ends and every account is verified."} />
      {c && finalDate && (
        <Reveal variant="scale" className="mb-6 flex justify-center">
          {w.data?.isFinal ? (
            <div role="status" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-linear-to-br from-accent to-accent-2 px-5 text-cell font-semibold text-accent-ink"><Icon name="trophy" />Winners declared on {f.date(finalDate)}</div>
          ) : (
            <div role="status" className="inline-flex min-h-11 flex-wrap items-center justify-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-5 py-2 text-cell font-medium text-ink"><Pill tone="accent">Provisional</Pill>Final winners are declared on {f.date(finalDate)}, after verification</div>
          )}
        </Reveal>
      )}
      <Async res={w} what="winners" onRetry={() => d.retry("winners")} skeleton={<div className="grid gap-4 md:gap-6 lg:grid-cols-[1.25fr_1fr]"><Sk h={520} className="rounded-2xl" /><Sk h={520} className="rounded-2xl" /></div>}
        isEmpty={(x) => x.winners.length === 0 && !x.champion} emptyText="Standings will appear here once traders start saving.">
        {(x) => (
          <div className="grid gap-4 md:gap-6 lg:grid-cols-[1.25fr_1fr]">
            {x.champion && <Reveal variant="left" className="h-full"><ChampionCard e={x.champion} isFinal={x.isFinal} /></Reveal>}
            <Reveal variant="right" className="relative h-full min-h-[480px]">
              <Card className="flex h-full flex-col lg:absolute lg:inset-0">
                <h3 className="text-ctitle text-ink">{x.isFinal ? "All winners" : "Top 20 right now"}</h3>
                <p className="mb-3 mt-1 text-meta text-mute">{x.isFinal ? "Rank, prize and brokerage saved" : "Rank, prize at stake and brokerage saved"}</p>
                <ol aria-label={x.heading} className="fg-scroll -mx-2 min-h-0 flex-1 overflow-y-auto px-2">
                  {x.winners.map((m) => (
                    <li key={m.rank} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 rounded-xl border-b border-hairline px-2 py-3 transition-colors hover:bg-accent/10">
                      <span className="row-span-2 flex items-center gap-3"><span className={rankBadge(m.rank, true)}>{m.rank}</span><Avatar name={m.name} src={m.avatarUrl} size={36} /></span>
                      <span className="flex items-center gap-2 text-cell font-medium text-ink">{m.name}<Flag code={m.countryCode} size={14} /></span>
                      <span className="row-span-2 text-cell font-semibold tabular-nums text-ink">{f.money(m.brokerageSaved)}</span>
                      <span className="text-meta text-faint">{m.prize}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </Reveal>
          </div>
        )}
      </Async>
      <div className="mt-16">
        <Reveal className="mb-6"><h3 className="text-ctitle text-ink">Past editions</h3><p className="mt-1 text-meta text-mute">Previous pools and their podiums</p></Reveal>
        <Async res={d.past} what="past editions" onRetry={() => d.retry("past")} skeleton={<div className="grid gap-4 md:grid-cols-2 md:gap-6"><Sk h={220} className="rounded-2xl" /><Sk h={220} className="rounded-2xl" /></div>} isEmpty={(p) => p.length === 0} emptyText="Past editions will be listed here.">
          {(eds) => (
            <InView className="grid items-stretch gap-4 md:grid-cols-2 md:gap-6">
              {eds.map((ed, i) => (
                <div key={ed.id} className={cn(ST, "h-full")} style={{ "--i": i } as CSSProperties}>
                  <Card spot className="h-full">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h4 className="text-ctitle text-ink">{ed.title}</h4><p className="text-meta text-mute">{ed.period}</p></div>
                      <div className="text-right text-meta text-mute"><div><b className="font-semibold text-ink">{f.compact(ed.poolSize)}</b> pool</div><div>{f.num(ed.tradersEnrolled)} traders</div></div>
                    </div>
                    <ul className="mt-4" aria-label={`${ed.title} podium`}>
                      {ed.podium.map((m) => (
                        <li key={m.rank} className="flex h-12 items-center justify-between gap-3 border-b border-hairline text-cell last:border-0">
                          <span className="flex items-center gap-3"><span className={rankBadge(m.rank, true)}>{m.rank}</span><span className="font-medium text-ink">{m.name}</span></span>
                          <b className="font-semibold tabular-nums text-ink">{f.money(m.brokerageSaved)}</b>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              ))}
            </InView>
          )}
        </Async>
      </div>
    </Section>
  );
}

/* ═══════════════════════════ PRIZES ═════════════════════════════════════ */
function PrizesSection({ d }: { d: Landing }) {
  const declared = d.competition.data?.status === "winners_declared";
  return (
    <Section id="prizes" alt>
      <SectionHead id="prizes" center eyebrow="Prizes" title="Win big, save more" sub="The higher you finish, the better the reward. Ranks 1 to 20 make up the winning zone." />
      <Async res={d.prizes} what="prizes" onRetry={() => d.retry("prizes")} skeleton={<div className="grid gap-4 md:gap-6 lg:grid-cols-3">{[0, 1, 2].map((i) => <Sk key={i} h={330} className="rounded-2xl" />)}</div>} isEmpty={(t) => t.length === 0}>
        {(tiers) => (
          <InView className="grid items-stretch gap-4 md:gap-6 lg:grid-cols-3">
            {tiers.map((t, i) => {
              const grand = t.id === "grand";
              const n = t.winnersCount;
              return (
                <div key={t.id} className={cn(ST, "h-full")} style={{ "--i": i } as CSSProperties}>
                  <Card spot className={cn("flex h-full flex-col gap-4", grand && "fg-gborder fg-wash")}>
                    {grand && <span className="absolute right-5 top-5 rounded-full bg-linear-to-br from-accent to-accent-2 px-3 py-1 text-label uppercase text-accent-ink">Grand prize</span>}
                    <span className="text-label uppercase text-accent">{t.ranksFrom === t.ranksTo ? `Rank #${t.ranksFrom}` : `Ranks #${t.ranksFrom} to #${t.ranksTo}`}</span>
                    <div className={cn("grid size-12 place-items-center rounded-xl", grand ? "bg-linear-to-br from-accent to-accent-2 text-accent-ink" : "bg-accent/10 text-accent")}>
                      <Icon name={grand ? "trophy" : t.id === "podium" ? "bolt" : "laptop"} size={22} />
                    </div>
                    <div><div className="text-meta text-mute">{t.label}</div><div className="text-ctitle text-ink">{t.reward}</div></div>
                    <ul className="grid gap-2 text-cell text-mute">
                      {t.perks.map((p) => (<li key={p} className="flex items-start gap-2"><Icon name="check" size={16} stroke={2.5} className="mt-0.5 text-accent" />{p}</li>))}
                    </ul>
                    <div className="mt-auto border-t border-hairline pt-4 text-cell font-medium text-ink">
                      {declared ? `${n} ${n === 1 ? "winner" : "winners"}` : `${n} ${n === 1 ? "prize" : "prizes"} up for grabs`}
                    </div>
                  </Card>
                </div>
              );
            })}
          </InView>
        )}
      </Async>
      <Reveal><p className="mt-8 text-center text-body text-mute"><b className="font-semibold text-ink">Everyone gets rewarded.</b> All traders also get brokerage reimbursed from the pool until it runs out.</p></Reveal>
    </Section>
  );
}

/* ═══════════════════════════ HOW TO ENTER ═══════════════════════════════ */
function StepArt({ i }: { i: number }) {
  const common = { width: 180, height: 140, viewBox: "0 0 220 170", fill: "none", "aria-hidden": true } as const;
  if (i === 0)
    return (
      <svg {...common}>
        <rect x="46" y="14" width="128" height="142" rx="20" stroke="currentColor" strokeWidth="2.5" fill="var(--accent)" fillOpacity=".08" />
        <circle cx="110" cy="56" r="20" fill="var(--accent)" fillOpacity=".2" stroke="currentColor" strokeWidth="2.5" />
        <path d="M76 112c4-18 18-26 34-26s30 8 34 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="70" y="124" width="80" height="8" rx="4" fill="var(--accent)" fillOpacity=".35" />
        <rect x="86" y="140" width="48" height="6" rx="3" fill="var(--accent)" fillOpacity=".2" />
        <circle cx="164" cy="40" r="16" fill="var(--up)" />
        <path d="m157 40 5 5 9-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (i === 1)
    return (
      <svg {...common}>
        <rect x="16" y="14" width="188" height="142" rx="18" stroke="currentColor" strokeWidth="2.5" fill="var(--accent)" fillOpacity=".08" />
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const h = [30, 46, 38, 62, 52, 78][k];
          const y = 128 - h - [0, 6, 2, 14, 8, 22][k];
          return (<g key={k}><line x1={42 + k * 28} x2={42 + k * 28} y1={y - 10} y2={y + h + 10} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><rect x={34 + k * 28} y={y} width="16" height={h} rx="4" fill="currentColor" fillOpacity={k % 2 ? 0.35 : 1} /></g>);
        })}
        <path d="M30 118c28-6 48-24 74-34s52-24 80-50" stroke="var(--up)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 7" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="22" y="104" width="52" height="52" rx="8" fill="var(--accent)" fillOpacity=".2" stroke="currentColor" strokeWidth="2.5" />
      <rect x="84" y="70" width="52" height="86" rx="8" fill="var(--accent)" fillOpacity=".35" stroke="currentColor" strokeWidth="2.5" />
      <rect x="146" y="120" width="52" height="36" rx="8" fill="var(--accent)" fillOpacity=".12" stroke="currentColor" strokeWidth="2.5" />
      <text x="48" y="140" textAnchor="middle" fontSize="22" fontWeight="600" fill="currentColor">2</text>
      <text x="110" y="122" textAnchor="middle" fontSize="28" fontWeight="600" fill="currentColor">1</text>
      <text x="172" y="145" textAnchor="middle" fontSize="20" fontWeight="600" fill="currentColor">3</text>
      <path d="m110 16 7 14 15 2-11 10 3 15-14-8-14 8 3-15-11-10 15-2Z" fill="var(--color-gold)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function HowSection({ d }: { d: Landing }) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const baseId = useId();
  return (
    <Section id="how">
      <SectionHead id="how" eyebrow="How to enter" title="Three steps. Zero extra effort." sub="Existing customers are already enrolled. New here? You are one signup away." />
      <Async res={d.content} what="how it works" onRetry={() => d.retry("content")} skeleton={<div className="grid gap-4 md:grid-cols-[300px_1fr] md:gap-6"><div className="grid gap-3"><Sk h={60} /><Sk h={60} /><Sk h={60} /></div><Sk h={300} className="rounded-2xl" /></div>} isEmpty={(c) => c.steps.length === 0}>
        {(c) => (
          <>
            <Reveal>
              <div className="grid gap-4 md:grid-cols-[300px_1fr] md:gap-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
                <div role="tablist" aria-orientation="vertical" aria-label="Steps" className="flex flex-col gap-2">
                  {c.steps.map((s, i) => (
                    <button key={s.title} type="button" role="tab" id={`${baseId}-t${i}`} aria-selected={active === i} aria-controls={`${baseId}-p${i}`} tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                          e.preventDefault();
                          const n = (i + (e.key === "ArrowDown" ? 1 : c.steps.length - 1)) % c.steps.length;
                          setActive(n);
                          document.getElementById(`${baseId}-t${n}`)?.focus();
                        }
                      }}
                      className={cn("relative flex min-h-[60px] items-center gap-4 overflow-clip rounded-xl py-3 pl-6 pr-4 text-left transition-colors", active === i ? "border border-hairline bg-card shadow-sm" : "border border-transparent hover:bg-accent/10")}>
                      <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[3px] overflow-hidden rounded-full bg-hairline">
                        {active === i && <i onAnimationEnd={() => !reduced && setActive((i + 1) % c.steps.length)} className="absolute inset-0 origin-top scale-y-0 animate-[f-fill_6s_linear_forwards] bg-linear-to-b from-accent to-accent-2" style={{ animationPlayState: paused ? "paused" : "running" }} />}
                      </span>
                      <span className={cn("text-cell font-medium", active === i ? "text-accent" : "text-faint")}>{String(i + 1).padStart(2, "0")}</span>
                      <span className={cn("text-ctitle", active === i ? "text-ink" : "text-mute")}>{s.title}</span>
                    </button>
                  ))}
                </div>
                <Card className="fg-wash grid max-h-[340px] min-h-[260px] md:p-8">
                  {c.steps.map((s, i) => (
                    <div key={s.title} role="tabpanel" id={`${baseId}-p${i}`} aria-labelledby={`${baseId}-t${i}`} aria-hidden={active !== i}
                      className={cn("col-start-1 row-start-1 grid items-center gap-6 transition duration-500 sm:grid-cols-[1fr_auto]", active === i ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-2 opacity-0")}>
                      <div>
                        <Eyebrow>Step {String(i + 1).padStart(2, "0")}</Eyebrow>
                        <h3 className="mb-3 text-title text-ink">{s.title}</h3>
                        <p className="max-w-[420px] text-body text-mute">{s.body}</p>
                      </div>
                      <div className="hidden text-accent sm:block"><StepArt i={i} /></div>
                    </div>
                  ))}
                </Card>
              </div>
            </Reveal>
            <div id="rules" className="mt-16 scroll-mt-24">
              <Reveal className="mb-6"><h3 className="text-ctitle text-ink">Contest rules</h3><p className="mt-1 text-meta text-mute">The short version. Full terms apply.</p></Reveal>
              <InView>
                <ul className="grid gap-x-8 md:grid-cols-2">
                  {c.rules.map((r, i) => (
                    <li key={r} className={cn(ST, "flex items-start gap-3 border-b border-hairline py-4 text-body text-mute")} style={{ "--i": i } as CSSProperties}>
                      <Icon name="check" size={16} stroke={2.5} className="mt-1 text-accent" /><span>{r}</span>
                    </li>
                  ))}
                </ul>
              </InView>
            </div>
          </>
        )}
      </Async>
    </Section>
  );
}

/* ═══════════════════════════ FAQ ════════════════════════════════════════ */
function FaqSection({ d }: { d: Landing }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <Section id="faq" alt>
      <SectionHead id="faq" center eyebrow="FAQs" title="Questions, answered" />
      <Async res={d.content} what="FAQs" onRetry={() => d.retry("content")} skeleton={<div className="mx-auto grid max-w-[760px] gap-3">{[0, 1, 2, 3, 4, 5].map((i) => <Sk key={i} h={60} className="rounded-2xl" />)}</div>} isEmpty={(c) => c.faqs.length === 0}>
        {(c) => (
          <InView className="mx-auto grid max-w-[760px] gap-3">
            {c.faqs.map((q, i) => {
              const isOpen = open === i;
              return (
                <div key={q.q} className={cn(ST, "overflow-clip rounded-2xl border bg-card transition-colors", isOpen ? "border-accent/40" : "border-hairline")} style={{ "--i": i } as CSSProperties}>
                  <h3>
                    <button type="button" aria-expanded={isOpen} aria-controls={`${base}-a${i}`} id={`${base}-q${i}`} onClick={() => setOpen(isOpen ? null : i)} className="flex min-h-[60px] w-full items-center justify-between gap-4 px-5 py-3 text-left text-body font-semibold text-ink md:px-6">
                      <span>{q.q}</span>
                      <span aria-hidden="true" className="relative size-4 shrink-0 text-accent">
                        <span className="absolute inset-x-0 top-[7px] h-0.5 rounded bg-current" />
                        <span className={cn("absolute inset-x-0 top-[7px] h-0.5 rounded bg-current transition-transform duration-300", isOpen ? "rotate-0" : "rotate-90")} />
                      </span>
                    </button>
                  </h3>
                  <div id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`} className={cn("grid transition-[grid-template-rows] duration-300 ease-soft", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <div className="overflow-hidden"><p className="px-5 pb-5 text-body text-mute md:px-6">{q.a}</p></div>
                  </div>
                </div>
              );
            })}
          </InView>
        )}
      </Async>
    </Section>
  );
}

/* ═══════════════════════════ CTA + FOOTER ═══════════════════════════════ */
function CtaBand({ declared }: { declared: boolean }) {
  const auth = useAuth();
  return (
    <section id="join" aria-labelledby="join-title" className="border-t border-hairline py-16 md:py-24">
      <div className={WRAP}>
        <Reveal variant="scale">
          <div className="relative isolate overflow-clip rounded-3xl bg-linear-to-br from-accent to-accent-2 px-5 py-14 text-center text-white shadow-[0_24px_60px_-24px_color-mix(in_oklab,var(--accent)_55%,transparent)] md:px-12">
            <span aria-hidden="true" className="absolute -left-12 -top-20 -z-10 size-64 animate-[f-drift1_14s_ease-in-out_infinite_alternate] rounded-full bg-white/20 blur-3xl" />
            <span aria-hidden="true" className="absolute -bottom-24 -right-16 -z-10 size-72 animate-[f-drift2_17s_ease-in-out_infinite_alternate] rounded-full bg-white/20 blur-3xl" />
            <h2 id="join-title" className="mx-auto max-w-[16ch] text-title">{declared ? "See you in the next pool." : BRAND.tagline}</h2>
            <p className="mx-auto mt-4 max-w-[480px] text-body text-white/85">{declared ? "Follow along for the next edition and be first in line to join." : "Trade the way you already do. Let the pool pay your brokerage, and see how high you can climb."}</p>
            <div className="mt-8 flex justify-center"><Button variant="white" size="lg" href={URLS.join} onClick={(e) => { e.preventDefault(); auth.user ? auth.openModal("card") : auth.openModal("join"); }}>{declared ? "Get notified" : auth.user ? "Share my rank card" : "Join the pool"}</Button></div>
            <p className="mt-4 text-meta text-white/85">Existing customers are already part of the pool.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer({ d, mode, onToggle, declared }: { d: Landing; mode: Mode; onToggle: () => void; declared: boolean }) {
  const auth = useAuth();
  const c = d.competition.data;
  const year = c ? new Date(c.startsAt).getUTCFullYear() : null;
  const link = "inline-flex min-h-8 items-center text-body text-mute transition-colors hover:text-accent";
  return (
    <footer className="border-t border-hairline bg-alt py-16">
      <div className={WRAP}>
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div className="col-span-2 lg:col-span-1">
            <a href="#top" className="inline-flex items-center gap-2 text-ctitle text-ink" aria-label={`${BRAND.name} home`}><LogoGlyph size={24} />{BRAND.name}</a>
            <p className="mt-3 max-w-[320px] text-body text-mute">{BRAND.tagline} Trade as usual. Save brokerage. Climb the board.</p>
          </div>
          <nav aria-label="Explore"><h4 className="mb-3 text-label uppercase text-faint">Explore</h4>
            <ul className="grid"><li><a className={link} href="#leaderboard">Leaderboard</a></li><li><a className={link} href="#winners">{declared ? "Winners" : "Current leaders"}</a></li><li><a className={link} href="#prizes">Prizes</a></li><li><a className={link} href="#how">How to enter</a></li></ul></nav>
          <nav aria-label="Support"><h4 className="mb-3 text-label uppercase text-faint">Support</h4>
            <ul className="grid"><li><a className={link} href="#rules">Contest rules</a></li><li><a className={link} href="#faq">FAQs</a></li><li><a className={link} href={URLS.login} onClick={(e) => { e.preventDefault(); auth.openModal("join"); }}>Log in</a></li><li><a className={link} href={URLS.join} onClick={(e) => { e.preventDefault(); auth.openModal("join"); }}>Join the pool</a></li></ul></nav>
          <div className="col-span-2 lg:col-span-1"><h4 className="mb-3 text-label uppercase text-faint">Partners</h4>
            {c ? (<ul className="grid gap-3">{c.partners.map((p) => (<li key={p.name} className="text-body text-mute">{p.name}<span className="block text-meta text-faint">{p.role}</span></li>))}</ul>) : (<div className="grid gap-3"><Sk w={140} h={16} /><Sk w={180} h={16} /></div>)}
          </div>
        </div>
        <div className="mt-10 max-w-[880px] border-t border-hairline pt-6 text-meta text-mute">
          {d.content.data ? d.content.data.disclosure : d.content.state === "error" ? <Button variant="ghost" onClick={() => d.retry("content")}>Retry loading disclosure</Button> : <div className="grid gap-2"><Sk h={12} /><Sk h={12} w="80%" /></div>}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-meta text-faint">
          <span>© {year ?? ""} {BRAND.name}. All rights reserved.</span>
          <ThemeToggle mode={mode} onToggle={onToggle} />
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════ THEME STUDIO (dev) ═════════════════════════ */
function ThemeStudio({ palette, mode, setPalette }: { palette: Palette; mode: Mode; setPalette: (p: Palette) => void }) {
  const tone = palette[mode];
  const set = (patch: Partial<Tone>) => setPalette({ ...palette, [mode]: { ...tone, ...patch } });
  return (
    <div role="region" aria-label="Theme studio" className="fixed bottom-4 left-4 z-[80] grid w-56 gap-3 rounded-2xl border border-hairline-strong bg-card p-4 text-meta font-semibold shadow-xl">
      <div>Theme studio · {mode}</div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
          <button key={k} type="button" aria-label={`Preset ${k}`} title={k} className="size-8 rounded-full ring-1 ring-hairline-strong" style={{ background: `linear-gradient(135deg,${PRESETS[k][mode].accent},${PRESETS[k][mode].accent2})` }} onClick={() => setPalette(PRESETS[k])} />
        ))}
      </div>
      <label className="flex items-center justify-between text-mute">Accent<input type="color" className="h-8 w-11 cursor-pointer border-0 bg-transparent p-0" value={tone.accent} onChange={(e) => set({ accent: e.target.value })} /></label>
      <label className="flex items-center justify-between text-mute">Accent 2<input type="color" className="h-8 w-11 cursor-pointer border-0 bg-transparent p-0" value={tone.accent2} onChange={(e) => set({ accent2: e.target.value })} /></label>
    </div>
  );
}

/* ═══════════════════════════ PAGE ═══════════════════════════════════════ */
export default function Page() {
  const [mode, setMode] = useState<Mode>("light");
  useLayoutEffect(() => {
    setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);
  const toggle = useCallback(() => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("fogm-theme", next);
    } catch {
      /* private mode: ignore */
    }
  }, [mode]);

  const [palette, setPalette] = useState<Palette>(() => resolvePalette(ACTIVE_PRESET));
  const css = useMemo(() => themeCss(palette), [palette]);

  return (
    <div className={cn("fogm min-h-screen overflow-x-clip bg-bg font-sans text-body text-ink antialiased tabular-nums", fontInter.variable)}>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} suppressHydrationWarning />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {/* AuthProvider sits inside .fogm so the join modal inherits the theme tokens */}
      <AuthProvider>
        <PageContent mode={mode} onToggle={toggle} />
      </AuthProvider>
      {SHOW_THEME_STUDIO && <ThemeStudio palette={palette} mode={mode} setPalette={setPalette} />}
    </div>
  );
}

function PageContent({ mode, onToggle }: { mode: Mode; onToggle: () => void }) {
  const { user } = useAuth();
  const sessionKey = user ? `${user.id}|${user.name}|${user.avatarUrl ?? ""}|${user.publicConsent}` : "anon";
  const d = useLandingData(sessionKey);
  const cur = d.competition.data?.currency;
  const fmt = useMemo(() => makeFmt(cur), [cur]);
  const declared = d.competition.data?.status === "winners_declared";
  return (
    <FmtCtx.Provider value={fmt}>
      <Nav mode={mode} onToggle={onToggle} declared={declared} />
      <main id="main">
        <Hero d={d} />
        <TickerStrip d={d} />
        <LeaderboardSection d={d} />
        <PoolSection d={d} />
        <WinnersSection d={d} />
        <PrizesSection d={d} />
        <HowSection d={d} />
        <FaqSection d={d} />
        <CtaBand declared={declared} />
      </main>
      <Footer d={d} mode={mode} onToggle={onToggle} declared={declared} />
    </FmtCtx.Provider>
  );
}
