import type { CSSProperties } from "react";
import { ACCENT, SURFACE, TIER_COLORS, type Tier } from "./card-theme";

/* Satori-safe (next/og) markup: inline styles only, flexbox everywhere, no emoji, no CSS variables. */

export type CardFormat = "story" | "og";
export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1350 },
  og: { width: 1200, height: 630 },
};

export interface CardData {
  rank: number;
  total: number;
  topPct: number;
  name: string;
  /** data: URI (PNG) or null → initials */
  avatar: string | null;
  initials: string;
  countryCode: string;
  city: string;
  savedText: string;
  tradesText: string;
  topSegment: string;
  trend: number[];
  tier: Tier;
  anonymous: boolean;
  contestTitle: string;
  siteHost: string;
  totalText: string;
}

const flex = (s: CSSProperties = {}): CSSProperties => ({ display: "flex", ...s });

function Sparkline({ values, w, h, color }: { values: number[]; w: number; h: number; color: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pad = 8;
  const pts = values.map((v, i) => [pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2), h - pad - ((v - min) / span) * (h - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
      <path d={area} fill={color} fillOpacity={0.16} />
      <path d={line} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={7} fill={color} />
    </svg>
  );
}

function Grid({ w, h }: { w: number; h: number }) {
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", top: 0, left: 0 }}>
      <defs>
        <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="#ffffff" strokeOpacity="0.045" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#g)" />
    </svg>
  );
}

/** Deterministic star specks (no randomness: the same user always gets the same card). */
function Stars({ w, h, color }: { w: number; h: number; color: string }) {
  const dots = Array.from({ length: 34 }, (_, i) => {
    const x = ((i * 9301 + 49297) % 233280) / 233280;
    const y = ((i * 7919 + 12347) % 233280) / 233280;
    return { x: x * w, y: y * h, r: 1.2 + ((i * 37) % 5) * 0.55, o: 0.18 + ((i * 53) % 7) * 0.07 };
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", top: 0, left: 0 }}>
      {dots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={i % 4 === 0 ? color : "#ffffff"} fillOpacity={p.o} />
      ))}
    </svg>
  );
}

/** Four L-shaped corner marks, like a collectible card's registration ticks. */
function Corners({ w, h, inset, len, color }: { w: number; h: number; inset: number; len: number; color: string }) {
  const r = w - inset;
  const b = h - inset;
  const d = `M${inset} ${inset + len}V${inset}H${inset + len} M${r - len} ${inset}H${r}V${inset + len} M${r} ${b - len}V${b}H${r - len} M${inset + len} ${b}H${inset}V${b - len}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", top: 0, left: 0 }}>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeOpacity={0.7} />
    </svg>
  );
}

/** Percentile meter: fill = how many traders you are ahead of. */
function Meter({ pct, color, width, big }: { pct: number; color: string; width: number; big: boolean }) {
  const h = big ? 14 : 10;
  const fill = Math.max(6, Math.min(100, pct));
  return (
    <div style={flex({ flexDirection: "column", gap: big ? 12 : 8, width })}>
      <div style={flex({ justifyContent: "space-between", fontSize: big ? 20 : 14, letterSpacing: big ? 3 : 2, fontWeight: 600, color: SURFACE.faint })}>
        <div style={flex()}>{`AHEAD OF ${Math.round(pct)}% OF TRADERS`}</div>
      </div>
      <div style={flex({ width, height: h, borderRadius: h, background: "rgba(255,255,255,0.08)", overflow: "hidden" })}>
        <div style={flex({ width: (width * fill) / 100, height: h, borderRadius: h, background: `linear-gradient(90deg, ${color}66, ${color})` })} />
      </div>
    </div>
  );
}

function Logo({ size }: { size: number }) {
  return (
    <div style={flex({ width: size, height: size, borderRadius: size * 0.3, alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${ACCENT.a}, ${ACCENT.b})` })}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke={ACCENT.ink} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M15 7h6v6" />
      </svg>
    </div>
  );
}

