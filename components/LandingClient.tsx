"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import Avatar from "@/components/Avatar";
import AuthProvider from "@/components/AuthProvider";
import { useAuth } from "@/components/auth-context";
import RankCta from "@/components/RankCta";
import type { SiteSettingsData } from "@/lib/defaults";
import {
  formatCompactMoney,
  formatMoney,
  formatNumber,
  getActivity,
  getCompetition,
  getContent,
  getLeaderboard,
  getPastEditions,
  getProfitHistory,
  getContestStats,
  getPrizeTiers,
  getInstrumentBreakdown,
  getWinners,
  timeAgo,
  type ActivityItem,
  type Competition,
  type ContentPayload,
  type ContestStats,
  type ContestStatus,
  type EquityPoint,
  type InstrumentBreakdown,
  type LeaderboardEntry,
  type LeaderboardPage,
  type PastEdition,
  type Period,
  type PrizeTier,
  type WinnersPayload,
} from "@/lib/api";

/* ═══════════════════════════ THEME CONFIG ═══════════════════════════════ */
interface Tone {
  accent: string;
  accent2: string;
  accentInk: string;
}
interface Palette {
  light: Tone;
  dark: Tone;
}

const THEME: Palette = {
  light: { accent: "#3b36e0", accent2: "#7a5cff", accentInk: "#ffffff" },
  dark: { accent: "#8b87ff", accent2: "#b49bff", accentInk: "#0b0b1a" },
};

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

const THEME_BOOT = `try{var s=localStorage.getItem('fogm-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;

/* ═══════════════════════════ COUNTRY FLAG EMOJI ═════════════════════════ */
export function countryFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  const upper = code.toUpperCase();
  const c1 = 127397 + upper.charCodeAt(0);
  const c2 = 127397 + upper.charCodeAt(1);
  return String.fromCodePoint(c1, c2);
}

function Flag({ code, size = 16 }: { code: string; size?: number }) {
  return (
    <span
      role="img"
      aria-label={code}
      className="inline-block shrink-0 select-none leading-none"
      style={{ fontSize: `${size}px` }}
    >
      {countryFlagEmoji(code)}
    </span>
  );
}

/* ═══════════════════════════ FORMAT CONTEXT ═════════════════════════════ */
interface Fmt {
  money: (n: number) => string;
  compact: (n: number) => string;
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
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

function useReveal<T extends HTMLElement>(threshold = 0.15): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const ob = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        setSeen(true);
        ob.disconnect();
      }
    }, { threshold });
    ob.observe(el);
    return () => ob.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

function Reveal({
  children,
  className,
  variant = "up",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  variant?: "up" | "left" | "right" | "scale" | "fade";
  delay?: number;
}) {
  const [ref, seen] = useReveal<HTMLDivElement>(0.1);
  const vClass = {
    up: "translate-y-6",
    left: "-translate-x-6",
    right: "translate-x-6",
    scale: "scale-95",
    fade: "",
  }[variant];
  return (
    <div
      ref={ref}
      data-in={seen}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-soft motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:transition-none",
        seen ? "opacity-100 translate-x-0 translate-y-0 scale-100 filter-none" : `opacity-0 ${vClass} blur-[2px]`,
        className
      )}
    >
      {children}
    </div>
  );
}

function CountUp({
  value,
  format,
  duration = 1400,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [disp, setDisp] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || started) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          ob.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || reduced) return;
    let start: number | null = null;
    const from = 0;
    const to = value;
    const step = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const ease = prog === 1 ? 1 : 1 - Math.pow(2, -10 * prog);
      setDisp(Math.round(from + (to - from) * ease));
      if (prog < 1) requestAnimationFrame(step);
    };
    const req = requestAnimationFrame(step);
    return () => cancelAnimationFrame(req);
  }, [started, value, duration, reduced]);

  const fmt = format ?? ((n: number) => n.toLocaleString());
  return (
    <span ref={ref} className="tabular-nums">
      {fmt(reduced || !started ? value : disp)}
    </span>
  );
}

function Crown({ className = "" }: { className?: string }) {
  return (
    <svg className={cn("f-crown pointer-events-none text-gold drop-shadow-md", className)} viewBox="0 0 44 36" fill="currentColor" aria-hidden="true">
      <path d="M4 30 2 10l10 9L22 3l10 16 10-9-2 20Z" />
      <rect x="4" y="31" width="36" height="4" rx="2" />
    </svg>
  );
}

function Track({ children, dur = 30 }: { children: ReactNode; dur?: number }) {
  return (
    <div className="relative flex overflow-x-hidden">
      <div className="flex shrink-0 animate-[f-marquee_linear_infinite]" style={{ animationDuration: `${dur}s` }}>
        {children}
      </div>
      <div aria-hidden="true" className="flex shrink-0 animate-[f-marquee_linear_infinite]" style={{ animationDuration: `${dur}s` }}>
        {children}
      </div>
    </div>
  );
}

function InView({ children, className, threshold = 0.15 }: { children: ReactNode; className?: string; threshold?: number }) {
  const [ref, seen] = useReveal<HTMLDivElement>(threshold);
  return (
    <div ref={ref} data-in={seen} className={cn("group/iv", seen && "in", className)}>
      {children}
    </div>
  );
}

/* ═══════════════════════════ COMMON UI PIECES ═══════════════════════════ */
const WRAP = "mx-auto w-full max-w-[1280px] px-5 sm:px-8";
const SHADOW = "shadow-[var(--shadow)]";
const GRAD_TEXT = "bg-linear-to-br from-accent to-accent-2 bg-clip-text text-transparent";
const ST = "opacity-0 [animation-delay:calc(var(--i,0)*60ms)] group-data-[in=true]/iv:animate-[f-fadeup_.5s_var(--ease)_both] motion-reduce:opacity-100 motion-reduce:animate-none";

function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  onClick,
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "white";
  size?: "md" | "lg";
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  className?: string;
}) {
  const base =
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition duration-200 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none";
  const sz = size === "lg" ? "h-12 px-6 text-cell" : "h-11 px-5 text-cell";
  const vr = {
    primary:
      "bg-linear-to-br from-accent to-accent-2 text-accent-ink shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--accent)_60%,transparent)] hover:-translate-y-px",
    ghost: "border border-hairline-strong bg-card text-ink hover:border-accent hover:text-accent",
    white: "bg-white text-zinc-950 shadow-md hover:bg-zinc-100",
  }[variant];
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cn(base, sz, vr, className)}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(base, sz, vr, className)}>
      {children}
    </button>
  );
}

function Pill({ children, tone = "mute", className }: { children: ReactNode; tone?: "accent" | "mute" | "up" | "down"; className?: string }) {
  const tones = {
    accent: "bg-accent/10 text-accent border-accent/20",
    mute: "bg-ink/5 text-mute border-hairline",
    up: "bg-up/10 text-up border-up/20",
    down: "bg-down/10 text-down border-down/20",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-meta font-medium", tones, className)}>
      {children}
    </span>
  );
}

function onSpotlightMove(e: React.PointerEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
}

function Card({ children, className, spot = true, style }: { children: ReactNode; className?: string; spot?: boolean; style?: CSSProperties }) {
  return (
    <div
      style={style}
      onPointerMove={spot ? onSpotlightMove : undefined}
      className={cn("f-spot relative overflow-hidden rounded-2xl border border-hairline bg-card p-6 text-ink transition-colors", SHADOW, spot && "hover:border-accent/40", className)}
    >
      {children}
    </div>
  );
}

function Section({ id, children, alt, className }: { id: string; children: ReactNode; alt?: boolean; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-24 py-16 md:py-24", alt && "bg-alt border-y border-hairline", className)}>
      <div className={WRAP}>{children}</div>
    </section>
  );
}

/** Per-word mask reveal; runs when an ancestor gets data-in="true" (Reveal / InView). */
function Words({ text, accent = 0 }: { text: string; accent?: number }) {
  const ws = text.split(" ");
  const from = accent > 0 ? Math.max(0, ws.length - accent) : ws.length;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {ws.map((w, i) => (
          <span key={i} className="fg-vw inline-block overflow-hidden pb-1 align-top">
            <span className={i >= from ? GRAD_TEXT : undefined} style={{ "--w": i } as CSSProperties}>{w}</span>
            {i < ws.length - 1 ? "\u00a0" : ""}
          </span>
        ))}
      </span>
    </>
  );
}

function SectionHead({
  id,
  eyebrow,
  title,
  sub,
  center,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <Reveal variant="up">
      <div className={cn("mb-8 md:mb-12", center && "text-center")}>
        {eyebrow && <p className="text-label uppercase text-accent mb-2">{eyebrow}</p>}
        <h2 id={id ? `${id}-head` : undefined} className="text-title text-ink font-bold tracking-tight">
          <Words text={title} accent={title.split(" ").length >= 3 ? 2 : 1} />
        </h2>
        {sub && <p className={cn("mt-3 max-w-[640px] text-body text-mute", center && "mx-auto")}>{sub}</p>}
      </div>
    </Reveal>
  );
}

function Icon({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) {
  if (name === "trophy") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    );
  }
  if (name === "bolt") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (name === "up") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="18 15 12 9 6 15" />
      </svg>
    );
  }
  if (name === "down") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (name === "info") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    );
  }
  if (name === "menu") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    );
  }
  if (name === "x") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  if (name === "arrow") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    );
  }
  return null;
}

function LiveDot({ on = true }: { on?: boolean }) {
  return (
    <span className="relative flex size-2 items-center justify-center">
      {on && <span className="absolute size-full animate-ping rounded-full bg-up/60 motion-reduce:hidden" />}
      <span className={cn("size-2 rounded-full", on ? "bg-up" : "bg-faint")} />
    </span>
  );
}

function LogoGlyph({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M9 23V9h14v4h-9v3h7v4h-7v3H9Z" fill="var(--accent-ink)" />
    </svg>
  );
}

function ThemeToggle({ mode, onToggle }: { mode: "light" | "dark"; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      className="group grid size-11 place-items-center rounded-full text-mute transition hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-90"
    >
      {mode === "dark" ? (
        <svg className="transition-transform duration-500 ease-out group-hover:rotate-90 motion-reduce:transform-none" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg className="transition-transform duration-500 ease-out group-hover:-rotate-45 motion-reduce:transform-none" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}

/* ═══════════════════════════ SVG CHARTS ═════════════════════════════════ */
interface Pt {
  x: number;
  y: number;
}
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function AreaChart({
  labels,
  values,
  formatY,
  formatTip,
  height = 200,
  ariaLabel,
}: {
  labels: string[];
  values: number[];
  formatY: (n: number) => string;
  formatTip: (i: number) => string;
  height?: number;
  ariaLabel: string;
}) {
  const gid = useId();
  const [revealRef, seen] = useReveal<HTMLDivElement>(0.2);
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 52, r: 12, t: 12, b: 28 };
  const w = 560;
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = Math.max(...values, 1) * 1.05;
  const pts: Pt[] = values.map((v, i) => ({
    x: pad.l + (values.length === 1 ? iw / 2 : (i / (values.length - 1)) * iw),
    y: pad.t + ih - (v / max) * ih,
  }));
  const line = smoothPath(pts);
  const area = `${line}L${pts[pts.length - 1]?.x.toFixed(1)} ${pad.t + ih}L${pts[0]?.x.toFixed(1)} ${pad.t + ih}Z`;
  const ticks = [0, 1, 2, 3, 4].map((k) => ({ v: (max * k) / 4, y: pad.t + ih - (k / 4) * ih }));
  const xi = [0, Math.floor((labels.length - 1) / 2), labels.length - 1];

  return (
    <div ref={revealRef} data-in={seen} className="relative w-full overflow-hidden" onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${height}`} role="img" aria-label={ariaLabel} className="w-full h-auto block overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={t.y} y2={t.y} stroke="var(--hairline)" strokeDasharray={i === 0 ? undefined : "3 5"} />
            <text x={pad.l - 8} y={t.y + 4} textAnchor="end" className="fill-faint text-[10px] font-mono tabular-nums">
              {formatY(t.v)}
            </text>
          </g>
        ))}
        {xi.map((i) => (
          <text key={i} x={pts[i]?.x} y={height - 8} textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} className="fill-faint text-[10px] font-mono">
            {labels[i]}
          </text>
        ))}
        <path d={area} fill={`url(#${gid})`} className="fg-fade" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="fg-draw" />
        {pts.length > 0 && <circle className="fg-pop" style={{ "--k": 9 } as CSSProperties} cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="4" fill="var(--card)" stroke="var(--accent)" strokeWidth="2.5" />}
        {hover !== null && pts[hover] && (
          <g>
            <line x1={pts[hover].x} x2={pts[hover].x} y1={pad.t} y2={pad.t + ih} stroke="var(--accent)" strokeDasharray="2 3" strokeWidth="1.5" />
            <circle cx={pts[hover].x} cy={pts[hover].y} r="5" fill="var(--card)" stroke="var(--accent)" strokeWidth="3" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-hairline bg-card/95 px-2.5 py-1 text-meta font-medium text-ink shadow-md backdrop-blur-sm"
          style={{ left: `${(pts[hover]?.x / w) * 100}%`, transform: "translateX(-50%)" }}
        >
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
  const pts: Pt[] = values.map((v, i) => ({
    x: 1.5 + (i / (values.length - 1)) * (W - 3),
    y: H - 2.5 - ((v - min) / span) * (H - 5),
  }));
  const up = values[values.length - 1] >= values[0];
  const [ref, seen] = useReveal<HTMLSpanElement>(0.3);
  const last = pts[pts.length - 1];
  return (
    <span ref={ref} data-in={seen} className="block">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="block overflow-visible">
        <path d={smoothPath(pts)} fill="none" stroke={up ? "var(--up)" : "var(--down)"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="fg-draw" />
        {last && <circle className="fg-pop" style={{ "--k": 8 } as CSSProperties} cx={last.x} cy={last.y} r="2.2" fill={up ? "var(--up)" : "var(--down)"} />}
      </svg>
    </span>
  );
}

function Movement({ movement, previousRank }: { movement: number; previousRank: number | null }) {
  if (previousRank === null) {
    return <span className="inline-flex items-center text-meta font-medium text-accent">NEW</span>;
  }
  if (movement > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-meta font-medium text-up">
        <Icon name="up" size={10} />+{movement}
      </span>
    );
  }
  if (movement < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-meta font-medium text-down">
        <Icon name="down" size={10} />{movement}
      </span>
    );
  }
  return <span className="text-meta text-faint">—</span>;
}

