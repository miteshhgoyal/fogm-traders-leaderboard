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
export type InstrumentClass =
  | "Majors"
  | "Minors"
  | "Exotics"
  | "Metals"
  | "Indices"
  | "Crypto";
export type PrizeTierId = "grand" | "podium" | "laptop";

export interface Competition {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  status: ContestStatus;
  currency: { code: string; locale: string };
  registrationClosesAt: string;
  startsAt: string;
  endsAt: string;
  winnersDeclaredAt: string | null;
  metricLabel: string;
  metricHelp: string;
  partners: { name: string; role: string }[];
  updatedAt: string;
}

export interface ContestStats {
  prizeFund: number;
  tradersEnrolled: number;
  activeTraders: number;
  totalTrades: number;
  totalVolumeLots: number;
  avgReturnPct: number;
  bestTradeProfit: number;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank: number | null;
  movement: number;
  userId: string;
  /** Public display name. "Anonymous trader" when the user has not consented. */
  name: string;
  /** Public photo URL, or null (initials fallback). Always null when not consented. */
  avatarUrl: string | null;
  countryCode: string;
  city: string;
  netProfit: number; // THE ranking metric
  returnPct: number;
  winRatePct: number;
  maxDrawdownPct: number;
  tradesCount: number;
  volumeLots: number;
  topInstrument: string;
  lastActiveAt: string;
  trend: number[]; // 14 points, cumulative profit, for sparkline
  prizeTierId: PrizeTierId | null;
  inWinningZone: boolean;
  isYou?: boolean;
}

export interface LeaderboardPage {
  period: Period;
  total: number;
  page: number;
  pageSize: number;
  entries: LeaderboardEntry[];
  cutoffRank: number;
  cutoffValue: number;
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
    userId: string;
    name: string;
    avatarUrl: string | null;
    countryCode: string;
    netProfit: number;
    prize: string;
  }[];
  champion: LeaderboardEntry | null;
}

export interface ActivityItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  amount: number;
  instrument: string;
  at: string;
  kind: "trade_win" | "rank_up" | "joined";
}

export interface EquityPoint {
  date: string;
  totalProfit: number;
}

export interface InstrumentBreakdown {
  instrumentClass: InstrumentClass;
  volumeLots: number;
  sharePct: number;
}