function Portrait({ d, size, ring }: { d: CardData; size: number; ring: number }) {
  const c = TIER_COLORS[d.tier];
  const inner = size - ring * 2;
  return (
    <div style={flex({ width: size + 28, height: size + 28, borderRadius: size + 28, alignItems: "center", justifyContent: "center", border: `2px solid ${c.hi}55`, background: `radial-gradient(circle, ${c.lo}33, rgba(0,0,0,0))` })}>
    <div style={flex({ width: size, height: size, borderRadius: size, padding: ring, background: `linear-gradient(135deg, ${c.hi}, ${c.lo})`, boxShadow: `0 0 ${size / 2}px ${c.lo}88` })}>
      <div style={flex({ width: inner, height: inner, borderRadius: inner, overflow: "hidden", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${ACCENT.a}, ${ACCENT.b})`, border: `${Math.max(4, ring / 2)}px solid ${SURFACE.bottom}` })}>
        {d.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/og renders <img> with a data URI
          <img src={d.avatar} width={inner} height={inner} alt="" style={{ width: inner, height: inner, objectFit: "cover" }} />
        ) : (
          <div style={flex({ fontSize: inner * 0.38, fontWeight: 600, color: ACCENT.ink })}>{d.initials}</div>
        )}
      </div>
    </div>
    </div>
  );
}

function StatBox({ label, value, big, tint }: { label: string; value: string; big: boolean; tint: string }) {
  return (
    <div style={flex({ flex: 1, flexDirection: "column", minWidth: 0, gap: big ? 10 : 6, padding: big ? 28 : 16, borderRadius: big ? 28 : 18, border: `2px solid ${SURFACE.line}`, borderTop: `3px solid ${tint}88`, background: "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025))" })}>
      <div style={flex({ fontSize: big ? 20 : 14, letterSpacing: big ? 3 : 2, color: SURFACE.faint, fontWeight: 600 })}>{label.toUpperCase()}</div>
      <div style={flex({ fontSize: big ? 32 : 26, fontWeight: 600, color: SURFACE.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{value}</div>
    </div>
  );
}

function Badge({ children, color, big, fill }: { children: string; color: string; big: boolean; fill?: string }) {
  return (
    <div style={flex({ alignItems: "center", height: big ? 52 : 36, padding: big ? "0 28px" : "0 18px", borderRadius: 999, border: `2px solid ${color}`, color: fill ? "#1b1405" : color, background: fill ? `linear-gradient(135deg, ${color}, ${fill})` : "rgba(255,255,255,0.04)", fontSize: big ? 24 : 17, fontWeight: 600, letterSpacing: 2 })}>{children}</div>
  );
}

/** The whole card. `format` switches between the 4:5 story and the 1.91:1 link-preview layouts. */
export function CardView({ d, format }: { d: CardData; format: CardFormat }) {
  const { width, height } = CARD_SIZE[format];
  const c = TIER_COLORS[d.tier];
  const story = format === "story";
  const frame = story ? 18 : 12;
  const pw = width - frame * 2;
  const ph = height - frame * 2;
  const pct = `Top ${d.topPct}%`;
  const where = `${d.countryCode} · ${d.city}`;

  const sheen = (
    <div style={{ position: "absolute", top: 0, left: 0, width: pw, height: ph, background: "linear-gradient(115deg, rgba(255,255,255,0) 18%, rgba(255,255,255,0.10) 34%, rgba(124,92,255,0.16) 48%, rgba(70,220,200,0.12) 60%, rgba(255,255,255,0.05) 70%, rgba(255,255,255,0) 84%)" }} />
  );

  const header = (
    <div style={flex({ alignItems: "center", justifyContent: "space-between", width: "100%" })}>
      <div style={flex({ alignItems: "center", gap: story ? 16 : 12 })}>
        <Logo size={story ? 60 : 44} />
        <div style={flex({ fontSize: story ? 40 : 30, fontWeight: 600, color: SURFACE.ink })}>FOGM</div>
      </div>
      <div style={flex({ fontSize: story ? 26 : 20, color: SURFACE.mute, fontWeight: 400 })}>{d.contestTitle}</div>
    </div>
  );

  const footer = (
    <div style={flex({ alignItems: "center", justifyContent: "space-between", width: "100%" })}>
      <Badge color={c.hi} fill={c.lo} big={story}>{c.label.toUpperCase()}</Badge>
      <div style={flex({ flexDirection: "column", alignItems: "flex-end", gap: 4 })}>
        <div style={flex({ fontSize: story ? 26 : 19, color: SURFACE.ink, fontWeight: 600 })}>{d.siteHost}</div>
        <div style={flex({ fontSize: story ? 18 : 13, letterSpacing: 3, color: SURFACE.faint })}>{`NO. ${String(d.rank).padStart(5, "0")}`}</div>
      </div>
    </div>
  );

  const stats = (
    <div style={flex({ gap: story ? 20 : 12, width: "100%" })}>
      <StatBox label="Saved" value={d.savedText} big={story} tint={c.hi} />
      <StatBox label="Trades" value={d.tradesText} big={story} tint={c.hi} />
      <StatBox label="Top segment" value={d.topSegment} big={story} tint={c.hi} />
    </div>
  );

  const body = story ? (
    <div style={flex({ flexDirection: "column", alignItems: "center", width: "100%", gap: 22 })}>
      <Portrait d={d} size={264} ring={12} />
      <div style={flex({ flexDirection: "column", alignItems: "center", gap: 10, maxWidth: pw - 112 })}>
        <div style={flex({ fontSize: 58, fontWeight: 600, color: SURFACE.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: pw - 112 })}>{d.name}</div>
        <div style={flex({ fontSize: 28, color: SURFACE.mute })}>{where}</div>
      </div>
      <div style={flex({ flexDirection: "column", alignItems: "center", gap: 6 })}>
        <div style={flex({ fontSize: 190, fontWeight: 600, lineHeight: 1, color: c.hi, letterSpacing: -6, textShadow: `0 0 60px ${c.lo}aa, 0 6px 0 ${c.lo}55` })}>{`#${d.rank}`}</div>
        <div style={flex({ fontSize: 32, color: SURFACE.mute })}>{`of ${d.totalText} traders`}</div>
      </div>
      <div style={flex({ alignItems: "center", gap: 24 })}>
        <Badge color={ACCENT.a} big>{pct.toUpperCase()}</Badge>
      </div>
      <div style={flex({ marginTop: 6, marginBottom: 22 })}><Meter pct={100 - d.topPct} color={c.hi} width={pw - 112} big /></div>
    </div>
  ) : (
    <div style={flex({ alignItems: "center", gap: 36, width: "100%" })}>
      <div style={flex({ flexDirection: "column", alignItems: "center", gap: 14, width: 250 })}>
        <Portrait d={d} size={188} ring={9} />
        <div style={flex({ fontSize: 30, fontWeight: 600, color: SURFACE.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 250 })}>{d.name}</div>
        <div style={flex({ fontSize: 19, color: SURFACE.mute })}>{where}</div>
      </div>
      <div style={flex({ flexDirection: "column", gap: 14, flex: 1 })}>
        <div style={flex({ alignItems: "flex-end", gap: 20 })}>
          <div style={flex({ fontSize: 150, fontWeight: 600, lineHeight: 1, color: c.hi, letterSpacing: -5, textShadow: `0 0 44px ${c.lo}aa, 0 5px 0 ${c.lo}55` })}>{`#${d.rank}`}</div>
          <div style={flex({ flexDirection: "column", gap: 10, paddingBottom: 14 })}>
            <div style={flex({ fontSize: 24, color: SURFACE.mute })}>{`of ${d.totalText} traders`}</div>
            <Badge color={ACCENT.a} big={false}>{pct.toUpperCase()}</Badge>
          </div>
        </div>
        <div style={flex({ flexDirection: "column", gap: 16, width: "100%" })}>
          <Meter pct={100 - d.topPct} color={c.hi} width={pw - 36 - 250 - 36 - 36} big={false} />
          {stats}
        </div>
      </div>
    </div>
  );

  return (
    <div style={flex({ width, height, padding: frame, borderRadius: story ? 64 : 40, background: `linear-gradient(135deg, ${c.hi}, ${c.lo} 55%, ${c.hi})`, fontFamily: "Inter" })}>
      <div style={flex({ position: "relative", flexDirection: "column", justifyContent: "space-between", width: pw, height: ph, padding: story ? 56 : 36, borderRadius: story ? 48 : 30, overflow: "hidden", background: `linear-gradient(160deg, ${SURFACE.top}, ${SURFACE.bottom})`, border: "2px solid rgba(255,255,255,0.22)" })}>
        <div style={{ position: "absolute", top: 0, left: 0, width: pw, height: ph, background: `radial-gradient(ellipse 70% 42% at 50% ${story ? "34%" : "30%"}, ${c.lo}40, rgba(0,0,0,0))` }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: pw, height: ph, background: `radial-gradient(ellipse 60% 30% at 50% 100%, ${ACCENT.a}26, rgba(0,0,0,0))` }} />
        <Grid w={pw} h={ph} />
        <Stars w={pw} h={ph} color={c.hi} />
        {sheen}
        <div style={{ position: "absolute", top: story ? 22 : 14, left: story ? 22 : 14, width: pw - (story ? 44 : 28), height: ph - (story ? 44 : 28), borderRadius: story ? 34 : 20, border: `1.5px solid ${c.hi}40` }} />
        <Corners w={pw} h={ph} inset={story ? 22 : 14} len={story ? 30 : 24} color={c.hi} />
        {header}
        {body}
        {story && stats}
        <div style={flex({ flexDirection: "column", gap: story ? 20 : 12, width: "100%" })}>
          <Sparkline values={d.trend} w={story ? pw - 112 : pw - 72} h={story ? 120 : 64} color={c.hi} />
          {footer}
        </div>
      </div>
    </div>
  );
}