/* ═══════════════════════════ ASYNC HELPERS ══════════════════════════════ */
type ResState = "loading" | "ready" | "error";
interface Res<T> {
  state: ResState;
  data: T | null;
  error: string | null;
}
const loadingRes = <T,>(): Res<T> => ({ state: "loading", data: null, error: null });

function Sk({ w = "100%", h = 16, className, style }: { w?: number | string; h?: number | string; className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-ink/10", className)} style={{ width: w, height: h, ...style }} />;
}

function ErrorBox({ message, onRetry, what }: { message: string | null; onRetry: () => void; what: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline-strong px-5 py-8 text-center text-body text-mute">
      <b className="text-ctitle text-ink">Couldn&apos;t load {what}</b>
      <p className="max-w-[420px] text-meta">{message ?? "Network request failed. Please try again."}</p>
      <Button variant="ghost" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function Async<T>({
  res,
  children,
  skeleton,
  isEmpty,
  emptyText,
  what,
  onRetry,
}: {
  res: Res<T>;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyText?: string;
  what: string;
  onRetry: () => void;
}) {
  if (res.state === "loading") return <>{skeleton ?? <Sk h={120} />}</>;
  if (res.state === "error" || !res.data) return <ErrorBox message={res.error} onRetry={onRetry} what={what} />;
  if (isEmpty && isEmpty(res.data)) {
    return (
      <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-hairline p-6 text-center text-meta text-mute">
        {emptyText ?? `No ${what} available yet.`}
      </div>
    );
  }
  return <>{children(res.data)}</>;
}

/* ═══════════════════════════ DATA HOOK ══════════════════════════════════ */
interface DataShape {
  competition: Competition;
  stats: ContestStats;
  winners: WinnersPayload;
  prizes: PrizeTier[];
  activity: ActivityItem[];
  history: EquityPoint[];
  segments: InstrumentBreakdown[];
  past: PastEdition[];
  content: ContentPayload;
}
type DataKey = keyof DataShape;

const FETCH: { [K in DataKey]: () => Promise<DataShape[K]> } = {
  competition: getCompetition,
  stats: getContestStats,
  winners: getWinners,
  prizes: getPrizeTiers,
  activity: getActivity,
  history: getProfitHistory,
  segments: getInstrumentBreakdown,
  past: getPastEditions,
  content: getContent,
};
const ALL_KEYS = Object.keys(FETCH) as DataKey[];
const LIVE_KEYS: DataKey[] = ["competition", "stats", "winners", "activity", "history", "segments"];
const PAGE_SIZE = 20;
const REFRESH_MS = 60_000;

interface BoardData {
  key: string;
  page: LeaderboardPage;
  top3: LeaderboardEntry[];
}

function useLandingData(sessionKey: string) {
  const [state, setState] = useState<{ [K in DataKey]: Res<DataShape[K]> }>(() => ({
    competition: loadingRes(),
    stats: loadingRes(),
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
        setState((s) => (silent && s[k].data ? s : { ...s, [k]: { state: "error", data: null, error: e instanceof Error ? e.message : "Error" } }));
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
    const t = setTimeout(() => setDq(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const [board, setBoard] = useState<Res<BoardData>>(loadingRes);
  const loadBoard = useCallback(
    async (silent: boolean) => {
      const key = `${period}|${dq}`;
      if (!silent) setBoard((b) => ({ state: "loading", data: b.data, error: null }));
      try {
        const page = await getLeaderboard({ period, search: dq || undefined, page: 1, pageSize: PAGE_SIZE });
        const top3 = dq ? (await getLeaderboard({ period, page: 1, pageSize: 3 })).entries : page.entries.slice(0, 3);
        setBoard({ state: "ready", data: { key, page, top3 }, error: null });
      } catch (e) {
        setBoard((b) => (silent && b.data ? b : { state: "error", data: null, error: e instanceof Error ? e.message : "Failed to load leaderboard" }));
      }
    },
    [period, dq]
  );

  useEffect(() => {
    void loadBoard(false);
  }, [loadBoard, sessionKey]);

  const loadMore = useCallback(async () => {
    if (!board.data) return;
    const { key, page, top3 } = board.data;
    if (page.entries.length >= page.total) return;
    try {
      const nextPageNum = Math.floor(page.entries.length / PAGE_SIZE) + 1;
      const next = await getLeaderboard({ period, search: dq || undefined, page: nextPageNum, pageSize: PAGE_SIZE });
      setBoard({
        state: "ready",
        data: {
          key,
          page: { ...next, entries: [...page.entries, ...next.entries] },
          top3,
        },
        error: null,
      });
    } catch {
      /* ignore load more error */
    }
  }, [board.data, period, dq]);

  return {
    ...state,
    retry: (k: DataKey) => void loadKeys([k], false),
    board,
    retryBoard: () => void loadBoard(false),
    period,
    setPeriod: (p: Period) => setPeriodRaw(p),
    search,
    setSearch,
    loadMore,
    hasMore: !!board.data && board.data.page.entries.length < board.data.page.total,
  };
}

type Landing = ReturnType<typeof useLandingData>;

/* ═══════════════════════════ ACCOUNT MENU + PRIVACY SWITCHES ═════════════ */
function AccountMenu() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const u = auth.user;

  // Local optimistic state for privacy toggles
  const [showName, setShowName] = useState(u?.showName ?? true);
  const [showPhoto, setShowPhoto] = useState(u?.showPhoto ?? true);
  const [updating, setUpdating] = useState(false);
  const [prevU, setPrevU] = useState(u);

  if (prevU !== u) {
    setPrevU(u);
    if (u) {
      setShowName(u.showName);
      setShowPhoto(u.showPhoto);
    }
  }

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

  if (!u) return null;

  const handleToggleName = async () => {
    const nextVal = !showName;
    setShowName(nextVal);
    setUpdating(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showName: nextVal }),
      });
      if (!res.ok) throw new Error("Failed to update name privacy");
      await auth.refresh();
    } catch {
      setShowName(!nextVal); // Revert on failure
    } finally {
      setUpdating(false);
    }
  };

  const handleTogglePhoto = async () => {
    const nextVal = !showPhoto;
    setShowPhoto(nextVal);
    setUpdating(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showPhoto: nextVal }),
      });
      if (!res.ok) throw new Error("Failed to update photo privacy");
      await auth.refresh();
    } catch {
      setShowPhoto(!nextVal); // Revert on failure
    } finally {
      setUpdating(false);
    }
  };

  const itemClass = "flex h-10 w-full items-center rounded-xl px-3 text-left text-cell font-medium text-ink transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-full transition hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <Avatar name={u.name || u.email} src={u.avatarUrl} size={36} />
      </button>

      {open && (
        <div role="menu" aria-label="Account" className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-hairline bg-card p-3 shadow-xl space-y-3">
          {/* Identity Header */}
          <div className="border-b border-hairline px-2 pb-3">
            <div className="truncate text-cell font-semibold text-ink">{u.name || "Anonymous trader"}</div>
            <div className="truncate text-meta text-mute">{u.email}</div>
          </div>

          {/* Privacy Switches (Optimistic) */}
          <div className="space-y-2 border-b border-hairline px-2 pb-3">
            <div className="flex items-center justify-between text-meta">
              <span className="text-ink font-medium">Show display name</span>
              <button
                type="button"
                role="switch"
                aria-checked={showName}
                disabled={updating}
                onClick={handleToggleName}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  showName ? "bg-accent" : "bg-hairline-strong"
                }`}
              >
                <span
                  className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${
                    showName ? "translate-x-4.5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between text-meta">
              <span className="text-ink font-medium">Show my photo</span>
              <button
                type="button"
                role="switch"
                aria-checked={showPhoto}
                disabled={updating}
                onClick={handleTogglePhoto}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  showPhoto ? "bg-accent" : "bg-hairline-strong"
                }`}
              >
                <span
                  className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${
                    showPhoto ? "translate-x-4.5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Links (No Admin link) */}
          <div className="space-y-1">
            <button role="menuitem" type="button" className={itemClass} onClick={() => { setOpen(false); auth.openModal("card"); }}>
              My rank card
            </button>
            <button role="menuitem" type="button" className={itemClass} onClick={() => { setOpen(false); auth.openModal("photo"); }}>
              Change photo
            </button>
            <button role="menuitem" type="button" className={itemClass} onClick={() => { setOpen(false); void auth.logout(); }}>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ NAVIGATION ═════════════════════════════════ */
function Nav({
  mode,
  onToggle,
  declared,
  brand,
}: {
  mode: "light" | "dark";
  onToggle: () => void;
  declared: boolean;
  brand: { name: string };
}) {
  const auth = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const links = [
    { href: "#leaderboard", label: "Leaderboard" },
    { href: "#overview", label: "Contest Overview" },
    { href: "#winners", label: declared ? "Winners" : "Leaders" },
    { href: "#how", label: "How to enter" },
    { href: "#faq", label: "FAQs" },
  ];

  return (
    <header className={cn(WRAP, "sticky top-4 z-50 mt-4")}>
      <div
        className={cn(
          "flex h-16 items-center justify-between gap-4 rounded-full border bg-bg/60 pl-5 pr-2 backdrop-blur-xl transition duration-300",
          scrolled || open ? "border-hairline bg-bg/80 shadow-[0_8px_30px_-12px_rgba(0,0,0,.18)]" : "border-hairline/60"
        )}
      >
        <a href="#top" className="inline-flex items-center gap-2 text-ctitle text-ink font-bold" aria-label={`${brand.name} home`}>
          <LogoGlyph size={24} />
          {brand.name}
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
          {auth.user ? <AccountMenu /> : <RankCta size="default" />}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="grid size-11 place-items-center rounded-full text-ink transition hover:bg-ink/5 md:hidden"
          >
            <Icon name={open ? "x" : "menu"} size={20} />
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <div
        className={cn(
          "absolute inset-x-5 top-full mt-2 origin-top rounded-2xl border border-hairline bg-card p-4 shadow-xl transition duration-300 sm:inset-x-8 md:hidden",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
        )}
      >
        <div className="flex flex-col gap-1">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex h-11 items-center px-3 text-body font-medium text-ink hover:bg-accent/10 rounded-lg">
              {l.label}
            </a>
          ))}
        </div>
        {!auth.user && (
          <div className="mt-4 pt-4 border-t border-hairline flex flex-col">
            <RankCta size="hero" className="w-full" />
          </div>
        )}
      </div>
    </header>
  );
}

