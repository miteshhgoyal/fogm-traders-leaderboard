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
    <div style={flex({ width: size, height: size, borderRadius: size, padding: ring, background: `linear-gradient(135deg, ${c.hi}, ${c.lo})`, boxShadow: `0 0 ${size / 3}px ${c.lo}66` })}>
      <div style={flex({ width: inner, height: inner, borderRadius: inner, overflow: "hidden", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${ACCENT.a}, ${ACCENT.b})`, border: `${Math.max(4, ring / 2)}px solid ${SURFACE.bottom}` })}>
        {d.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/og renders <img> with a data URI
          <img src={d.avatar} width={inner} height={inner} alt="" style={{ width: inner, height: inner, objectFit: "cover" }} />
        ) : (
          <div style={flex({ fontSize: inner * 0.38, fontWeight: 600, color: ACCENT.ink })}>{d.initials}</div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, big }: { label: string; value: string; big: boolean }) {
  return (
    <div style={flex({ flex: 1, flexDirection: "column", minWidth: 0, gap: big ? 10 : 6, padding: big ? 28 : 16, borderRadius: big ? 28 : 18, border: `2px solid ${SURFACE.line}`, background: "rgba(255,255,255,0.04)" })}>
      <div style={flex({ fontSize: big ? 20 : 14, letterSpacing: big ? 3 : 2, color: SURFACE.faint, fontWeight: 600 })}>{label.toUpperCase()}</div>
      <div style={flex({ fontSize: big ? 30 : 26, fontWeight: 600, color: SURFACE.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{value}</div>
    </div>
  );
}

function Badge({ children, color, big }: { children: string; color: string; big: boolean }) {
  return (
    <div style={flex({ alignItems: "center", height: big ? 52 : 36, padding: big ? "0 28px" : "0 18px", borderRadius: 999, border: `2px solid ${color}`, color, fontSize: big ? 24 : 17, fontWeight: 600, letterSpacing: 1 })}>{children}</div>
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
    <div style={{ position: "absolute", top: 0, left: 0, width: pw, height: ph, background: "linear-gradient(115deg, rgba(255,255,255,0) 18%, rgba(255,255,255,0.09) 36%, rgba(124,92,255,0.14) 50%, rgba(70,220,200,0.09) 64%, rgba(255,255,255,0) 82%)" }} />
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
      <Badge color={c.hi} big={story}>{c.label.toUpperCase()}</Badge>
      <div style={flex({ fontSize: story ? 26 : 19, color: SURFACE.mute })}>{d.siteHost}</div>
    </div>
  );

  const stats = (
    <div style={flex({ gap: story ? 20 : 12, width: "100%" })}>
      <StatBox label="Net profit" value={d.savedText} big={story} />
      <StatBox label="Trades" value={d.tradesText} big={story} />
      <StatBox label="Instrument" value={d.topSegment} big={story} />
    </div>
  );

  const body = story ? (
    <div style={flex({ flexDirection: "column", alignItems: "center", width: "100%", gap: 26 })}>
      <Portrait d={d} size={264} ring={12} />
      <div style={flex({ flexDirection: "column", alignItems: "center", gap: 10, maxWidth: pw - 112 })}>
        <div style={flex({ fontSize: 58, fontWeight: 600, color: SURFACE.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: pw - 112 })}>{d.name}</div>
        <div style={flex({ fontSize: 28, color: SURFACE.mute })}>{where}</div>
      </div>
      <div style={flex({ flexDirection: "column", alignItems: "center", gap: 6 })}>
        <div style={flex({ fontSize: 190, fontWeight: 600, lineHeight: 1, color: c.hi, letterSpacing: -6 })}>{`#${d.rank}`}</div>
        <div style={flex({ fontSize: 32, color: SURFACE.mute })}>{`of ${d.totalText} traders`}</div>
      </div>
      <Badge color={ACCENT.a} big>{pct.toUpperCase()}</Badge>
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
          <div style={flex({ fontSize: 150, fontWeight: 600, lineHeight: 1, color: c.hi, letterSpacing: -5 })}>{`#${d.rank}`}</div>
          <div style={flex({ flexDirection: "column", gap: 10, paddingBottom: 14 })}>
            <div style={flex({ fontSize: 24, color: SURFACE.mute })}>{`of ${d.totalText} traders`}</div>
            <Badge color={ACCENT.a} big={false}>{pct.toUpperCase()}</Badge>
          </div>
        </div>
        {stats}
      </div>
    </div>
  );

  return (
    <div style={flex({ width, height, padding: frame, borderRadius: story ? 64 : 40, background: `linear-gradient(135deg, ${c.hi}, ${c.lo} 55%, ${c.hi})`, fontFamily: "Inter" })}>
      <div style={flex({ position: "relative", flexDirection: "column", justifyContent: "space-between", width: pw, height: ph, padding: story ? 56 : 36, borderRadius: story ? 48 : 30, overflow: "hidden", background: `linear-gradient(160deg, ${SURFACE.top}, ${SURFACE.bottom})`, border: "2px solid rgba(255,255,255,0.22)" })}>
        <Grid w={pw} h={ph} />
        {sheen}
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
