/* ──────────────────────────────────────────────────────────────────────────
 * lib/api.ts — the ONLY place the FOGM landing page gets its data from.
 *
 * Swap to a real backend by editing API_BASE + USE_MOCK (and the endpoint
 * paths in the functions below if they differ). No component changes needed.
 * ────────────────────────────────────────────────────────────────────────── */

/* ── 1.1 Config ─────────────────────────────────────────────────────────── */
export const API_BASE = ""; // later: "https://api.example.com"
export const USE_MOCK = true; // when false, functions fetch(`${API_BASE}/...`)
export const MOCK_LATENCY_MS = 600; // simulated network delay
export const MOCK_FAIL_RATE = 0; // 0 to 1, to test the error state (0 in final)

/* ── 1.2 Types ──────────────────────────────────────────────────────────── */
export type ContestStatus =
  | "upcoming"
  | "registration_open"
  | "active"
  | "ended"
  | "winners_declared";
export type Period = "today" | "week" | "overall";
export type Segment =
  | "Equity Intraday"
  | "Futures & Options"
  | "Commodity"
  | "Currency";
export type PrizeTierId = "grand" | "podium" | "laptop";

export interface Competition {
  id: string;
  slug: string;
  title: string; // "₹1 Cr Pride Pool"
  subtitle: string; // one-line pitch
  status: ContestStatus;
  currency: { code: string; locale: string }; // INR / en-IN
  registrationClosesAt: string;
  startsAt: string;
  endsAt: string;
  winnersDeclaredAt: string | null; // ISO
  metricLabel: string; // "Brokerage Saved"
  metricHelp: string; // plain-language definition shown in a tooltip/info row
  partners: { name: string; role: string }[]; // text only, no logos
  updatedAt: string; // ISO, "Last updated" stamp
}

export interface PoolStats {
  poolSize: number;
  used: number;
  remaining: number;
  usedPct: number; // remaining = poolSize - used (must be consistent)
  tradersEnrolled: number;
  tradersBenefited: number;
  totalTrades: number;
  totalTurnover: number; // sum of traded value
  avgSavedPerBeneficiary: number;
  largestSingleSaving: number;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank: number | null;
  movement: number; // +ve = moved up
  maskedName: string;
  countryCode: string;
  city: string;
  brokerageSaved: number; // THE ranking metric
  brokeragePaid: number; // what they paid in total
  tradesCount: number;
  turnover: number;
  topSegment: Segment;
  lastActiveAt: string;
  trend: number[]; // 14 points, cumulative saved, for sparkline
  prizeTierId: PrizeTierId | null;
  inWinningZone: boolean; // rank <= 20
  isYou?: boolean;
}

export interface LeaderboardPage {
  period: Period;
  total: number;
  page: number;
  pageSize: number;
  entries: LeaderboardEntry[];
  cutoffRank: number;
  cutoffSaved: number;
  updatedAt: string;
  /** Optional: the signed-in user's row (independent of the current page / search). */
  you?: LeaderboardEntry | null;
}

export interface PrizeTier {
  id: PrizeTierId;
  label: string;
  ranksFrom: number;
  ranksTo: number;
  reward: string;
  perks: string[];
  winnersCount: number;
}
export interface WinnersPayload {
  isFinal: boolean;
  heading: string;
  declaredAt: string | null;
  winners: {
    rank: number;
    maskedName: string;
    countryCode: string;
    brokerageSaved: number;
    prize: string;
  }[];
  champion: LeaderboardEntry | null;
}
export interface ActivityItem {
  id: string;
  maskedName: string;
  amount: number;
  segment: Segment;
  at: string;
  kind: "saving" | "rank_up" | "joined";
}
export interface PoolHistoryPoint {
  date: string;
  used: number;
}
export interface SegmentBreakdown {
  segment: Segment;
  saved: number;
  sharePct: number;
}
export interface PastEdition {
  id: string;
  title: string;
  period: string;
  poolSize: number;
  tradersEnrolled: number;
  podium: { rank: 1 | 2 | 3; maskedName: string; brokerageSaved: number }[];
}
export interface ContentPayload {
  steps: { title: string; body: string }[];
  rules: string[];
  faqs: { q: string; a: string }[];
  disclosure: string;
}