/* ═══════════════════════════ HERO ═══════════════════════════════════════ */
const STATUS_LABEL: Record<ContestStatus, { pill: string; badge: string }> = {
  upcoming: { pill: "Upcoming", badge: "Starts soon" },
  registration_open: { pill: "Registration open", badge: "Open for entries" },
  active: { pill: "Live contest", badge: "Live trading" },
  ended: { pill: "Ended", badge: "Contest ended" },
  winners_declared: { pill: "Winners declared", badge: "Championship complete" },
};

function Hero({ d, subtitle }: { d: Landing; brand?: { name: string; tagline: string }; subtitle: string }) {
  const f = useFmt();
  const c = d.competition.data;
  const status = c?.status ?? "active";
  const st = STATUS_LABEL[status];

  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
      {/* Background Animated Mesh Blobs & Grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="f-blob a" />
        <div className="f-blob b" />
        <div className="f-blob c" />
        <div className="fg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <div className={WRAP}>
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <Reveal variant="up">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1 text-meta font-medium text-accent mb-6 shadow-xs">
                <LiveDot on={status === "active"} />
                {st.badge}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink leading-[1.1]">
                <span className="sr-only">Trade smart. Climb the Board!</span>
                <span aria-hidden="true">
                  {["Trade", "smart.", "Climb", "the", "Board!"].map((w, i) => (
                    <span key={i} className="fg-word inline-block overflow-hidden pb-1 align-top">
                      <span className={i >= 2 ? GRAD_TEXT : undefined} style={{ "--w": i } as CSSProperties}>
                        {w}
                      </span>
                      {i < 4 ? "\u00a0" : ""}
                    </span>
                  ))}
                </span>
              </h1>

              <p className="mt-5 text-lg text-mute max-w-xl leading-relaxed">
                {subtitle}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <RankCta size="hero" />
                <Button variant="ghost" size="lg" href="#leaderboard">
                  View leaderboard
                </Button>
              </div>

              {d.stats.data && (
                <div className="mt-10 grid grid-cols-3 gap-4 border-t border-hairline pt-6 max-w-lg">
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-ink">
                      <CountUp value={d.stats.data.prizeFund} format={f.money} />
                    </div>
                    <div className="text-xs text-mute mt-0.5">Prize Fund (USD)</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-ink">
                      <CountUp value={d.stats.data.activeTraders} format={f.num} />
                    </div>
                    <div className="text-xs text-mute mt-0.5">Active Traders</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-ink text-up">
                      +{d.stats.data.avgReturnPct}%
                    </div>
                    <div className="text-xs text-mute mt-0.5">Average Return</div>
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          {/* Top 3 Podium Card */}
          <div className="lg:pl-6">
            <Reveal variant="scale" delay={150}>
              <Top3Card d={d} />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Top3Card({ d }: { d: Landing }) {
  const f = useFmt();
  const c = d.competition.data;
  const declared = c?.status === "winners_declared";
  const board = d.board.data && d.board.data.key.startsWith("overall") ? d.board.data.top3 : null;
  const rows = board && board.length >= 3 ? board.slice(0, 3) : d.winners.data?.winners.slice(0, 3) ?? null;

  // Podium order: [Rank 2, Rank 1, Rank 3]
  const podiumOrder = rows && rows.length >= 3 ? [rows[1], rows[0], rows[2]] : null;

  return (
    <InView className="w-full">
      <div className={cn("f-spot relative overflow-clip rounded-2xl border border-hairline bg-card/85 p-6 backdrop-blur-xl shadow-xl", SHADOW)}>
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-label uppercase text-mute font-semibold">
            <Icon name="trophy" size={14} className="text-accent" />
            {declared ? "Championship Winners" : "Current Board Leaders"}
          </span>
          <LiveDot on={!declared} />
        </div>

        {podiumOrder ? (
          <div className="mt-8 flex items-end justify-center gap-2.5 sm:gap-4 pt-4">
            {podiumOrder.map((r) => {
              const isChamp = r.rank === 1;
              const isRank2 = r.rank === 2;
              const pedHeight = isChamp ? "h-32" : isRank2 ? "h-24" : "h-16";
              const delay = isChamp ? "350ms" : isRank2 ? "100ms" : "600ms";

              return (
                <div key={r.rank} className={cn("flex flex-1 flex-col items-center text-center", isChamp && "relative z-10")}>
                  {/* Avatar & Crown/Spotlight */}
                  <div className="relative mb-2 flex flex-col items-center">
                    {isChamp && (
                      <>
                        <div className="f-spotlight absolute -top-12 -left-12 -right-12 -bottom-12 rounded-full bg-accent/25 blur-xl pointer-events-none" aria-hidden="true" />
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20">
                          <Crown />
                        </div>
                      </>
                    )}
                    <div
                      className={cn(
                        "relative rounded-full ring-2 transition-transform hover:scale-105",
                        isChamp ? "ring-gold shadow-lg" : isRank2 ? "ring-silver shadow-md" : "ring-bronze shadow-md"
                      )}
                    >
                      <Avatar name={r.name} src={r.avatarUrl} size={isChamp ? 56 : 46} />
                      {isChamp && <div className="f-shine" aria-hidden="true" />}
                    </div>
                  </div>

                  {/* Name & Flag */}
                  <div className="mt-1 flex items-center gap-1 font-semibold text-ink text-xs truncate max-w-[90px] sm:max-w-[110px]">
                    <span className="truncate">{r.name}</span>
                    <Flag code={r.countryCode} size={11} />
                  </div>

                  {/* Net Profit CountUp */}
                  <div className="text-xs font-bold text-up tabular-nums mt-0.5">
                    +<CountUp value={r.netProfit} format={f.money} />
                  </div>

                  {/* Rising Pedestal */}
                  <div
                    className={cn(
                      "f-ped mt-3 w-full rounded-t-2xl flex flex-col items-center justify-start pt-2.5 border border-b-0 shadow-inner",
                      pedHeight,
                      isChamp
                        ? "border-gold/40 bg-linear-to-b from-gold/25 via-gold/10 to-card text-gold"
                        : isRank2
                        ? "border-silver/40 bg-linear-to-b from-silver/25 via-silver/10 to-card text-silver"
                        : "border-bronze/40 bg-linear-to-b from-bronze/25 via-bronze/10 to-card text-bronze"
                    )}
                    style={{ "--pd": delay } as CSSProperties}
                    aria-hidden="true"
                  >
                    <b className="text-2xl sm:text-3xl font-black">{r.rank}</b>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex h-14 items-center gap-3 px-3">
                <Sk w={28} h={28} className="rounded-full" />
                <Sk w={36} h={36} className="rounded-full" />
                <Sk h={16} className="flex-1" />
                <Sk w={64} h={16} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between">
          <a href="#leaderboard" className="inline-flex h-10 items-center gap-2 text-cell font-semibold text-accent transition hover:gap-3">
            View full leaderboard <Icon name="arrow" size={16} />
          </a>
          <span className="text-[11px] text-faint">Live standings</span>
        </div>
      </div>
    </InView>
  );
}

/* ═══════════════════════════ TICKER STRIP ═══════════════════════════════ */
function TickerItem({ a }: { a: ActivityItem }) {
  const f = useFmt();
  const icon = a.kind === "trade_win" ? "bolt" : a.kind === "rank_up" ? "up" : "trophy";
  return (
    <span className="inline-flex h-11 items-center gap-2 whitespace-nowrap border-r border-hairline px-6 text-meta text-mute">
      <span className="grid size-5 place-items-center rounded-full bg-accent/10 text-accent">
        <Icon name={icon} size={12} />
      </span>
      <b className="font-semibold text-ink">{a.name}</b>
      {a.kind === "trade_win" && (
        <>
          closed trade <span className="font-semibold text-up">+{f.money(a.amount)}</span> on {a.instrument}
        </>
      )}
      {a.kind === "rank_up" && <>climbed the board on {a.instrument}</>}
      {a.kind === "joined" && <>joined championship · {a.instrument}</>}
      <span className="text-faint">· {timeAgo(a.at)}</span>
    </span>
  );
}

function TickerStrip({ d }: { d: Landing }) {
  return (
    <div role="region" aria-label="Live activity" className="flex h-11 items-center overflow-hidden border-y border-hairline bg-bg">
      <Async
        res={d.activity}
        what="activity"
        onRetry={() => d.retry("activity")}
        skeleton={<div className="flex w-full gap-6 px-6"><Sk w={240} h={16} /><Sk w={200} h={16} /></div>}
        isEmpty={(a) => a.length === 0}
        emptyText="Activity will show up here as trades close."
      >
        {(items) => (
          <Track dur={Math.max(40, items.length * 7)}>
            {items.map((a) => (
              <TickerItem key={a.id} a={a} />
            ))}
          </Track>
        )}
      </Async>
    </div>
  );
}

/* ═══════════════════════════ CONTEST OVERVIEW ═══════════════════════════ */
function ContestOverviewSection({ d }: { d: Landing }) {
  const f = useFmt();
  const c = d.competition.data;

  return (
    <Section id="overview">
      <SectionHead
        id="overview"
        eyebrow="Performance"
        title="Contest overview"
        sub="Live trading volume and performance metrics across the FOGM Trading Championship."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Area Chart Card */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-ctitle font-bold text-ink">{c?.title ?? "FOGM Championship"}</h3>
                <p className="text-xs text-mute mt-0.5">Realised net profit growth over time (USD)</p>
              </div>
              {c && (
                <Pill tone="accent">
                  <LiveDot on={c.status === "active"} />
                  {STATUS_LABEL[c.status].pill}
                </Pill>
              )}
            </div>

            <div className="min-h-[220px] mt-4">
              <Async
                res={d.history}
                what="profit history"
                onRetry={() => d.retry("history")}
                skeleton={<Sk h={220} className="rounded-xl" />}
                isEmpty={(h) => h.length < 2}
              >
                {(h) => (
                  <AreaChart
                    labels={h.map((x) => f.date(x.date, { day: "numeric", month: "short", year: undefined }))}
                    values={h.map((x) => x.totalProfit)}
                    formatY={f.compact}
                    formatTip={(i) => `${f.date(h[i].date, { day: "numeric", month: "short", year: undefined })} · ${f.money(h[i].totalProfit)}`}
                    ariaLabel="Area chart of cumulative contest net profit"
                  />
                )}
              </Async>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-accent/10 p-4 text-cell text-mute">
              <Icon name="info" size={16} className="mt-0.5 text-accent" />
              <span>
                <b className="font-semibold text-ink">Net Profit Ranking.</b> Your realised profit in USD across all closed trades during the contest period.
              </span>
            </div>
          </Card>
        </div>

        {/* Volume by Instrument Breakdown */}
        <div>
          <Card className="h-full">
            <h3 className="text-ctitle font-bold text-ink">Volume by instrument</h3>
            <p className="mb-5 mt-1 text-meta text-mute">Distribution of lots traded across classes</p>

            <Async
              res={d.segments}
              what="instrument breakdown"
              onRetry={() => d.retry("segments")}
              skeleton={<div className="grid gap-4">{[0, 1, 2, 3].map((i) => <Sk key={i} h={40} />)}</div>}
              isEmpty={(s) => s.length === 0}
            >
              {(items) => (
                <InView className="grid gap-4">
                  {items.map((item, idx) => (
                    <div key={item.instrumentClass || idx}>
                      <div className="flex items-baseline justify-between text-cell">
                        <span className="font-medium text-ink">{item.instrumentClass}</span>
                        <span className="text-meta text-mute">
                          <CountUp value={item.volumeLots} format={f.num} /> lots · <CountUp value={item.sharePct} format={(n) => `${Math.round(n)}%`} />
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
                        <div
                          className="fg-bar h-full rounded-full bg-linear-to-r from-accent to-accent-2"
                          style={{ "--p": item.sharePct / 100, animationDelay: `${idx * 110 + 150}ms` } as CSSProperties}
                        />
                      </div>
                    </div>
                  ))}
                </InView>
              )}
            </Async>
          </Card>
        </div>
      </div>

      {/* 6 Stat Tiles (Zero pool/progress bar) */}
      <InView className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {d.stats.data ? (
          <>
            <Card className={cn("p-4 text-center", ST)} style={{ "--i": 0 } as CSSProperties}>
              <span className="text-xs text-mute block">Prize Fund</span>
              <span className="text-lg font-bold text-ink mt-1 block">
                <CountUp value={d.stats.data.prizeFund} format={f.money} />
              </span>
            </Card>
            <Card className={cn("p-4 text-center", ST)} style={{ "--i": 1 } as CSSProperties}>
              <span className="text-xs text-mute block">Active Traders</span>
              <span className="text-lg font-bold text-ink mt-1 block">
                <CountUp value={d.stats.data.activeTraders} format={f.num} />
              </span>
            </Card>
            <Card className={cn("p-4 text-center", ST)} style={{ "--i": 2 } as CSSProperties}>
              <span className="text-xs text-mute block">Total Volume</span>
              <span className="text-lg font-bold text-ink mt-1 block">
                <CountUp value={d.stats.data.totalVolumeLots} format={f.num} /> <span className="text-xs font-normal text-mute">lots</span>
              </span>
            </Card>
            <Card className={cn("p-4 text-center", ST)} style={{ "--i": 3 } as CSSProperties}>
              <span className="text-xs text-mute block">Best Trade</span>
              <span className="text-lg font-bold text-up mt-1 block">
                +<CountUp value={d.stats.data.bestTradeProfit} format={f.money} />
              </span>
            </Card>
            <Card className={cn("p-4 text-center", ST)} style={{ "--i": 4 } as CSSProperties}>
              <span className="text-xs text-mute block">Avg Return</span>
              <span className="text-lg font-bold text-up mt-1 block">
                +{d.stats.data.avgReturnPct}%
              </span>
            </Card>
            <Card className={cn("p-4 text-center", ST)} style={{ "--i": 5 } as CSSProperties}>
              <span className="text-xs text-mute block">Total Trades</span>
              <span className="text-lg font-bold text-ink mt-1 block">
                <CountUp value={d.stats.data.totalTrades} format={f.num} />
              </span>
            </Card>
          </>
        ) : (
          [0, 1, 2, 3, 4, 5].map((i) => <Sk key={i} h={80} className="rounded-xl" />)
        )}
      </InView>
    </Section>
  );
}

/* ═══════════════════════════ LEADERBOARD SECTION ════════════════════════ */
const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "overall", label: "Overall" },
];

/** Floating "your rank" bar. Slides away while your own row is fully on screen. */
function YouBar({ you, cutoff, cutoffRank, rowsKey, onJump }: { you: LeaderboardEntry; cutoff: number | undefined; cutoffRank: number | undefined; rowsKey: number; onJump: () => void }) {
  const f = useFmt();
  const auth = useAuth();
  const [rowOn, setRowOn] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const el = document.getElementById("you-row");
      if (!el) return setRowOn(false);
      const r = el.getBoundingClientRect();
      setRowOn(r.top >= 80 && r.bottom <= window.innerHeight - 8);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rowsKey, you.rank]);
  const gap = cutoff !== undefined ? Math.max(0, cutoff - you.netProfit) : 0;
  const pct = cutoff && cutoff > 0 ? Math.min(1, Math.max(0, you.netProfit / cutoff)) : 1;
  return (
    <div className="pointer-events-none sticky bottom-4 z-20 h-0">
      <div
        role="complementary"
        aria-label="Your rank"
        aria-hidden={rowOn || undefined}
        className={cn(
          "fg-gborder absolute inset-x-0 bottom-0 overflow-hidden rounded-2xl bg-card/90 shadow-xl backdrop-blur-xl transition duration-500 ease-soft",
          rowOn ? "pointer-events-none translate-y-6 opacity-0" : "pointer-events-auto translate-y-0 opacity-100"
        )}
      >
        <div className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
          <div className="grid shrink-0 place-items-center leading-none">
            <span className="text-label uppercase text-faint">Rank</span>
            <span className="mt-1 text-ctitle font-bold tabular-nums text-ink">#{you.rank}</span>
          </div>
          <span className="hidden sm:block">
            <Avatar name={you.name} src={you.avatarUrl} size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-cell font-medium text-ink">{you.name}</span>
              <Pill tone="accent">You</Pill>
            </div>
            <div className="mt-0.5 text-meta text-mute sm:truncate">
              {you.inWinningZone || gap === 0 ? (
                <span className="font-semibold text-up">In the winning zone</span>
              ) : (
                <>
                  <b className="font-semibold text-ink">{f.money(gap)}</b> to reach the top {cutoffRank ?? 20}
                </>
              )}
            </div>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <div className="text-label uppercase text-faint">Net profit</div>
            <div className={cn("text-cell font-semibold tabular-nums", you.netProfit >= 0 ? "text-up" : "text-down")}>
              {you.netProfit >= 0 ? "+" : ""}
              {f.money(you.netProfit)}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" onClick={onJump} className="!px-3">
              <span aria-hidden="true">↓</span>
              <span className="sr-only md:not-sr-only">My row</span>
            </Button>
            <span className="hidden sm:contents">
              <Button onClick={() => auth.openModal("card")}>Share</Button>
            </span>
          </div>
        </div>
        <div aria-hidden="true" className="h-1 bg-ink/10">
          <div className="h-full bg-linear-to-r from-accent to-accent-2" style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function LeaderboardSection({ d }: { d: Landing }) {
  const f = useFmt();
  const auth = useAuth();
  const { user } = auth;
  const entries = d.board.data?.page.entries ?? [];
  const cutoff = d.board.data?.page.cutoffValue;
  const you = d.board.data?.page.you ?? (user ? entries.find((e) => e.userId === user.id) ?? null : null);

  /* jump to my row: scroll + flash; pages in more rows first if my row isn't loaded yet */
  const wantRef = useRef(false);
  const [kick, setKick] = useState(0);
  const lastLen = useRef(-1);
  const reduced = usePrefersReducedMotion();
  const focusTick = auth.focusTick;
  const busy = d.board.state === "loading";
  const entriesLen = entries.length;
  useEffect(() => {
    if (focusTick > 0) wantRef.current = true;
  }, [focusTick]);
  useEffect(() => {
    if (!wantRef.current) return;
    const t = setTimeout(() => {
      wantRef.current = false;
    }, 9000);
    return () => clearTimeout(t);
  }, [focusTick, kick]);
  useEffect(() => {
    if (!wantRef.current || !d.board.data) return;
    const el = document.getElementById("you-row");
    if (el) {
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      el.classList.remove("fg-hi");
      void el.offsetWidth;
      el.classList.add("fg-hi");
      setTimeout(() => el.classList.remove("fg-hi"), 3000);
      wantRef.current = false;
      return;
    }
    if (!you) return; // my entry hasn't arrived yet; the 9s guard above ends the wait
    const maxRank = entries.reduce((m, e) => Math.max(m, e.rank), 0);
    if (!d.search && you.rank > maxRank && d.hasMore) {
      if (!busy && lastLen.current !== entriesLen) {
        lastLen.current = entriesLen;
        d.loadMore();
      }
      return;
    }
    document.getElementById("leaderboard")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    wantRef.current = false;
  }, [kick, focusTick, d, entries, you, busy, entriesLen, reduced]);

  return (
    <Section id="leaderboard" alt>
      <SectionHead
        id="leaderboard"
        center
        eyebrow="Leaderboard"
        title="Who's climbing the board"
        sub="Ranked strictly by Net Profit: your realised profit in USD across all closed trades during the championship period."
      />

      {/* Period Tabs & Search */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex rounded-full border border-hairline bg-card p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => d.setPeriod(p.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                d.period === p.id
                  ? "bg-linear-to-br from-accent to-accent-2 text-accent-ink shadow-[0_4px_16px_-4px_color-mix(in_oklab,var(--accent)_60%,transparent)] font-semibold"
                  : "text-mute hover:text-ink"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-auto min-w-[240px]">
          <input
            type="text"
            placeholder="Search trader or city..."
            value={d.search}
            onChange={(e) => d.setSearch(e.target.value)}
            className="w-full h-10 px-4 rounded-full border border-hairline bg-card text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Board Table */}
      <div>
      <div className="rounded-2xl border border-hairline bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline bg-alt text-xs font-semibold text-mute uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Trader</th>
                <th className="py-3 px-4 text-center">Move</th>
                <th className="py-3 px-4 text-center">Trades</th>
                <th className="py-3 px-4 text-center">Win Rate</th>
                <th className="py-3 px-4 text-center">Return</th>
                <th className="py-3 px-4 text-center hidden md:table-cell">Trend (14d)</th>
                <th className="py-3 px-4 text-right">Net Profit (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {d.board.state === "loading" && entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-mute text-xs">
                    Loading standings...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-mute text-xs">
                    No traders found for &quot;{d.search}&quot;.
                  </td>
                </tr>
              ) : (
                entries.map((e, i) => {
                  const isYou = user?.id === e.userId;
                  return (
                    <tr
                      key={e.rank}
                      id={isYou ? "you-row" : undefined}
                      className={cn(
                        "scroll-mt-40",
                        "row-st group f-wash hover:bg-accent/5 transition-colors",
                        e.inWinningZone && "bg-accent/[0.02]",
                        isYou && "bg-accent/10 font-medium"
                      )}
                      style={{ animationDelay: `${Math.min(i, 20) * 45}ms` }}
                    >
                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            "inline-grid size-7 place-items-center rounded-full text-xs font-bold transition-transform duration-200 group-hover:scale-110",
                            e.rank === 1
                              ? "bg-amber-400 text-amber-950 shadow-xs"
                              : e.rank === 2
                              ? "bg-zinc-300 text-zinc-900 shadow-xs"
                              : e.rank === 3
                              ? "bg-amber-700 text-white shadow-xs"
                              : e.inWinningZone
                              ? "bg-accent/10 text-accent font-semibold"
                              : "text-mute"
                          )}
                        >
                          {e.rank}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={e.name} src={e.avatarUrl} size={36} />
                          <div>
                            <div className="font-semibold text-ink flex items-center gap-1.5">
                              {e.name}
                              <Flag code={e.countryCode} size={14} />
                              {isYou && <Pill tone="accent">You</Pill>}
                            </div>
                            <div className="text-[11px] text-mute">
                              {e.city} · <span className="font-mono text-accent">{e.topInstrument}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Movement movement={e.movement} previousRank={e.previousRank} />
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-xs tabular-nums text-ink">
                        {f.num(e.tradesCount)}
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-xs tabular-nums text-ink">
                        {e.winRatePct}%
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-xs tabular-nums text-up font-semibold">
                        +{e.returnPct}%
                      </td>

                      <td className="py-3 px-4 text-center hidden md:table-cell">
                        <div className="flex justify-center">
                          <Sparkline values={e.trend} />
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span
                          className={cn(
                            "font-bold font-mono text-sm tabular-nums",
                            e.netProfit >= 0 ? "text-up" : "text-down"
                          )}
                        >
                          {e.netProfit >= 0 ? "+" : ""}
                          {f.money(e.netProfit)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {d.hasMore && (
          <div className="p-4 border-t border-hairline text-center bg-alt/50">
            <button
              type="button"
              onClick={d.loadMore}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Load more traders ↓
            </button>
          </div>
        )}
      </div>

      {you && (
        <YouBar
          you={you}
          cutoff={cutoff}
          cutoffRank={d.board.data?.page.cutoffRank}
          rowsKey={entriesLen}
          onJump={() => {
            lastLen.current = -1;
            wantRef.current = true;
            setKick((k) => k + 1);
          }}
        />
      )}
      </div>

      {cutoff !== undefined && (
        <p className="mt-4 text-xs text-center text-mute">
          Winning zone threshold: traders ranked 1–20 have realized at least{" "}
          <b className="text-ink">{f.money(cutoff)}</b> in net profit.
        </p>
      )}
    </Section>
  );
}

/* ═══════════════════════════ WINNERS & PODIUMS ══════════════════════════ */
function WinnersSection({ d }: { d: Landing }) {
  const f = useFmt();
  const c = d.competition.data;
  const w = d.winners;
  const declared = c?.status === "winners_declared";
  const champ = w.data?.champion;

  return (
    <Section id="winners">
      <SectionHead
        id="winners"
        center
        eyebrow={declared ? "Winners" : "Current Leaders"}
        title={declared ? "Meet the Champions" : "Who's leading right now"}
        sub={
          declared
            ? "Verified and declared. Congratulations to all traders in the winning zone."
            : "Provisional standings. Final winners confirmed after the championship ends and eligibility verification is completed."
        }
      />

      <Async
        res={w}
        what="winners"
        onRetry={() => d.retry("winners")}
        skeleton={<Sk h={320} className="rounded-2xl" />}
        isEmpty={(x) => x.winners.length === 0 && !x.champion}
      >
        {(data) => (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            {champ && (
              <Card spot className="h-full flex flex-col justify-between">
                <div>
                  <Pill tone="accent">
                    <Icon name="trophy" size={12} />
                    {declared ? "Championship Winner" : "Provisional Leader (#1)"}
                  </Pill>

                  <div className="mt-4 flex items-center gap-4">
                    <Avatar name={champ.name} src={champ.avatarUrl} size={64} />
                    <div>
                      <h3 className="text-xl font-bold text-ink flex items-center gap-2">
                        {champ.name}
                        <Flag code={champ.countryCode} size={18} />
                      </h3>
                      <p className="text-xs text-mute mt-0.5">{champ.city}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <span className="text-xs text-mute uppercase font-mono">Realised Net Profit</span>
                    <div className="text-3xl font-extrabold text-up mt-1">
                      +{f.money(champ.netProfit)}
                    </div>
                  </div>

                  <div className="mt-4 min-h-[160px]">
                    <AreaChart
                      labels={champ.trend.map((_, i) => `Day ${i + 1}`)}
                      values={champ.trend}
                      formatY={f.compact}
                      formatTip={(i) => `Day ${i + 1} · ${f.money(champ.trend[i])}`}
                      height={160}
                      ariaLabel="Champion profit trend"
                    />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 border-t border-hairline pt-4 text-center">
                  <div>
                    <span className="text-[10px] text-mute uppercase block">Win Rate</span>
                    <span className="text-sm font-bold text-ink">{champ.winRatePct}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-mute uppercase block">Return</span>
                    <span className="text-sm font-bold text-up">+{champ.returnPct}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-mute uppercase block">Top Asset</span>
                    <span className="text-sm font-bold text-accent font-mono">{champ.topInstrument}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Top 20 list */}
            <Card className="h-full flex flex-col">
              <h3 className="text-base font-bold text-ink mb-1">
                {declared ? "All 20 Final Winners" : "Top 20 in the Winning Zone"}
              </h3>
              <p className="text-xs text-mute mb-4">Rank, prize tier and net profit</p>

              <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1">
                {data.winners.map((m) => (
                  <div
                    key={m.rank}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-hairline hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-6 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                        {m.rank}
                      </span>
                      <Avatar name={m.name} src={m.avatarUrl} size={30} />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-ink truncate block">
                          {m.name} <Flag code={m.countryCode} size={12} />
                        </span>
                        <span className="text-[10px] text-faint block">{m.prize}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-up font-mono">
                        +{f.money(m.netProfit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </Async>
    </Section>
  );
}

/* ═══════════════════════════ PRIZES SECTION ═════════════════════════════ */
function PrizesSection({ d }: { d: Landing }) {
  return (
    <Section id="prizes" alt>
      <SectionHead
        id="prizes"
        center
        eyebrow="Prize Fund"
        title="Win big, trade with pride"
        sub="Ranks 1 to 20 make up the official championship winning zone, sharing cash rewards."
      />

      <Async
        res={d.prizes}
        what="prizes"
        onRetry={() => d.retry("prizes")}
        skeleton={<div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <Sk key={i} h={260} />)}</div>}
        isEmpty={(t) => t.length === 0}
      >
        {(tiers) => (
          <div className="grid gap-6 md:grid-cols-3">
            {tiers.map((t, idx) => {
              const grand = t.id === "grand";
              return (
                <Reveal key={t.id} variant="up" delay={idx * 80}>
                  <Card spot className={cn("flex flex-col justify-between h-full", grand && "border-accent ring-1 ring-accent")}>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/10 text-accent">
                          {t.ranksFrom === t.ranksTo ? `Rank #${t.ranksFrom}` : `Ranks #${t.ranksFrom} – #${t.ranksTo}`}
                        </span>
                        <span className="text-xs text-mute font-mono">{t.winnersCount} {t.winnersCount === 1 ? "winner" : "winners"}</span>
                      </div>
                      <h3 className="text-lg font-bold text-ink">{t.label}</h3>
                      <p className="text-2xl font-extrabold text-up font-mono mt-1">{t.reward}</p>

                      {t.perks && t.perks.length > 0 && (
                        <ul className="mt-4 space-y-2 border-t border-hairline pt-3">
                          {t.perks.map((p, pIdx) => (
                            <li key={pIdx} className="text-xs text-mute flex items-center gap-2">
                              <span className="text-accent font-bold">✓</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        )}
      </Async>
    </Section>
  );
}

/* ═══════════════════════════ HOW IT WORKS & RULES ═══════════════════════ */
function HowSection({ d }: { d: Landing }) {
  return (
    <Section id="how">
      <SectionHead
        id="how"
        center
        eyebrow="Participation"
        title="How to enter the championship"
        sub="Simple steps to verify your account and qualify on the leaderboard."
      />

      <Async
        res={d.content}
        what="content"
        onRetry={() => d.retry("content")}
        skeleton={<Sk h={240} className="rounded-xl" />}
        isEmpty={(c) => c.steps.length === 0}
      >
        {(c) => (
          <div className="space-y-12">
            <div className="grid gap-6 md:grid-cols-3">
              {c.steps.map((s, idx) => (
                <Reveal key={idx} variant="up" delay={idx * 80}>
                  <Card className="relative p-6 h-full">
                    <span className="text-4xl font-extrabold text-accent/20 block mb-2 font-mono">
                      0{idx + 1}
                    </span>
                    <h3 className="text-base font-bold text-ink mb-2">{s.title}</h3>
                    <p className="text-xs text-mute leading-relaxed">{s.body}</p>
                  </Card>
                </Reveal>
              ))}
            </div>

            {/* Rules */}
            <div id="rules" className="pt-8 border-t border-hairline">
              <h3 className="text-lg font-bold text-ink mb-4 text-center">Championship Rules & Eligibility</h3>
              <div className="grid gap-3 sm:grid-cols-2 max-w-4xl mx-auto">
                {c.rules.map((rule, idx) => (
                  <Reveal key={idx} variant="fade" delay={idx * 30}>
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-alt border border-hairline text-xs text-mute h-full">
                      <span className="text-accent font-bold">●</span>
                      <span>{rule}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        )}
      </Async>
    </Section>
  );
}

/* ═══════════════════════════ FAQs ═══════════════════════════════════════ */
function FaqSection({ d }: { d: Landing }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section id="faq" alt>
      <SectionHead id="faq" center eyebrow="FAQs" title="Frequently answered questions" />

      <Async
        res={d.content}
        what="FAQs"
        onRetry={() => d.retry("content")}
        skeleton={<Sk h={200} className="rounded-xl" />}
        isEmpty={(c) => c.faqs.length === 0}
      >
        {(c) => (
          <div className="max-w-2xl mx-auto space-y-3">
            {c.faqs.map((q, idx) => {
              const isOpen = open === idx;
              return (
                <Reveal key={idx} variant="up" delay={idx * 50}>
                  <div className="rounded-2xl border border-hairline bg-card overflow-hidden transition hover:border-hairline-strong shadow-xs">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-semibold text-sm text-ink hover:text-accent transition-colors"
                    >
                      <span className="pr-4">{q.q}</span>
                      <span className="text-accent text-lg font-bold shrink-0 transition-transform duration-200">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    <div
                      className={cn(
                        "grid transition-all duration-300 ease-out",
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="px-4 sm:px-5 pb-5 text-xs text-mute leading-relaxed border-t border-hairline/60 pt-3">
                          {q.a}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </Async>
    </Section>
  );
}

/* ═══════════════════════════ CTA BAND ═══════════════════════════════════ */
function CtaBand({ tagline }: { tagline: string }) {
  return (
    <section className="border-t border-hairline py-16 md:py-24">
      <div className={WRAP}>
        <Reveal variant="scale">
          <InView>
            <div className="relative isolate overflow-hidden rounded-3xl border border-hairline bg-card px-5 py-14 text-center md:px-12">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-accent/60 to-transparent" />
              <span aria-hidden="true" className="absolute left-1/2 top-0 -z-10 h-56 w-[70%] -translate-x-1/2 -translate-y-1/2 animate-[f-breathe_8s_ease-in-out_infinite] rounded-full bg-accent/15 blur-3xl" />
              <span aria-hidden="true" className="fg-grid absolute inset-0 -z-10 opacity-25 [mask-image:radial-gradient(60%_80%_at_50%_0%,#000,transparent)]" />
              <h2 className="mx-auto max-w-xl text-2xl font-extrabold text-ink sm:text-4xl">
                <Words text={tagline || "Trade smart. Climb the board."} accent={3} />
              </h2>
              <p className={cn("mx-auto mt-4 max-w-md text-sm text-mute", ST)} style={{ "--i": 3 } as CSSProperties}>
                Outperform global traders on live accounts and take your place on the official leaderboard.
              </p>
              <div className={cn("mt-8 flex flex-wrap items-center justify-center gap-3", ST)} style={{ "--i": 4 } as CSSProperties}>
                <RankCta size="hero" />
                <Button variant="ghost" size="lg" href="#leaderboard">
                  View leaderboard
                </Button>
              </div>
            </div>
          </InView>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════ FOOTER ═════════════════════════════════════ */
function Footer({
  d,
  brand,
  disclosure,
  mode,
  onToggle,
}: {
  d: Landing;
  brand: { name: string; tagline: string };
  disclosure: string;
  mode: "light" | "dark";
  onToggle: () => void;
}) {
  const c = d.competition.data;

  return (
    <footer className="border-t border-hairline bg-alt py-12 text-xs text-mute">
      <div className={WRAP}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-hairline">
          <div className="space-y-2 md:col-span-1">
            <div className="flex items-center gap-2 font-bold text-base text-ink">
              <LogoGlyph size={22} />
              {brand.name}
            </div>
            <p className="text-xs text-mute">{brand.tagline}</p>
          </div>

          <div>
            <h4 className="font-semibold text-ink mb-2">Championship</h4>
            <ul className="space-y-1.5">
              <li><a href="#leaderboard" className="hover:text-accent">Leaderboard</a></li>
              <li><a href="#overview" className="hover:text-accent">Contest Overview</a></li>
              <li><a href="#winners" className="hover:text-accent">Winners</a></li>
              <li><a href="#prizes" className="hover:text-accent">Prizes</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-ink mb-2">Rules & FAQ</h4>
            <ul className="space-y-1.5">
              <li><a href="#rules" className="hover:text-accent">Terms & Rules</a></li>
              <li><a href="#faq" className="hover:text-accent">FAQs</a></li>
              <li><a href="#how" className="hover:text-accent">How to enter</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-ink mb-2">Partners</h4>
            {c?.partners && c.partners.length > 0 ? (
              <ul className="space-y-1">
                {c.partners.map((p, idx) => (
                  <li key={idx}>
                    <span className="font-medium text-ink">{p.name}</span>
                    <span className="block text-[10px] text-faint">{p.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-faint italic">Global Prime Brokers</span>
            )}
          </div>
        </div>

        {/* Risk Disclosure */}
        <div className="py-6 border-b border-hairline text-[11px] leading-relaxed text-mute/90">
          <p>{disclosure || "Trading forex, metals, and CFDs carries a high level of risk and may not be suitable for all investors. Past performance is no guarantee of future results."}</p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-faint">
          <span>© 2026 {brand.name}. All rights reserved.</span>
          <ThemeToggle mode={mode} onToggle={onToggle} />
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════ MAIN CLIENT EXPORT ═════════════════════════ */
export default function LandingClient({ settings }: { settings: SiteSettingsData }) {
  const [mode, setMode] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

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

  const palette: Palette = useMemo(
    () => ({
      light: settings.theme?.light ?? THEME.light,
      dark: settings.theme?.dark ?? THEME.dark,
    }),
    [settings.theme]
  );

  const css = useMemo(() => themeCss(palette), [palette]);

  // Check Maintenance Mode
  if (settings.maintenance?.enabled) {
    return (
      <div className="fogm min-h-screen flex items-center justify-center bg-bg font-sans p-6 text-center">
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="max-w-md p-8 rounded-2xl border border-hairline bg-card shadow-xl space-y-4">
          <div className="size-12 mx-auto rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xl">
            ⚠
          </div>
          <h1 className="text-xl font-bold text-ink">{settings.brand?.name ?? "FOGM"} Maintenance</h1>
          <p className="text-sm text-mute leading-relaxed">
            {settings.maintenance.message || "FOGM Trading Championship is currently undergoing scheduled updates. Please check back shortly."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 text-cell font-semibold rounded-xl bg-linear-to-br from-accent to-accent-2 text-accent-ink shadow hover:-translate-y-px transition"
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fogm min-h-screen overflow-x-clip bg-bg font-sans text-body text-ink antialiased tabular-nums">
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} suppressHydrationWarning />
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <AuthProvider>
        <LandingBody settings={settings} mode={mode} onToggle={toggle} />
      </AuthProvider>
    </div>
  );
}

function LandingBody({
  settings,
  mode,
  onToggle,
}: {
  settings: SiteSettingsData;
  mode: "light" | "dark";
  onToggle: () => void;
}) {
  const { user } = useAuth();
  const sessionKey = user ? `${user.id}|${user.name}|${user.avatarUrl ?? ""}|${user.showName}|${user.showPhoto}` : "anon";
  const d = useLandingData(sessionKey);

  const cur = d.competition.data?.currency ?? settings.contest?.currency;
  const fmt = useMemo(() => makeFmt(cur), [cur]);
  const declared = d.competition.data?.status === "winners_declared";

  const brand = settings.brand ?? { name: "FOGM", tagline: "Make your move." };
  const subtitle = settings.contest?.subtitle ?? "Trade forex, gold and indices on live accounts. The best performers climb the board and win.";

  return (
    <FmtCtx.Provider value={fmt}>
      <Nav mode={mode} onToggle={onToggle} declared={declared} brand={brand} />
      <main id="main">
        <Hero d={d} brand={brand} subtitle={subtitle} />
        <TickerStrip d={d} />
        <LeaderboardSection d={d} />
        <ContestOverviewSection d={d} />
        <WinnersSection d={d} />
        <PrizesSection d={d} />
        <HowSection d={d} />
        <FaqSection d={d} />
        <CtaBand tagline={brand.tagline} />
      </main>
      <Footer d={d} brand={brand} disclosure={settings.disclosure} mode={mode} onToggle={onToggle} />
    </FmtCtx.Provider>
  );
}
