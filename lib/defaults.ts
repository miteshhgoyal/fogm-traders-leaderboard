export interface BrandSettings {
  name: string;
  tagline: string;
  logoLight: string | null;
  logoDark: string | null;
  favicon: string | null;
  ogImage: string | null;
}

export interface ThemeTone {
  accent: string;
  accent2: string;
  accentInk: string;
}

export interface ThemeSettings {
  defaultMode: "light" | "dark" | "system";
  light: ThemeTone;
  dark: ThemeTone;
}

export interface ContestSettings {
  title: string;
  subtitle: string;
  status: "upcoming" | "registration_open" | "active" | "ended" | "winners_declared";
  startsAt: string | null;
  endsAt: string | null;
  registrationClosesAt: string | null;
  winnersDeclaredAt: string | null;
  prizeFund: number;
  metricLabel: string;
  metricHelp: string;
  currency: { code: string; locale: string };
}

export interface StepItem {
  title: string;
  body: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface PrizeItem {
  id: string;
  label: string;
  ranksFrom: number;
  ranksTo: number;
  reward: string;
  perks: string[];
  winnersCount: number;
}

export interface PartnerItem {
  name: string;
  role: string;
}

export interface SiteSettingsData {
  key: "main";
  brand: BrandSettings;
  theme: ThemeSettings;
  contest: ContestSettings;
  copy: Record<string, string>;
  steps: StepItem[];
  rules: string[];
  faqs: FaqItem[];
  prizes: PrizeItem[];
  partners: PartnerItem[];
  disclosure: string;
  dataSource: "mock" | "database" | "external";
  maintenance: { enabled: boolean; message: string };
  updatedAt: string;
}

export const DEFAULT_COPY: Record<string, string> = {
  "nav.leaderboard": "Leaderboard",
  "nav.winners": "Winners",
  "nav.leaders": "Leaders",
  "nav.how": "How to enter",
  "nav.faq": "FAQs",
  "rankCta.loggedOut": "See your rank →",
  "rankCta.loggedIn": "View my rank card",
  "hero.badgeUpcoming": "Starting soon",
  "hero.badgeRegistration": "Registration open",
  "hero.badgeActive": "Live · Contest running",
  "hero.badgeEnded": "Contest ended",
  "hero.badgeDeclared": "Winners declared",
  "hero.titleLine1": "Trade smart.",
  "hero.titleLine2": "Climb the Board!",
  "hero.subtitle": "Trade forex, gold and indices on live accounts. The best performers climb the board and win.",
  "hero.ctaLeaderboard": "View leaderboard",
  "contest.overviewTitle": "Contest overview",
  "contest.overviewSubtitle": "Live performance statistics from the FOGM Trading Championship.",
  "leaderboard.eyebrow": "Leaderboard",
  "leaderboard.title": "Who's climbing the board",
  "leaderboard.sub": "Ranked by Net Profit: your realised profit in USD across all closed trades during the contest.",
  "modal.seeRankHeading": "See where you rank",
  "modal.seeRankSubline": "Enter your email to unlock your rank card.",
  "modal.sendCodeBtn": "Send code",
  "card.shareText": "I'm ranked #{rank} in the {contest} 🏆",
  "footer.tagline": "Trade forex, gold and indices. Climb the board.",
  "footer.disclosure": "Trading forex and CFDs carries a high risk of loss and may not suit everyone. Past performance is not a guide to future results. Prizes are subject to the contest terms, eligibility and fair-use checks. Nothing here is investment advice.",
  "email.subject": "Your FOGM verification code",
  "email.intro": "Enter this code to access your rank card in the FOGM Trading Championship.",
};

export const DEFAULT_SETTINGS: SiteSettingsData = {
  key: "main",
  brand: {
    name: "FOGM",
    tagline: "Make your move.",
    logoLight: null,
    logoDark: null,
    favicon: null,
    ogImage: null,
  },
  theme: {
    defaultMode: "system",
    light: { accent: "#3b36e0", accent2: "#7a5cff", accentInk: "#ffffff" },
    dark: { accent: "#8b87ff", accent2: "#b49bff", accentInk: "#0b0b1a" },
  },
  contest: {
    title: "FOGM Trading Championship",
    subtitle: "Trade forex, gold and indices on live accounts. The best performers climb the board and win.",
    status: "active",
    startsAt: "2026-10-01T03:30:00.000Z",
    endsAt: "2026-12-31T18:29:59.000Z",
    registrationClosesAt: "2026-12-15T18:29:59.000Z",
    winnersDeclaredAt: null,
    prizeFund: 50000,
    metricLabel: "Net Profit",
    metricHelp: "Your realised profit in USD across all closed trades during the contest. Higher profit = higher rank.",
    currency: { code: "USD", locale: "en-US" },
  },
  copy: DEFAULT_COPY,
  steps: [
    { title: "Sign up", body: "Enter your email on any page. Verify with a 6-digit code. No password needed." },
    { title: "Trade forex as usual", body: "Open trades on your live account as you normally would. Every closed trade counts toward your net profit score automatically." },
    { title: "Climb the board", body: "Your net profit updates as trades close. The top performers at the end win cash prizes. Top 20 are in the winning zone." },
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
    { q: "What is Net Profit?", a: "Net Profit is your total realised profit in USD across all closed trades during the contest period. It is the single metric we rank on: higher net profit = higher rank." },
    { q: "Do trading losses count against me?", a: "Yes. Net Profit accounts for all closed trades — gains and losses. A losing week will reduce your score, but you can recover with future wins." },
    { q: "Can I use a demo account?", a: "No. Only live accounts with real capital are eligible. Demo trades are not counted." },
    { q: "When are winners declared?", a: "Within 7 days of the contest end date, after every top-20 account has been verified for eligibility and fair-use compliance." },
    { q: "How are ties broken?", a: "If two traders have identical net profit, the one who reached that amount first (earlier timestamp on the qualifying trade) ranks higher." },
    { q: "When are prizes paid?", a: "Cash prizes are transferred within 14 days of the winners being declared. Winners will be contacted on their registered email." },
  ],
  prizes: [
    { id: "grand", label: "Grand Prize", ranksFrom: 1, ranksTo: 1, reward: "$15,000 cash", perks: ["$15,000 cash prize", "Championship trophy", "Featured on winners wall"], winnersCount: 1 },
    { id: "podium", label: "Podium", ranksFrom: 2, ranksTo: 3, reward: "$5,000 cash", perks: ["$5,000 cash prize", "Certificate of excellence"], winnersCount: 2 },
    { id: "laptop", label: "Top 20", ranksFrom: 4, ranksTo: 20, reward: "$1,000 cash", perks: ["$1,000 cash prize", "Digital certificate"], winnersCount: 17 },
  ],
  partners: [
    { name: "Prime Markets Ltd", role: "Trading platform" },
    { name: "TradeEdu Pro", role: "Education partner" },
  ],
  disclosure: "Trading forex and CFDs carries a high risk of loss and may not suit everyone. Past performance is not a guide to future results. Prizes are subject to the contest terms, eligibility and fair-use checks. Nothing here is investment advice.",
  dataSource: "mock",
  maintenance: { enabled: false, message: "We're currently performing maintenance. Please check back shortly." },
  updatedAt: new Date().toISOString(),
};