/* ── Formatting helpers ─────────────────────────────────────────────────── */
interface MoneyOpts {
  code?: string;
  locale?: string;
}
const DEFAULT_CODE = "INR";
const DEFAULT_LOCALE = "en-IN";

export function formatINR(n: number, opts?: MoneyOpts): string {
  return new Intl.NumberFormat(opts?.locale ?? DEFAULT_LOCALE, {
    style: "currency",
    currency: opts?.code ?? DEFAULT_CODE,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
}

/** "₹1 Cr", "₹29.9 L", "₹12,450". Cr/L are the Indian numbering units. */
export function formatCompactINR(n: number, opts?: MoneyOpts): string {
  const locale = opts?.locale ?? DEFAULT_LOCALE;
  const code = opts?.code ?? DEFAULT_CODE;
  const symbol =
    new Intl.NumberFormat(locale, { style: "currency", currency: code })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? "";
  const trim = (v: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}${symbol}${trim(abs / 1e7)} Cr`;
  if (abs >= 1e5) return `${sign}${symbol}${trim(abs / 1e5)} L`;
  return formatINR(n, opts);
}

/** First 2 chars, stars, last 2 chars. "SURESHKUMAR" → "SU*******AR". */
export function maskName(s: string): string {
  const t = s.trim().toUpperCase();
  if (t.length <= 4) return t.slice(0, 1) + "*".repeat(Math.max(t.length - 1, 0));
  return t.slice(0, 2) + "*".repeat(t.length - 4) + t.slice(-2);
}

export function timeAgo(iso: string, nowMs: number = Date.now()): string {
  const diff = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 1000));
  if (diff < 45) return "just now";
  const m = Math.round(diff / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(diff / 3600);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(diff / 86400);
  return `${d} d ago`;
}

/* ── Mock helpers (seeded → deterministic, hydration-safe) ──────────────── */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fixed "now" the mock timestamps are anchored to; re-based to the real clock at call time. */
const MOCK_NOW_MS = Date.parse("2026-10-24T14:00:00.000Z");
const isoAt = (offsetSec: number) =>
  new Date(MOCK_NOW_MS - offsetSec * 1000).toISOString();

const SEGMENTS: Segment[] = [
  "Equity Intraday",
  "Futures & Options",
  "Commodity",
  "Currency",
];

const FIRST = [
  "SHARAD", "BHAVESH", "SURESH", "RAHUL", "PRIYA", "ANKIT", "KARAN", "NEHA", "VIKAS",
  "MANOJ", "DEEPAK", "POOJA", "ROHIT", "SANJAY", "ARJUN", "KIRAN", "NITIN", "ASHOK",
  "MEERA", "TARUN", "HARSH", "JAYESH", "LAKSHMI", "OMKAR", "YASHWANT",
];
const LAST = [
  "KUMAR", "SHARMA", "PATEL", "VERMA", "GUPTA", "REDDY", "NAIR", "SINGH", "IYER",
  "JOSHI", "MEHTA", "DESAI",
];
const CITIES: [string, string][] = [
  ["Mumbai", "IN"], ["Delhi", "IN"], ["Bengaluru", "IN"], ["Hyderabad", "IN"],
  ["Chennai", "IN"], ["Pune", "IN"], ["Kolkata", "IN"], ["Ahmedabad", "IN"],
  ["Jaipur", "IN"], ["Surat", "IN"], ["Lucknow", "IN"], ["Indore", "IN"],
  ["Kochi", "IN"], ["Chandigarh", "IN"], ["Nagpur", "IN"], ["Dubai", "AE"],
  ["Singapore", "SG"],
];

interface Identity {
  maskedName: string;
  city: string;
  countryCode: string;
  segment: Segment;
}
const IDENTITIES: Identity[] = (() => {
  const rnd = mulberry32(7);
  return Array.from({ length: 50 }, (_, i) => {
    const raw = FIRST[i % FIRST.length] + LAST[(i * 5 + Math.floor(i / 25)) % LAST.length];
    // mostly India, a handful abroad
    const abroad = i === 11 || i === 29 || i === 41;
    const pick = abroad
      ? CITIES[15 + (i % 2)]
      : CITIES[Math.floor(rnd() * 15)];
    return {
      maskedName: maskName(raw),
      city: pick[0],
      countryCode: pick[1],
      segment: SEGMENTS[Math.floor(rnd() * 4)],
    };
  });
})();
const YOU_INDEX = 26; // overall rank #27 is "you" in the mock

/** Values descending from `top` to `bottom` over `n` entries, rounded to `step`. */
function curve(n: number, top: number, bottom: number, step: number, seed: number): number[] {
  const rnd = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const base = top * Math.pow(bottom / top, i / (n - 1));
    const jitter = 1 + (rnd() - 0.5) * 0.03;
    let v = Math.round((base * jitter) / step) * step;
    if (i > 0) v = Math.min(v, out[i - 1] - step);
    out.push(v);
  }
  return out;
}

const OVERALL_VALUES: number[] = (() => {
  const anchors = [14760, 13000, 9080, 8380, 7700, 7300, 6440, 5040];
  const rest = curve(42, 4800, 1800, 10, 31);
  rest[rest.length - 1] = 1800;
  return [...anchors, ...rest];
})();

function buildBoard(period: Period): LeaderboardEntry[] {
  const seed = period === "overall" ? 101 : period === "week" ? 202 : 303;
  const rnd = mulberry32(seed);
  // ordering: overall = identity order; others = identity order + noise
  const order = IDENTITIES.map((_, i) => i);
  if (period !== "overall") {
    const spread = period === "week" ? 14 : 26;
    const key = order.map((i) => i + (rnd() - 0.5) * spread * 2);
    order.sort((a, b) => key[a] - key[b]);
  }
  const values =
    period === "overall"
      ? OVERALL_VALUES
      : period === "week"
        ? curve(50, 1850, 240, 5, 41)
        : curve(50, 420, 40, 5, 51);
  const scale = period === "overall" ? 1 : period === "week" ? 0.14 : 0.03;

  return order.map((idIdx, k) => {
    const id = IDENTITIES[idIdx];
    const rank = k + 1;
    const saved = values[k];
    const paid = Math.round(saved * (1.15 + rnd() * 0.9));
    const trades = Math.max(3, Math.round((saved / (7 + rnd() * 5)) * (period === "overall" ? 1 : 1)));
    const turnover = Math.round(trades * (9000 + rnd() * 7000) * (scale > 0 ? 1 : 1));
    // movement
    const isNew = rnd() < 0.1;
    const delta = Math.round((rnd() - 0.5) * 8); // -4..+4
    const prev = isNew ? null : Math.max(1, rank + delta);
    const movement = prev === null ? 0 : prev - rank;
    // trend — cumulative, monotone, ends exactly at `saved`
    const trend: number[] = [];
    const p = 0.85 + rnd() * 0.7;
    for (let t = 0; t < 14; t++) {
      const f = Math.pow((t + 1) / 14, p) * (0.96 + rnd() * 0.08);
      let v = Math.round(saved * Math.min(f, 1));
      if (t > 0) v = Math.max(v, trend[t - 1]);
      trend.push(v);
    }
    trend[13] = saved;
    const tier: PrizeTierId | null = rank === 1 ? "grand" : rank <= 3 ? "podium" : rank <= 20 ? "laptop" : null;
    return {
      rank,
      previousRank: prev,
      movement,
      maskedName: id.maskedName,
      countryCode: id.countryCode,
      city: id.city,
      brokerageSaved: saved,
      brokeragePaid: paid,
      tradesCount: trades,
      turnover,
      topSegment: id.segment,
      lastActiveAt: isoAt(Math.round(rnd() * 6 * 3600)),
      trend,
      prizeTierId: tier,
      inWinningZone: rank <= 20,
      ...(idIdx === YOU_INDEX ? { isYou: true } : {}),
    };
  });
}

const USED = 298913;
const POOL_SIZE = 10000000;
const BENEFITED = 411;

const HISTORY: PoolHistoryPoint[] = (() => {
  const rnd = mulberry32(88);
  const pts: PoolHistoryPoint[] = [];
  let prev = 0;
  for (let i = 0; i < 14; i++) {
    const t = (i + 1) / 14;
    let v = Math.round(USED * Math.pow(t, 1.35) * (0.985 + rnd() * 0.03));
    v = Math.max(v, prev + 1);
    prev = v;
    const d = new Date(Date.UTC(2026, 9, 24 - (13 - i)));
    pts.push({ date: d.toISOString().slice(0, 10), used: v });
  }
  pts[13].used = USED;
  return pts;
})();

const SEGMENT_SHARES: [Segment, number][] = [
  ["Equity Intraday", 38],
  ["Futures & Options", 41],
  ["Commodity", 14],
  ["Currency", 7],
];

/* ── 1.3 MOCK_DB ────────────────────────────────────────────────────────── */
export const MOCK_DB = {
  competition: {
    id: "cmp_pride_pool_2026",
    slug: "pride-pool",
    title: "₹1 Cr Pride Pool",
    subtitle:
      "Trade as you normally do. We refund your brokerage from a ₹1 Cr pool, and the traders who save the most win laptops and VIP access.",
    status: "active",
    currency: { code: "INR", locale: "en-IN" },
    registrationClosesAt: "2026-12-15T18:29:59.000Z",
    startsAt: "2026-10-01T03:30:00.000Z",
    endsAt: "2026-12-31T18:29:59.000Z",
    winnersDeclaredAt: null,
    metricLabel: "Brokerage Saved",
    metricHelp:
      "The brokerage refunded to you from the pool on your trades. Higher saved = higher rank.",
    partners: [
      { name: "Lemonn", role: "Trading platform" },
      { name: "Booming Bulls Academy", role: "Education partner" },
    ],
    updatedAt: isoAt(40),
  } as Competition,

  pool: {
    poolSize: POOL_SIZE,
    used: USED,
    remaining: POOL_SIZE - USED,
    usedPct: 2.98,
    tradersEnrolled: 4103,
    tradersBenefited: BENEFITED,
    totalTrades: 38240,
    totalTurnover: 421500000,
    avgSavedPerBeneficiary: Math.round(USED / BENEFITED),
    largestSingleSaving: 1850,
  } as PoolStats,

  leaderboard: {
    overall: buildBoard("overall"),
    week: buildBoard("week"),
    today: buildBoard("today"),
  } as Record<Period, LeaderboardEntry[]>,

  // NOTE: reward values below are PLACEHOLDERS — replace with the final prize copy.
  prizeTiers: [
    {
      id: "grand",
      label: "Grand prize",
      ranksFrom: 1,
      ranksTo: 1,
      reward: "Premium laptop + VIP Access",
      perks: ["Premium laptop", "VIP access to partner events", "Featured on the winners wall"],
      winnersCount: 1,
    },
    {
      id: "podium",
      label: "Podium",
      ranksFrom: 2,
      ranksTo: 3,
      reward: "Premium laptop + VIP Access",
      perks: ["Premium laptop", "VIP access to partner events"],
      winnersCount: 2,
    },
    {
      id: "laptop",
      label: "Laptop",
      ranksFrom: 4,
      ranksTo: 20,
      reward: "Laptop",
      perks: ["A brand-new laptop", "Certificate of achievement"],
      winnersCount: 17,
    },
  ] as PrizeTier[],

  pastEditions: [
    {
      id: "ed_launch_2026",
      title: "₹50 L Launch Pool",
      period: "Apr – Jun 2026",
      poolSize: 5000000,
      tradersEnrolled: 2284,
      podium: [
        { rank: 1, maskedName: "RA******TA", brokerageSaved: 11840 },
        { rank: 2, maskedName: "MA*****ER", brokerageSaved: 10215 },
        { rank: 3, maskedName: "PR*******AL", brokerageSaved: 8760 },
      ],
    },
    {
      id: "ed_monsoon_2026",
      title: "₹75 L Monsoon Pool",
      period: "Jul – Sep 2026",
      poolSize: 7500000,
      tradersEnrolled: 3310,
      podium: [
        { rank: 1, maskedName: "VI*****AR", brokerageSaved: 15320 },
        { rank: 2, maskedName: "AN*******HI", brokerageSaved: 12970 },
        { rank: 3, maskedName: "SA****NG", brokerageSaved: 10480 },
      ],
    },
  ] as PastEdition[],

  activity: [
    { id: "a1", maskedName: "SU***AR", amount: 420, segment: "Futures & Options", at: isoAt(120), kind: "saving" },
    { id: "a2", maskedName: "NE****AL", amount: 0, segment: "Equity Intraday", at: isoAt(240), kind: "joined" },
    { id: "a3", maskedName: "BH*****KI", amount: 310, segment: "Commodity", at: isoAt(420), kind: "saving" },
    { id: "a4", maskedName: "RO****MA", amount: 0, segment: "Equity Intraday", at: isoAt(600), kind: "rank_up" },
    { id: "a5", maskedName: "KA***AH", amount: 185, segment: "Currency", at: isoAt(900), kind: "saving" },
    { id: "a6", maskedName: "DE*****AK", amount: 0, segment: "Futures & Options", at: isoAt(1260), kind: "joined" },
    { id: "a7", maskedName: "SH*****AR", amount: 640, segment: "Futures & Options", at: isoAt(1680), kind: "saving" },
    { id: "a8", maskedName: "PO****TA", amount: 0, segment: "Commodity", at: isoAt(2100), kind: "rank_up" },
    { id: "a9", maskedName: "AR***AN", amount: 275, segment: "Equity Intraday", at: isoAt(2700), kind: "saving" },
    { id: "a10", maskedName: "MA*****ER", amount: 0, segment: "Currency", at: isoAt(3300), kind: "joined" },
    { id: "a11", maskedName: "TA***ER", amount: 520, segment: "Futures & Options", at: isoAt(4200), kind: "saving" },
    { id: "a12", maskedName: "HA***EL", amount: 0, segment: "Equity Intraday", at: isoAt(5400), kind: "rank_up" },
  ] as ActivityItem[],

  poolHistory: HISTORY,

  segmentBreakdown: (() => {
    let allocated = 0;
    return SEGMENT_SHARES.map(([segment, sharePct], i) => {
      const saved =
        i === SEGMENT_SHARES.length - 1 ? USED - allocated : Math.round((USED * sharePct) / 100);
      allocated += saved;
      return { segment, saved, sharePct };
    });
  })() as SegmentBreakdown[],

  content: {
    steps: [
      {
        title: "Sign up",
        body: "Open a trading account on our partner platform in minutes, or just log in. Existing customers are already enrolled, so there is nothing extra to fill in.",
      },
      {
        title: "Trade as usual",
        body: "Trade in any eligible segment exactly the way you always do. Every rupee of brokerage you pay is tracked and refunded from the pool until it runs out.",
      },
      {
        title: "Climb the board",
        body: "The more brokerage you save, the higher you rank. The top 20 at the end of the contest win a laptop, and the top 3 get VIP access as well.",
      },
    ],
    rules: [
      "Open to resident individuals aged 18+ with an active, KYC-complete account on the partner trading platform.",
      "You need at least 10 executed trades during the contest period to appear on the ranked board.",
      "Eligible segments: Equity Intraday, Futures & Options, Commodity and Currency.",
      "Brokerage refunds are capped at ₹25,000 per trader for the whole contest.",
      "Fair-use applies. Wash, circular and self-matched trades are excluded, and abusive accounts are disqualified.",
      "Ties are broken by the earlier timestamp at which the tied amount was reached.",
      "Winners are verified for eligibility and fair-use before they are declared.",
      "If the pool is exhausted the contest ends early: refunds stop and the standings are frozen.",
    ],
    faqs: [
      {
        q: "What is “Brokerage Saved”?",
        a: "It is the brokerage refunded to you from the pool on your trades. It is the single number we rank on: the higher your brokerage saved, the higher your rank.",
      },
      {
        q: "When are winners declared?",
        a: "After the contest ends and every top-20 account has been verified. Until then, the board shows provisional current leaders, not winners.",
      },
      {
        q: "How are ties broken?",
        a: "If two traders have saved the same amount, the one who reached that amount first (earlier timestamp) ranks higher.",
      },
      {
        q: "Does a trading loss affect my rank?",
        a: "No. Rank depends only on the brokerage refunded to you, not on your profit or loss. Trading still carries risk, so trade responsibly.",
      },
      {
        q: "When do I get the prize?",
        a: "Prizes are dispatched after winners are declared and verified. We will contact winners on their registered email and phone.",
      },
      {
        q: "I am an existing customer. Do I need to register?",
        a: "No. Existing customers on the partner platform are enrolled automatically and start saving from their next eligible trade.",
      },
    ],
    disclosure:
      "Trading in securities involves risk of loss. Past performance is not indicative of future results. Brokerage reimbursement is a promotional benefit funded from the contest pool and is subject to the contest terms, eligibility and fair-use checks. Nothing on this page is investment advice. Participant names are masked to protect privacy.",
  } as ContentPayload,
};

/* ── HTTP + mock plumbing ───────────────────────────────────────────────── */
async function http<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function mock<T>(produce: () => T): Promise<T> {
  await new Promise<void>((r) => setTimeout(r, MOCK_LATENCY_MS));
  if (MOCK_FAIL_RATE > 0 && Math.random() < MOCK_FAIL_RATE) {
    throw new Error("Simulated network failure");
  }
  return structuredClone(produce());
}

/** Re-anchor mock timestamps to the real clock at call time (client-only, never during render). */
const shiftISO = (iso: string, shiftMs: number) => new Date(new Date(iso).getTime() + shiftMs).toISOString();
const nowShift = () => Date.now() - MOCK_NOW_MS;

/* ── 1.4 API functions ──────────────────────────────────────────────────── */
export function getCompetition(): Promise<Competition> {
  if (USE_MOCK)
    return mock(() => ({
      ...MOCK_DB.competition,
      updatedAt: shiftISO(MOCK_DB.competition.updatedAt, nowShift()),
    }));
  return http<Competition>("/competition");
}

export function getPoolStats(): Promise<PoolStats> {
  if (USE_MOCK) return mock(() => MOCK_DB.pool);
  return http<PoolStats>("/pool");
}

export function getLeaderboard(p: {
  period: Period;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<LeaderboardPage> {
  if (USE_MOCK)
    return mock(() => {
      const shift = nowShift();
      const page = Math.max(1, p.page ?? 1);
      const pageSize = Math.max(1, p.pageSize ?? 20);
      const all = MOCK_DB.leaderboard[p.period];
      const q = (p.search ?? "").trim().toLowerCase();
      const filtered = q ? all.filter((e) => e.maskedName.toLowerCase().includes(q)) : all;
      const rebase = (e: LeaderboardEntry): LeaderboardEntry => ({
        ...e,
        lastActiveAt: shiftISO(e.lastActiveAt, shift),
      });
      const you = all.find((e) => e.isYou);
      return {
        period: p.period,
        total: filtered.length,
        page,
        pageSize,
        entries: filtered.slice((page - 1) * pageSize, page * pageSize).map(rebase),
        cutoffRank: 20,
        cutoffSaved: all[19].brokerageSaved,
        updatedAt: new Date(Date.now() - 40_000).toISOString(),
        you: you ? rebase(you) : null,
      };
    });
  const qs = new URLSearchParams({ period: p.period });
  if (p.page) qs.set("page", String(p.page));
  if (p.pageSize) qs.set("pageSize", String(p.pageSize));
  if (p.search) qs.set("search", p.search);
  return http<LeaderboardPage>(`/leaderboard?${qs.toString()}`);
}

export function getWinners(): Promise<WinnersPayload> {
  if (USE_MOCK)
    return mock(() => {
      const c = MOCK_DB.competition;
      const isFinal = c.status === "winners_declared";
      const top = MOCK_DB.leaderboard.overall.slice(0, 20);
      const prizeOf = (rank: number) =>
        MOCK_DB.prizeTiers.find((t) => rank >= t.ranksFrom && rank <= t.ranksTo)?.reward ?? "";
      return {
        isFinal,
        heading: isFinal ? "Winners" : "Current leaders (provisional)",
        declaredAt: isFinal ? c.winnersDeclaredAt : null,
        winners: top.map((e) => ({
          rank: e.rank,
          maskedName: e.maskedName,
          countryCode: e.countryCode,
          brokerageSaved: e.brokerageSaved,
          prize: prizeOf(e.rank),
        })),
        champion: top[0] ?? null,
      };
    });
  return http<WinnersPayload>("/winners");
}

export function getPrizeTiers(): Promise<PrizeTier[]> {
  if (USE_MOCK) return mock(() => MOCK_DB.prizeTiers);
  return http<PrizeTier[]>("/prizes");
}

export function getActivity(): Promise<ActivityItem[]> {
  if (USE_MOCK)
    return mock(() => {
      const shift = nowShift();
      return MOCK_DB.activity.map((a) => ({ ...a, at: shiftISO(a.at, shift) }));
    });
  return http<ActivityItem[]>("/activity");
}

export function getPoolHistory(): Promise<PoolHistoryPoint[]> {
  if (USE_MOCK) return mock(() => MOCK_DB.poolHistory);
  return http<PoolHistoryPoint[]>("/pool/history");
}

export function getSegmentBreakdown(): Promise<SegmentBreakdown[]> {
  if (USE_MOCK) return mock(() => MOCK_DB.segmentBreakdown);
  return http<SegmentBreakdown[]>("/segments");
}

export function getPastEditions(): Promise<PastEdition[]> {
  if (USE_MOCK) return mock(() => MOCK_DB.pastEditions);
  return http<PastEdition[]>("/past-editions");
}

export function getContent(): Promise<ContentPayload> {
  if (USE_MOCK) return mock(() => MOCK_DB.content);
  return http<ContentPayload>("/content");
}

/* ── Dev-only data consistency checks ───────────────────────────────────── */
if (process.env.NODE_ENV !== "production") {
  const { pool, leaderboard } = MOCK_DB;
  console.assert(pool.remaining === pool.poolSize - pool.used, "[api] remaining must equal poolSize - used");
  console.assert(
    pool.avgSavedPerBeneficiary === Math.round(pool.used / pool.tradersBenefited),
    "[api] avgSavedPerBeneficiary mismatch",
  );
  (Object.keys(leaderboard) as Period[]).forEach((period) => {
    const rows = leaderboard[period];
    rows.forEach((e, i) => {
      console.assert(e.rank === i + 1, `[api] ${period}: ranks must be sequential (#${i + 1})`);
      console.assert(
        i === 0 || rows[i - 1].brokerageSaved > e.brokerageSaved,
        `[api] ${period}: leaderboard must be strictly descending at #${e.rank}`,
      );
      console.assert(e.inWinningZone === e.rank <= 20, `[api] ${period}: winning zone flag wrong at #${e.rank}`);
      console.assert(e.trend.length === 14, `[api] ${period}: trend must have 14 points (#${e.rank})`);
      console.assert(
        e.trend[e.trend.length - 1] === e.brokerageSaved,
        `[api] ${period}: trend last value must equal brokerageSaved (#${e.rank})`,
      );
      console.assert(e.brokeragePaid > e.brokerageSaved, `[api] ${period}: brokeragePaid must exceed saved (#${e.rank})`);
    });
    console.assert(
      rows.reduce((s, e) => s + e.brokerageSaved, 0) < pool.used,
      `[api] ${period}: listed total must be less than pool.used`,
    );
  });
  console.assert(
    new Set(leaderboard.overall.map((e) => e.maskedName)).size === leaderboard.overall.length,
    "[api] masked names must be unique",
  );
  console.assert(
    MOCK_DB.segmentBreakdown.reduce((s, x) => s + x.sharePct, 0) === 100,
    "[api] segment shares must sum to 100",
  );
  console.assert(
    MOCK_DB.poolHistory[MOCK_DB.poolHistory.length - 1].used === pool.used,
    "[api] last poolHistory point must equal pool.used",
  );
}
