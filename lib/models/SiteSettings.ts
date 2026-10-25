import { Schema, model, models, type Model } from "mongoose";

export interface ISiteSettings {
  key: "main";
  brand: {
    name: string;
    tagline: string;
    logoLight: string | null;
    logoDark: string | null;
    favicon: string | null;
    ogImage: string | null;
  };
  theme: {
    defaultMode: "light" | "dark" | "system";
    light: { accent: string; accent2: string; accentInk: string };
    dark: { accent: string; accent2: string; accentInk: string };
  };
  contest: {
    title: string;
    subtitle: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    registrationClosesAt: string | null;
    winnersDeclaredAt: string | null;
    prizeFund: number;
    metricLabel: string;
    metricHelp: string;
    currency: { code: string; locale: string };
  };
  copy: Record<string, string>;
  steps: { title: string; body: string }[];
  rules: string[];
  faqs: { q: string; a: string }[];
  prizes: { id: string; label: string; ranksFrom: number; ranksTo: number; reward: string; perks: string[]; winnersCount: number }[];
  partners: { name: string; role: string }[];
  disclosure: string;
  dataSource: "mock" | "database" | "external";
  maintenance: { enabled: boolean; message: string };
  updatedAt: Date;
}

const schema = new Schema<ISiteSettings>(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    brand: {
      name: { type: String, default: "FOGM" },
      tagline: { type: String, default: "Make your move." },
      logoLight: { type: String, default: null },
      logoDark: { type: String, default: null },
      favicon: { type: String, default: null },
      ogImage: { type: String, default: null },
    },
    theme: {
      defaultMode: { type: String, enum: ["light", "dark", "system"], default: "system" },
      light: {
        accent: { type: String, default: "#3b36e0" },
        accent2: { type: String, default: "#7a5cff" },
        accentInk: { type: String, default: "#ffffff" },
      },
      dark: {
        accent: { type: String, default: "#8b87ff" },
        accent2: { type: String, default: "#b49bff" },
        accentInk: { type: String, default: "#0b0b1a" },
      },
    },
    contest: {
      title: { type: String, default: "FOGM Trading Championship" },
      subtitle: { type: String, default: "Trade forex, gold and indices on live accounts. The best performers climb the board and win." },
      status: { type: String, default: "active" },
      startsAt: { type: String, default: null },
      endsAt: { type: String, default: null },
      registrationClosesAt: { type: String, default: null },
      winnersDeclaredAt: { type: String, default: null },
      prizeFund: { type: Number, default: 50000 },
      metricLabel: { type: String, default: "Net Profit" },
      metricHelp: { type: String, default: "Your realised profit in USD across all closed trades during the contest. Higher profit = higher rank." },
      currency: { code: { type: String, default: "USD" }, locale: { type: String, default: "en-US" } },
    },
    copy: { type: Map, of: String, default: {} },
    steps: [{ title: String, body: String }],
    rules: [String],
    faqs: [{ q: String, a: String }],
    prizes: [{ id: String, label: String, ranksFrom: Number, ranksTo: Number, reward: String, perks: [String], winnersCount: Number }],
    partners: [{ name: String, role: String }],
    disclosure: { type: String, default: "" },
    dataSource: { type: String, enum: ["mock", "database", "external"], default: "mock" },
    maintenance: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: "We're doing maintenance. Be back soon." },
    },
  },
  { timestamps: true },
);

export const SiteSettings: Model<ISiteSettings> = (models.SiteSettings as Model<ISiteSettings> | undefined) ?? model<ISiteSettings>("SiteSettings", schema);
