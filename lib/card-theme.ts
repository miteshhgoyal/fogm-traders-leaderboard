/**
 * Colours for the rank card image. `next/og` cannot read CSS variables, so these MIRROR the dark-mode
 * values of the `indigo` entry in PRESETS (app/page.tsx). If you change ACTIVE_PRESET, change `ACCENT` here too.
 */
export const ACCENT = { a: "#8b87ff", b: "#b49bff", ink: "#0b0b1a" } as const;
export const SURFACE = { top: "#14143c", bottom: "#07071a", line: "rgba(255,255,255,0.14)", ink: "#f5f6ff", mute: "#a4a8c8", faint: "#6f7396" } as const;

export type Tier = "gold" | "silver" | "bronze" | "zone" | "rising";

export const TIER_COLORS: Record<Tier, { hi: string; lo: string; label: string }> = {
  gold: { hi: "#ffe08a", lo: "#e0a21a", label: "Champion" },
  silver: { hi: "#f1f4fb", lo: "#98a2b8", label: "Podium" },
  bronze: { hi: "#f0c29b", lo: "#b8743a", label: "Podium" },
  zone: { hi: ACCENT.a, lo: ACCENT.b, label: "Winning zone" },
  rising: { hi: "#aab0c8", lo: "#5f6483", label: "Rising" },
};

export const tierFor = (rank: number): Tier => (rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : rank <= 20 ? "zone" : "rising");