export interface PastEdition {
  id: string;
  title: string;
  period: string;
  prizeFund: number;
  tradersEnrolled: number;
  podium: { rank: 1 | 2 | 3; name: string; netProfit: number }[];
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
const DEFAULT_CODE = "USD";
const DEFAULT_LOCALE = "en-US";

export function formatMoney(n: number, opts?: MoneyOpts): string {
  return new Intl.NumberFormat(opts?.locale ?? DEFAULT_LOCALE, {
    style: "currency",
    currency: opts?.code ?? DEFAULT_CODE,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
}

/** "$120.5K", "$3.6M", "$178". Intl compact notation (K / M / B). */
export function formatCompactMoney(n: number, opts?: MoneyOpts): string {
  return new Intl.NumberFormat(opts?.locale ?? DEFAULT_LOCALE, {
    style: "currency",
    currency: opts?.code ?? DEFAULT_CODE,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Display name used for anyone who has not opted in to the public leaderboard. */
export const ANON_NAME = "Anonymous trader";

/** Up to two initials. "Anonymous trader" → "AT". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
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

const INSTRUMENTS = [
  "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD",
  "XAUUSD", "US30", "NAS100", "BTCUSD",
];

/** Mock traders (by identity index) who have NOT ticked the public-consent box. */
const NON_CONSENTING = new Set([8, 19, 33]);

const CITIES: [string, string][] = [
  ["New York", "US"], ["London", "GB"], ["Dubai", "AE"], ["Singapore", "SG"],
  ["Lagos", "NG"], ["Mumbai", "IN"], ["São Paulo", "BR"], ["Cape Town", "ZA"],
  ["Berlin", "DE"], ["Manila", "PH"], ["Kuala Lumpur", "MY"], ["Nairobi", "KE"],
  ["Sydney", "AU"], ["Toronto", "CA"], ["Paris", "FR"], ["Tokyo", "JP"],
  ["Istanbul", "TR"], ["Bangkok", "TH"],
];

const FIRST_NAMES = [
  "James", "Maria", "Mohammed", "Priya", "Alex", "Sofia", "David", "Aisha",
  "Carlos", "Emma", "Omar", "Mei", "Ivan", "Fatima", "Jake", "Amara",
  "Daniel", "Yuki", "Patrick", "Zara", "Luca", "Nia", "Stefan", "Aarav",
  "Ryan",
];
const LAST_NAMES = [
  "Thornton", "Silva", "Al-Rashid", "Nair", "Morgan", "Reyes", "Koch", "Bakr",
  "Müller", "Wong", "Patel", "Osei", "Chen", "Hassan", "Williams", "Kimura",
  "Santos", "Ahmed", "Park", "Okafor",
];

interface Identity {
  userId: string;
  name: string;
  avatarUrl: string | null;
  city: string;
  countryCode: string;
  topInstrument: string;
}

const IDENTITIES: Identity[] = (() => {
  const rnd = mulberry32(7);
  const seen = new Set<string>();
  return Array.from({ length: 50 }, (_, i) => {
    let step = 0;
    let full = "";
    do {
      full = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 5 + Math.floor(i / 25) + step) % LAST_NAMES.length]}`;
      step++;
    } while (seen.has(full));
    seen.add(full);
    const pick = CITIES[Math.floor(rnd() * CITIES.length)];
    const instrument = INSTRUMENTS[Math.floor(rnd() * INSTRUMENTS.length)];
    return {
      userId: `u_mock_${i}`,
      name: NON_CONSENTING.has(i) ? ANON_NAME : full,
      avatarUrl: null,
      city: pick[0],
      countryCode: pick[1],
      topInstrument: instrument,
    };
  });
})();

const YOU_INDEX = 26;
const YOU_ID = `u_mock_${YOU_INDEX}`;

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

/** Whole-dollar values must stay strictly descending after rounding. */
function strictDesc(v: number[]): number[] {
  const out: number[] = [];
  v.forEach((x, i) => out.push(i === 0 ? x : Math.max(1, Math.min(x, out[i - 1] - 1))));
  return out;
}

// Top ~$18,400 descending to ~$300, strictly descending, 50 entries
const OVERALL_VALUES: number[] = strictDesc([
  18400, 17200, 15800, 14500, 13200, 12100, 11000, 10100, 9400, 8700,
  8100, 7500, 6950, 6400, 5900, 5400, 4950, 4550, 4200, 3900,
  3650, 3420, 3200, 3000, 2820, 2650, 2500, 2350, 2210, 2080,
  1960, 1840, 1730, 1620, 1520, 1430, 1340, 1260, 1180, 1110,
  1040,  980,  920,  860,  800,  740,  680,  600,  450,  300,
]);

function buildBoard(period: Period): LeaderboardEntry[] {
  const seed = period === "overall" ? 101 : period === "week" ? 202 : 303;
  const rnd = mulberry32(seed);
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
        ? strictDesc(curve(50, 3200, 80, 1, 41))
        : strictDesc(curve(50, 800, 25, 1, 51));

  return order.map((idIdx, k) => {
    const id = IDENTITIES[idIdx];
    const rank = k + 1;
    const netProfit = values[k];
    const trades = Math.max(10, Math.round(20 + rnd() * 580));
    const volumeLots = Math.round(20 + rnd() * 580);
    const returnPct = Math.round((40 + rnd() * 100) * 10) / 10;
    const winRatePct = Math.round((48 + rnd() * 24) * 10) / 10;
    const maxDrawdownPct = Math.round((3 + rnd() * 22) * 10) / 10;

    // movement
    const isNew = rnd() < 0.1;
    const delta = Math.round((rnd() - 0.5) * 8);
    const prev = isNew ? null : Math.max(1, rank + delta);
    const movement = prev === null ? 0 : prev - rank;

    // trend — 14 points cumulative, NOT forced monotone (can dip)
    const trend: number[] = [];
    const rndT = mulberry32(seed + idIdx * 17 + 1);
    let running = 0;
    for (let t = 0; t < 14; t++) {
      const daily = Math.round(
        (netProfit / 14) * (0.5 + rndT() * 1.2) - (rndT() < 0.25 ? rndT() * (netProfit / 20) : 0),
      );
      running += daily;
      trend.push(running);
    }
    // pin last point to netProfit
    trend[13] = netProfit;

    const tier: PrizeTierId | null = rank === 1 ? "grand" : rank <= 3 ? "podium" : rank <= 20 ? "laptop" : null;

    return {
      rank,
      previousRank: prev,
      movement,
      userId: id.userId,
      name: id.name,
      avatarUrl: id.avatarUrl,
      countryCode: id.countryCode,
      city: id.city,
      netProfit,
      returnPct,
      winRatePct,
      maxDrawdownPct,
      tradesCount: trades,
      volumeLots,
      topInstrument: id.topInstrument,
      lastActiveAt: isoAt(Math.round(rnd() * 6 * 3600)),
      trend,
      prizeTierId: tier,
      inWinningZone: rank <= 20,
    };
  });
}

const MOCK_CONTEST_STATS: ContestStats = {
  prizeFund: 50000, // PLACEHOLDER – replace with final prize value
  tradersEnrolled: 4100,
  activeTraders: 2900,
  totalTrades: 62000,
  totalVolumeLots: 118000,
  avgReturnPct: 23.4,
  bestTradeProfit: 4200,
};

const EQUITY_HISTORY: EquityPoint[] = (() => {
  const rnd = mulberry32(88);
  const pts: EquityPoint[] = [];
  let totalProfit = 0;
  for (let i = 0; i < 14; i++) {
    // Not forced monotone - can dip slightly
    const daily = Math.round(6000 + rnd() * 4000 - (rnd() < 0.25 ? rnd() * 1500 : 0));
    totalProfit += daily;
    const d = new Date(Date.UTC(2026, 9, 24 - (13 - i)));
    pts.push({ date: d.toISOString().slice(0, 10), totalProfit });
  }
  return pts;
})();

const INSTRUMENT_SHARES: [InstrumentClass, number][] = [
  ["Majors", 42],
  ["Metals", 21],
  ["Indices", 18],
  ["Minors", 12],
  ["Crypto", 5],
  ["Exotics", 2],
];

/* ── 1.3 MOCK_DB ────────────────────────────────────────────────────────── */
export const MOCK_DB = {
  competition: {
    id: "cmp_fogm_championship_2026",
    slug: "fogm-championship-2026",
    title: "FOGM Trading Championship",
    subtitle:
      "Trade forex, gold and indices on live accounts. The best performers climb the board and win.",
    status: "active",
    currency: { code: "USD", locale: "en-US" },
    registrationClosesAt: "2026-12-15T18:29:59.000Z",
    startsAt: "2026-10-01T03:30:00.000Z",
    endsAt: "2026-12-31T18:29:59.000Z",
    winnersDeclaredAt: null,
    metricLabel: "Net Profit",
    metricHelp:
      "Your realised profit in USD across all closed trades during the contest. Higher profit = higher rank.",
    partners: [
      { name: "Prime Markets Ltd", role: "Trading platform" },
      { name: "TradeEdu Pro", role: "Education partner" },
    ],
    updatedAt: isoAt(40),
  } as Competition,

  contestStats: MOCK_CONTEST_STATS,

  leaderboard: {
    overall: buildBoard("overall"),
    week: buildBoard("week"),
    today: buildBoard("today"),
  } as Record<Period, LeaderboardEntry[]>,

  prizeTiers: [
    {
      id: "grand",
      label: "Grand Prize",
      ranksFrom: 1,
      ranksTo: 1,
      reward: "$15,000 cash",
      perks: ["$15,000 cash prize", "Championship trophy", "Featured on winners wall"],
      winnersCount: 1,
    },
    {
      id: "podium",
      label: "Podium",
      ranksFrom: 2,
      ranksTo: 3,
      reward: "$5,000 cash",
      perks: ["$5,000 cash prize", "Certificate of excellence"],
      winnersCount: 2,
    },
    {
      id: "laptop",
      label: "Top 20",
      ranksFrom: 4,
      ranksTo: 20,
      reward: "$1,000 cash",
      perks: ["$1,000 cash prize", "Digital certificate"],
      winnersCount: 17,
    },
  ] as PrizeTier[],

  pastEditions: [
    {
      id: "ed_q1_2026",
      title: "FOGM Q1 Championship 2026",
      period: "Jan – Mar 2026",
      prizeFund: 30000,
      tradersEnrolled: 2840,
      podium: [
        { rank: 1, name: "James Thornton", netProfit: 16240 },
        { rank: 2, name: "Amara Osei", netProfit: 13870 },
        { rank: 3, name: "Sofia Reyes", netProfit: 11540 },
      ],
    },
    {
      id: "ed_q2_2026",
      title: "FOGM Q2 Championship 2026",
      period: "Apr – Jun 2026",
      prizeFund: 40000,
      tradersEnrolled: 3620,
      podium: [
        { rank: 1, name: "Mohammed Al-Rashid", netProfit: 17980 },
        { rank: 2, name: "Priya Nair", netProfit: 14210 },
        { rank: 3, name: "Daniel Koch", netProfit: 12090 },
      ],
    },
  ] as PastEdition[],

  activity: [
    { id: "a1", name: "Alex M.", avatarUrl: null, amount: 320, instrument: "EURUSD", at: isoAt(120), kind: "trade_win" },
    { id: "a2", name: "Priya N.", avatarUrl: null, amount: 0, instrument: "XAUUSD", at: isoAt(240), kind: "joined" },
    { id: "a3", name: "James T.", avatarUrl: null, amount: 485, instrument: "US30", at: isoAt(420), kind: "trade_win" },
    { id: "a4", name: "David K.", avatarUrl: null, amount: 0, instrument: "GBPUSD", at: isoAt(600), kind: "rank_up" },
    { id: "a5", name: "Aisha B.", avatarUrl: null, amount: 210, instrument: "NAS100", at: isoAt(900), kind: "trade_win" },
    { id: "a6", name: "Carlos R.", avatarUrl: null, amount: 0, instrument: "USDJPY", at: isoAt(1260), kind: "joined" },
    { id: "a7", name: "Emma W.", avatarUrl: null, amount: 640, instrument: "EURUSD", at: isoAt(1680), kind: "trade_win" },
    { id: "a8", name: "Omar S.", avatarUrl: null, amount: 0, instrument: "BTCUSD", at: isoAt(2100), kind: "rank_up" },
    { id: "a9", name: "Mei L.", avatarUrl: null, amount: 275, instrument: "AUDUSD", at: isoAt(2700), kind: "trade_win" },
    { id: "a10", name: "Ivan P.", avatarUrl: null, amount: 0, instrument: "XAUUSD", at: isoAt(3300), kind: "joined" },
    { id: "a11", name: "Fatima A.", avatarUrl: null, amount: 520, instrument: "GBPUSD", at: isoAt(4200), kind: "trade_win" },
    { id: "a12", name: "Jake M.", avatarUrl: null, amount: 0, instrument: "US30", at: isoAt(5400), kind: "rank_up" },
  ] as ActivityItem[],

  equityHistory: EQUITY_HISTORY,

  instrumentBreakdown: (() => {
    let allocated = 0;
    return INSTRUMENT_SHARES.map(([instrumentClass, sharePct], i) => {
      const volumeLots =
        i === INSTRUMENT_SHARES.length - 1
          ? MOCK_CONTEST_STATS.totalVolumeLots - allocated
          : Math.round((MOCK_CONTEST_STATS.totalVolumeLots * sharePct) / 100);
      allocated += volumeLots;
      return { instrumentClass, volumeLots, sharePct };
    });
  })() as InstrumentBreakdown[],

  content: {
    steps: [
      {
        title: "Sign up",
        body: "Enter your email on any page. Verify with a 6-digit code. No password needed.",
      },
      {
        title: "Trade forex as usual",
        body: "Open trades on your live account as you normally would. Every closed trade counts toward your net profit score automatically.",
      },
      {
        title: "Climb the board",
        body: "Your net profit updates as trades close. The top performers at the end win cash prizes. Top 20 are in the winning zone.",
      },
    ],
    rules: [
      "Open to individuals with an active live trading account. Demo accounts are not eligible.",
      "Minimum 10 closed trades during the contest period to appear on the ranked board.",
      "Eligible instruments: Forex pairs (Majors, Minors, Exotics), Metals (XAUUSD, XAGUSD), Indices (US30, NAS100, UK100) and Crypto (BTCUSD, ETHUSD).",
      "Maximum account drawdown must not exceed 30% at any point during the contest.",
      "Latency arbitrage, linked-account hedging and martingale abuse are prohibited and lead to disqualification.",
      "Ties are broken by the earlier timestamp at which the tied net profit was reached.",
      "Winners are verified for eligibility and fair-use before they are declared.",
      "One entry per person. Multiple accounts entered for the same person will all be disqualified.",
    ],
    faqs: [
      {
        q: "What is Net Profit?",
        a: "Net Profit is your total realised profit in USD across all closed trades during the contest period. It is the single metric we rank on: higher net profit = higher rank.",
      },
      {
        q: "Do trading losses count against me?",
        a: "Yes. Net Profit accounts for all closed trades — gains and losses. A losing week will reduce your score, but you can recover with future wins.",
      },
      {
        q: "Can I use a demo account?",
        a: "No. Only live accounts with real capital are eligible. Demo trades are not counted.",
      },
      {
        q: "When are winners declared?",
        a: "Within 7 days of the contest end date, after every top-20 account has been verified for eligibility and fair-use compliance.",
      },
      {
        q: "How are ties broken?",
        a: "If two traders have identical net profit, the one who reached that amount first (earlier timestamp on the qualifying trade) ranks higher.",
      },
      {
        q: "When are prizes paid?",
        a: "Cash prizes are transferred within 14 days of the winners being declared. Winners will be contacted on their registered email.",
      },
    ],
    disclosure:
      "Trading forex and CFDs carries a high risk of loss and may not suit everyone. Past performance is not a guide to future results. Prizes are subject to the contest terms, eligibility and fair-use checks. Nothing here is investment advice.",
  } as ContentPayload,
};

/** Shape of GET /api/me (also what the client keeps in memory). `user` is null when signed out. */
export interface MeUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  showName: boolean;
  showPhoto: boolean;
  country: string | null;
  profileComplete: boolean;
}
export interface MeResponse {
  user: MeUser | null;
  entry: LeaderboardEntry | null;
}

/* ── Signed-in user (mock mode merges them into the board at rank 27) ───── */
export interface SessionUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
  showName: boolean;
  showPhoto: boolean;
  country?: string;
}

/** What the public may see: real name + photo only with consent. */
export function publicIdentity(u: Pick<SessionUser, "name" | "avatarUrl" | "showName" | "showPhoto">): {
  name: string;
  avatarUrl: string | null;
} {
  const name = u.showName ? u.name : ANON_NAME;
  const avatarUrl = u.showPhoto && u.showName ? u.avatarUrl : null;
  return { name, avatarUrl };
}

let mockUser: SessionUser | null = null;
/** Mock mode only: tell the mock API who is signed in. The real API reads the session cookie instead. */
export function setMockSessionUser(u: SessionUser | null): void {
  mockUser = u;
}

function withUser(e: LeaderboardEntry): LeaderboardEntry {
  if (!mockUser || e.userId !== YOU_ID) return e;
  return { ...e, userId: mockUser.userId, ...publicIdentity(mockUser), isYou: true };
}

/** Server helper (card + share page): the mock "overall" row for a user id. */
export function mockEntryByUserId(userId: string, user?: SessionUser | null): LeaderboardEntry | null {
  const board = MOCK_DB.leaderboard.overall;
  if (user && user.userId === userId) {
    const slot = board.find((e) => e.userId === YOU_ID);
    return slot ? { ...slot, userId, ...publicIdentity(user), isYou: true } : null;
  }
  return board.find((e) => e.userId === userId) ?? null;
}

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

export function getContestStats(): Promise<ContestStats> {
  if (USE_MOCK) return mock(() => MOCK_DB.contestStats);
  return http<ContestStats>("/contest/stats");
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
      const all = MOCK_DB.leaderboard[p.period].map(withUser);
      const q = (p.search ?? "").trim().toLowerCase();
      const filtered = q ? all.filter((e) => e.name.toLowerCase().includes(q)) : all;
      const rebase = (e: LeaderboardEntry): LeaderboardEntry => ({
        ...e,
        lastActiveAt: shiftISO(e.lastActiveAt, shift),
      });
      const you = mockUser ? all.find((e) => e.isYou) : undefined;
      return {
        period: p.period,
        total: filtered.length,
        page,
        pageSize,
        entries: filtered.slice((page - 1) * pageSize, page * pageSize).map(rebase),
        cutoffRank: 20,
        cutoffValue: all[19].netProfit,
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
      const top = MOCK_DB.leaderboard.overall.map(withUser).slice(0, 20);
      const prizeOf = (rank: number) =>
        MOCK_DB.prizeTiers.find((t) => rank >= t.ranksFrom && rank <= t.ranksTo)?.reward ?? "";
      return {
        isFinal,
        heading: isFinal ? "Winners" : "Current leaders (provisional)",
        declaredAt: isFinal ? c.winnersDeclaredAt : null,
        winners: top.map((e) => ({
          rank: e.rank,
          userId: e.userId,
          name: e.name,
          avatarUrl: e.avatarUrl,
          countryCode: e.countryCode,
          netProfit: e.netProfit,
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

export function getProfitHistory(): Promise<EquityPoint[]> {
  if (USE_MOCK) return mock(() => MOCK_DB.equityHistory);
  return http<EquityPoint[]>("/contest/profit-history");
}

export function getInstrumentBreakdown(): Promise<InstrumentBreakdown[]> {
  if (USE_MOCK) return mock(() => MOCK_DB.instrumentBreakdown);
  return http<InstrumentBreakdown[]>("/contest/instruments");
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
  const { contestStats, leaderboard, instrumentBreakdown, equityHistory } = MOCK_DB;
  (Object.keys(leaderboard) as Period[]).forEach((period) => {
    const rows = leaderboard[period];
    rows.forEach((e, i) => {
      console.assert(e.rank === i + 1, `[api] ${period}: ranks must be sequential (#${i + 1})`);
      console.assert(
        i === 0 || rows[i - 1].netProfit > e.netProfit,
        `[api] ${period}: leaderboard must be strictly descending at #${e.rank}`,
      );
      console.assert(e.inWinningZone === e.rank <= 20, `[api] ${period}: winning zone flag wrong at #${e.rank}`);
      console.assert(e.trend.length === 14, `[api] ${period}: trend must have 14 points (#${e.rank})`);
      console.assert(
        e.trend[e.trend.length - 1] === e.netProfit,
        `[api] ${period}: trend last value must equal netProfit (#${e.rank})`,
      );
    });
  });
  console.assert(
    new Set(leaderboard.overall.filter((e) => e.name !== ANON_NAME).map((e) => e.name)).size ===
      leaderboard.overall.filter((e) => e.name !== ANON_NAME).length,
    "[api] public names must be unique",
  );
  console.assert(
    leaderboard.overall.every((e) => e.name !== ANON_NAME || e.avatarUrl === null),
    "[api] non-consenting traders must have no avatar",
  );
  console.assert(
    instrumentBreakdown.reduce((s, x) => s + x.sharePct, 0) === 100,
    "[api] instrument shares must sum to 100",
  );
  console.assert(
    contestStats.prizeFund > 0,
    "[api] prizeFund must be positive",
  );
  console.assert(
    equityHistory.length === 14,
    "[api] equityHistory must have 14 points",
  );
}
