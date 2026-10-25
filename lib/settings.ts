import { cacheTag } from "next/cache";
import { z } from "zod";
import { dbConnect } from "./db";
import { SiteSettings } from "./models/SiteSettings";
import { DEFAULT_SETTINGS, type SiteSettingsData } from "./defaults";

const SettingsSchema = z.object({
  key: z.literal("main").default("main"),
  brand: z.object({
    name: z.string().default(DEFAULT_SETTINGS.brand.name),
    tagline: z.string().default(DEFAULT_SETTINGS.brand.tagline),
    logoLight: z.string().nullable().default(null),
    logoDark: z.string().nullable().default(null),
    favicon: z.string().nullable().default(null),
    ogImage: z.string().nullable().default(null),
  }).default(DEFAULT_SETTINGS.brand),
  theme: z.object({
    defaultMode: z.enum(["light", "dark", "system"]).default(DEFAULT_SETTINGS.theme.defaultMode),
    light: z.object({
      accent: z.string().default(DEFAULT_SETTINGS.theme.light.accent),
      accent2: z.string().default(DEFAULT_SETTINGS.theme.light.accent2),
      accentInk: z.string().default(DEFAULT_SETTINGS.theme.light.accentInk),
    }).default(DEFAULT_SETTINGS.theme.light),
    dark: z.object({
      accent: z.string().default(DEFAULT_SETTINGS.theme.dark.accent),
      accent2: z.string().default(DEFAULT_SETTINGS.theme.dark.accent2),
      accentInk: z.string().default(DEFAULT_SETTINGS.theme.dark.accentInk),
    }).default(DEFAULT_SETTINGS.theme.dark),
  }).default(DEFAULT_SETTINGS.theme),
  contest: z.object({
    title: z.string().default(DEFAULT_SETTINGS.contest.title),
    subtitle: z.string().default(DEFAULT_SETTINGS.contest.subtitle),
    status: z.enum(["upcoming", "registration_open", "active", "ended", "winners_declared"]).default(DEFAULT_SETTINGS.contest.status),
    startsAt: z.string().nullable().default(DEFAULT_SETTINGS.contest.startsAt),
    endsAt: z.string().nullable().default(DEFAULT_SETTINGS.contest.endsAt),
    registrationClosesAt: z.string().nullable().default(DEFAULT_SETTINGS.contest.registrationClosesAt),
    winnersDeclaredAt: z.string().nullable().default(DEFAULT_SETTINGS.contest.winnersDeclaredAt),
    prizeFund: z.number().default(DEFAULT_SETTINGS.contest.prizeFund),
    metricLabel: z.string().default(DEFAULT_SETTINGS.contest.metricLabel),
    metricHelp: z.string().default(DEFAULT_SETTINGS.contest.metricHelp),
    currency: z.object({
      code: z.string().default("USD"),
      locale: z.string().default("en-US"),
    }).default(DEFAULT_SETTINGS.contest.currency),
  }).default(DEFAULT_SETTINGS.contest),
  copy: z.record(z.string(), z.string()).default(DEFAULT_SETTINGS.copy),
  steps: z.array(z.object({
    title: z.string(),
    body: z.string(),
  })).default(DEFAULT_SETTINGS.steps),
  rules: z.array(z.string()).default(DEFAULT_SETTINGS.rules),
  faqs: z.array(z.object({
    q: z.string(),
    a: z.string(),
  })).default(DEFAULT_SETTINGS.faqs),
  prizes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    ranksFrom: z.number(),
    ranksTo: z.number(),
    reward: z.string(),
    perks: z.array(z.string()),
    winnersCount: z.number(),
  })).default(DEFAULT_SETTINGS.prizes),
  partners: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })).default(DEFAULT_SETTINGS.partners),
  disclosure: z.string().default(DEFAULT_SETTINGS.disclosure),
  dataSource: z.enum(["mock", "database", "external"]).default(DEFAULT_SETTINGS.dataSource),
  maintenance: z.object({
    enabled: z.boolean().default(false),
    message: z.string().default(DEFAULT_SETTINGS.maintenance.message),
  }).default(DEFAULT_SETTINGS.maintenance),
  updatedAt: z.string().default(DEFAULT_SETTINGS.updatedAt),
});

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sVal = source[key];
    const tVal = target[key];
    if (sVal === undefined || sVal === null) continue;
    if (typeof sVal === "object" && !Array.isArray(sVal) && typeof tVal === "object" && !Array.isArray(tVal)) {
      result[key] = deepMerge(tVal as Record<string, unknown>, sVal as Record<string, unknown>);
    } else {
      result[key] = sVal;
    }
  }
  return result;
}

export async function getSettings(): Promise<SiteSettingsData> {
  "use cache";
  cacheTag("settings");

  try {
    await dbConnect();
    const doc = await SiteSettings.findOne({ key: "main" }).lean();
    if (!doc) {
      return DEFAULT_SETTINGS;
    }

    // Convert doc to plain object
    const plainDoc: Record<string, unknown> = JSON.parse(JSON.stringify(doc));
    delete plainDoc._id;
    delete plainDoc.__v;

    // If doc.copy was a Mongoose Map, it converts to object in JSON.stringify
    const merged = deepMerge(
      DEFAULT_SETTINGS as unknown as Record<string, unknown>,
      plainDoc
    );

    const parsed = SettingsSchema.safeParse(merged);
    if (!parsed.success) {
      console.warn("[settings] Validation fallback:", parsed.error);
      return DEFAULT_SETTINGS;
    }
    return parsed.data as SiteSettingsData;
  } catch (e) {
    console.warn("[settings] Database error, using defaults:", e);
    return DEFAULT_SETTINGS;
  }
}
