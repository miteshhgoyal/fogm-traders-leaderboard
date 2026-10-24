"use client";

/* ──────────────────────────────────────────────────────────────────────────
 * FOGM — premium fintech leaderboard landing page (static v1, API-ready).
 *
 * Where things live (all in this file unless noted):
 *   • THEME / PRESETS / ACTIVE_PRESET / SHOW_THEME_STUDIO ... "THEME CONFIG"
 *   • Animation helpers: useReveal, Reveal, CountUp, useSpotlight, Marquee/Ticker ... "ANIMATION HELPERS"
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
import { Inter, Space_Grotesk } from "next/font/google";
import {
  formatCompactINR,
  formatINR,
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

/* ═══════════════════════════ STATIC CSS ═════════════════════════════════ */
const STYLES = `
html{scroll-behavior:smooth}
.fogm{--grad:linear-gradient(135deg,var(--accent),var(--accent-2));
--t4:color-mix(in oklab,var(--accent) 4%,transparent);--t8:color-mix(in oklab,var(--accent) 8%,transparent);
--t12:color-mix(in oklab,var(--accent) 12%,transparent);--t20:color-mix(in oklab,var(--accent) 20%,transparent);
--t35:color-mix(in oklab,var(--accent) 35%,transparent);--t60:color-mix(in oklab,var(--accent) 60%,transparent);
--gold:#f2b33d;--silver:#b4bccd;--bronze:#cd8a55;
font-family:var(--font-body),system-ui,-apple-system,"Segoe UI",sans-serif;font-size:16px;line-height:1.55;
color:var(--ink);background:var(--bg);min-height:100vh;overflow-x:clip;-webkit-font-smoothing:antialiased;
font-variant-numeric:tabular-nums;position:relative}
.fogm *,.fogm *::before,.fogm *::after{box-sizing:border-box}
.fogm h1,.fogm h2,.fogm h3,.fogm h4,.fogm p,.fogm ul,.fogm ol,.fogm figure{margin:0;padding:0}
.fogm ul,.fogm ol{list-style:none}
.fogm button{font:inherit;color:inherit;cursor:pointer;background:none;border:0;padding:0;-webkit-tap-highlight-color:transparent}
.fogm a{color:inherit;text-decoration:none}
.fogm input{font:inherit;color:inherit}
.fogm section[id]{scroll-margin-top:84px}
.fogm :focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:10px}
.fogm ::selection{background:var(--t35)}
.f-display{font-family:var(--font-display),var(--font-body),system-ui,sans-serif;letter-spacing:-.035em;line-height:1.05;font-weight:600}
.f-wrap{max-width:1200px;margin:0 auto;padding:0 20px}
.f-sec{padding:clamp(64px,9vw,120px) 0;position:relative;border-top:1px solid var(--hairline)}
.f-sec.alt{background:var(--bg-alt)}
.f-eyebrow{display:inline-flex;align-items:center;gap:12px;font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--accent)}
.f-eyebrow::before{content:"";width:32px;height:1px;background:var(--accent);display:block}
.f-title{font-size:clamp(34px,5vw,56px);margin-top:16px;letter-spacing:-.04em}
.f-sub{margin-top:16px;color:var(--mute);max-width:640px;font-size:17px}
.f-head{margin-bottom:clamp(32px,5vw,56px)}
.f-head.center{text-align:center}.f-head.center .f-sub{margin-left:auto;margin-right:auto}
.f-gradtext{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.f-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* buttons */
.f-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 24px;border-radius:999px;font-weight:600;font-size:15px;
transition:transform .2s ease,box-shadow .25s ease,border-color .2s ease,background-color .2s ease;white-space:nowrap}
.f-btn:active{transform:scale(.98)!important}
.f-btn.sm{min-height:44px;padding:0 20px;font-size:14px}
.f-btn.primary{background:var(--grad);color:var(--accent-ink);box-shadow:0 10px 30px -10px var(--t60),inset 0 1px 0 rgba(255,255,255,.25)}
.f-btn.primary:hover{transform:translateY(-1px);box-shadow:0 16px 38px -10px var(--t60),inset 0 1px 0 rgba(255,255,255,.3)}
.f-btn.ghost{background:var(--card);border:1px solid var(--hairline-strong);color:var(--ink)}
.f-btn.ghost:hover{border-color:var(--accent);transform:translateY(-1px)}
.f-btn.white{background:#fff;color:#14143a;box-shadow:0 14px 34px -12px rgba(0,0,0,.35)}
.f-btn.white:hover{transform:translateY(-1px)}
.f-iconbtn{width:44px;height:44px;border-radius:999px;display:inline-grid;place-items:center;border:1px solid var(--hairline-strong);background:var(--card);transition:border-color .2s,transform .2s}
.f-iconbtn:hover{border-color:var(--accent)}

/* cards */
.f-card{background:var(--card);border:1px solid var(--hairline);border-radius:24px;box-shadow:var(--shadow),var(--inset);position:relative;overflow:clip}
.f-card.pad{padding:clamp(20px,3vw,32px)}
.f-wash::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(60% 70% at 100% 0%,var(--t12),transparent 70%)}
.f-gborder{border:1px solid transparent;background:linear-gradient(var(--card),var(--card)) padding-box,var(--grad) border-box}
.f-spot::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .3s;
background:radial-gradient(260px circle at var(--mx,50%) var(--my,50%),var(--t12),transparent 70%)}
.f-spot:hover::before{opacity:1}
.f-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;line-height:1.6;white-space:nowrap}
.f-pill.acc{background:var(--t12);color:var(--accent)}
.f-pill.mute{background:color-mix(in oklab,var(--ink) 7%,transparent);color:var(--mute)}
.f-pill.up{background:color-mix(in oklab,var(--up) 14%,transparent);color:var(--up)}
.f-pill.down{background:color-mix(in oklab,var(--down) 14%,transparent);color:var(--down)}
.f-dot{width:8px;height:8px;border-radius:50%;background:var(--up);position:relative;flex:none}
.f-dot::after{content:"";position:absolute;inset:0;border-radius:50%;background:var(--up);animation:f-ping 1.8s ease-out infinite}
.f-dot.off{background:var(--faint)}.f-dot.off::after{display:none}

/* reveal */
.rv{opacity:0;transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1),filter .8s cubic-bezier(.2,.7,.2,1);transition-delay:var(--d,0ms);will-change:opacity,transform}
.rv[data-v="up"]{transform:translateY(24px);filter:blur(6px)}
.rv[data-v="fade"]{filter:blur(4px)}
.rv[data-v="scale"]{transform:scale(.94);filter:blur(6px)}
.rv[data-v="left"]{transform:translateX(-24px);filter:blur(6px)}
.rv[data-v="right"]{transform:translateX(24px);filter:blur(6px)}
.rv.in{opacity:1;transform:none;filter:none}
.st{opacity:0;transform:translateY(16px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1);transition-delay:calc(var(--i,0)*70ms + var(--d,0ms))}
.in .st,.st.in{opacity:1;transform:none}

/* nav */
.f-nav{position:sticky;top:0;z-index:50;transition:background-color .3s,backdrop-filter .3s,border-color .3s;border-bottom:1px solid transparent}
.f-nav.scrolled{background:color-mix(in oklab,var(--bg) 78%,transparent);backdrop-filter:blur(16px) saturate(1.4);-webkit-backdrop-filter:blur(16px) saturate(1.4);border-bottom-color:var(--hairline)}
.f-nav-in{height:72px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.f-logo{display:inline-flex;align-items:center;gap:10px;font-size:22px;font-weight:700;letter-spacing:-.04em}
.f-logo svg{color:var(--accent)}
.f-links{display:none;gap:4px;align-items:center}
.f-links a{padding:10px 14px;border-radius:999px;font-size:14px;font-weight:600;color:var(--mute);transition:color .2s,background-color .2s}
.f-links a:hover{color:var(--ink);background:var(--t8)}
.f-nav-cta{display:none;gap:10px;align-items:center}
.f-burger{display:inline-grid}
.f-sheet{position:absolute;left:0;right:0;top:72px;background:var(--bg);border-bottom:1px solid var(--hairline);padding:12px 20px 24px;display:grid;gap:4px;
transform-origin:top;transition:opacity .3s,transform .3s;box-shadow:var(--shadow-lg)}
.f-sheet[data-open="false"]{opacity:0;transform:translateY(-8px) scaleY(.96);pointer-events:none;visibility:hidden}
.f-sheet a.l{padding:14px 8px;font-weight:600;font-size:17px;border-bottom:1px solid var(--hairline);min-height:48px}
.f-sheet .row{display:flex;gap:10px;margin-top:14px}.f-sheet .row .f-btn{flex:1}
.f-theme svg{grid-area:1/1;transition:transform .5s cubic-bezier(.3,.8,.3,1),opacity .3s}
.f-theme .sun{transform:rotate(0)scale(1);opacity:1}.f-theme .moon{transform:rotate(-90deg)scale(.4);opacity:0}
.dark .f-theme .sun{transform:rotate(90deg)scale(.4);opacity:0}.dark .f-theme .moon{transform:rotate(0)scale(1);opacity:1}
@media(min-width:900px){.f-links,.f-nav-cta{display:flex}.f-burger,.f-sheet{display:none}}

/* hero */
.f-hero{position:relative;overflow:clip;padding:clamp(48px,8vw,96px) 0 0;text-align:center;isolation:isolate}
.f-mesh{position:absolute;inset:0;z-index:-1;pointer-events:none}
.f-blob{position:absolute;border-radius:50%;filter:blur(80px);opacity:.55;will-change:transform}
.f-blob.a{width:520px;height:520px;left:-8%;top:-12%;background:var(--accent);opacity:.28;animation:f-drift1 18s ease-in-out infinite alternate}
.f-blob.b{width:460px;height:460px;right:-6%;top:6%;background:var(--accent-2);opacity:.28;animation:f-drift2 22s ease-in-out infinite alternate}
.f-blob.c{width:380px;height:380px;left:38%;top:42%;background:var(--accent);opacity:.14;animation:f-drift3 26s ease-in-out infinite alternate}
.f-grid{position:absolute;inset:0;opacity:.05;background-image:linear-gradient(var(--ink) 1px,transparent 1px),linear-gradient(90deg,var(--ink) 1px,transparent 1px);background-size:44px 44px;
-webkit-mask-image:radial-gradient(70% 60% at 50% 30%,#000,transparent 80%);mask-image:radial-gradient(70% 60% at 50% 30%,#000,transparent 80%)}
.f-badge{display:inline-flex;align-items:center;gap:10px;padding:8px 16px;border-radius:999px;border:1px solid var(--hairline-strong);background:color-mix(in oklab,var(--card) 80%,transparent);
backdrop-filter:blur(8px);font-size:13px;font-weight:600;box-shadow:var(--shadow)}
.f-h1{font-size:clamp(52px,9vw,120px);letter-spacing:-.045em;line-height:1;font-weight:700;margin:24px auto 0;max-width:15ch}
.f-line{display:block}
.f-word{display:inline-block;overflow:hidden;vertical-align:top;padding:0 .04em .12em;margin:0 -.04em -.12em}
.f-word>span{display:inline-block;transform:translateY(112%);animation:f-wordin .9s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(var(--w)*90ms + 250ms)}
.f-herosub{margin:24px auto 0;max-width:620px;font-size:clamp(16px,2vw,19px);color:var(--mute)}
.f-ctas{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:32px}
.f-heroin{opacity:0;transform:translateY(16px);animation:f-fadeup .8s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:var(--hd,0ms)}
.f-spec{display:grid;grid-template-columns:repeat(2,1fr);margin:clamp(40px,6vw,64px) auto 0;max-width:960px;border:1px solid var(--hairline);border-radius:24px;background:color-mix(in oklab,var(--card) 70%,transparent);backdrop-filter:blur(10px);box-shadow:var(--shadow)}
.f-spec-item{padding:22px 16px;position:relative}
.f-spec-item:nth-child(odd)::after{content:"";position:absolute;right:0;top:20%;bottom:20%;width:1px;background:var(--hairline)}
.f-spec-item:nth-child(n+3){border-top:1px solid var(--hairline)}
.f-spec-num{font-size:clamp(28px,4.4vw,44px);font-weight:700;letter-spacing:-.04em;line-height:1.1}
.f-spec-num small{font-size:13px;font-weight:600;letter-spacing:0;color:var(--mute);margin-left:6px}
.f-spec-label{margin-top:6px;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--faint)}
@media(min-width:760px){.f-spec{grid-template-columns:repeat(4,1fr)}.f-spec-item{border-top:0!important}.f-spec-item::after{content:"";position:absolute;right:0;top:20%;bottom:20%;width:1px;background:var(--hairline)!important}.f-spec-item:last-child::after{display:none}}
.f-count{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:36px}
.f-count .lbl{font-size:12px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--faint)}
.f-cd{display:flex;gap:10px}
.f-cd div{min-width:68px;padding:12px 8px;border-radius:16px;background:var(--card);border:1px solid var(--hairline);box-shadow:var(--shadow);text-align:center}
.f-cd b{display:block;font-size:28px;line-height:1.1;letter-spacing:-.03em}
.f-cd span{font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
@media(max-width:420px){.f-cd div{min-width:60px}.f-cd b{font-size:24px}.f-cd{gap:8px}}

/* ticker + marquee */
.f-ticker{margin-top:clamp(36px,5vw,56px);border-top:1px solid var(--hairline);border-bottom:1px solid var(--hairline);background:color-mix(in oklab,var(--bg) 70%,transparent);overflow:hidden;width:100%;min-height:52px;display:flex;align-items:center}
.f-track{display:flex;width:max-content;animation:f-scroll var(--dur,60s) linear infinite}
.f-ticker:hover .f-track,.f-marq:hover .f-track{animation-play-state:paused}
.f-tk{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;font-size:14px;color:var(--mute);white-space:nowrap;border-right:1px solid var(--hairline)}
.f-tk b{color:var(--ink);font-weight:600}.f-tk .amt{color:var(--up);font-weight:600}
.f-tk i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--t12);color:var(--accent);font-style:normal}
.f-marq{overflow:hidden;padding:clamp(28px,4vw,48px) 0;border-top:1px solid var(--hairline);background:var(--bg)}
.f-marq .f-track{--dur:44s}
.f-marq .mw{font-size:clamp(48px,9vw,112px);font-weight:700;letter-spacing:-.04em;white-space:nowrap;padding-right:.4em;transition:-webkit-text-stroke-color .3s}
.f-marq .mw.w{color:transparent;-webkit-text-stroke:1.5px color-mix(in oklab,var(--ink) 32%,transparent)}
.f-marq .mw.dotm{color:var(--accent)}
.f-marq:hover .mw.w{-webkit-text-stroke-color:var(--accent)}

/* skeleton + states */
.sk{border-radius:12px;background:linear-gradient(100deg,color-mix(in oklab,var(--ink) 6%,transparent) 30%,color-mix(in oklab,var(--ink) 12%,transparent) 50%,color-mix(in oklab,var(--ink) 6%,transparent) 70%);background-size:300% 100%;animation:f-shimmer 1.4s linear infinite}
.f-err{display:flex;flex-direction:column;align-items:center;gap:12px;padding:32px 20px;text-align:center;border:1px dashed var(--hairline-strong);border-radius:20px;color:var(--mute)}
.f-err b{color:var(--ink)}
.f-empty{padding:48px 20px;text-align:center;color:var(--mute)}
.f-empty b{display:block;color:var(--ink);font-size:18px;margin-bottom:6px}

/* pool */
.f-pool-head{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;justify-content:space-between}
.f-pool-title{font-size:clamp(24px,3vw,30px);font-weight:600;display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.f-dates{font-size:14px;color:var(--mute)}
.f-used{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;justify-content:space-between;margin-top:28px;font-size:15px;color:var(--mute)}
.f-used b{color:var(--ink);font-size:clamp(20px,2.6vw,26px);font-weight:600}
.f-bar{height:14px;border-radius:999px;background:color-mix(in oklab,var(--ink) 8%,transparent);margin-top:14px;overflow:hidden;position:relative}
.f-bar i{position:absolute;inset:0;border-radius:999px;background:var(--grad);transform:scaleX(0);transform-origin:left;transition:transform 1.6s cubic-bezier(.2,.8,.2,1) .15s}
.f-bar.in i{transform:scaleX(var(--p,0))}
.f-tiles{display:grid;gap:12px;margin-top:28px;grid-template-columns:repeat(2,1fr)}
.f-tiles.t5>:first-child{grid-column:1/-1}
@media(min-width:900px){.f-tiles.t5{grid-template-columns:repeat(5,1fr)}.f-tiles.t5>:first-child{grid-column:auto}.f-tiles.t4{grid-template-columns:repeat(4,1fr)}}
.f-tile{position:relative;overflow:clip;padding:18px;border-radius:14px;border:1px solid var(--hairline);background:var(--bg-alt)}
.f-tile .l{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
.f-tile .v{margin-top:8px;font-size:clamp(22px,2.4vw,28px);font-weight:600;letter-spacing:-.03em;line-height:1.15}
.f-tile.sm .v{font-size:clamp(18px,2vw,22px)}
.f-tile.sm{padding:14px 16px}
.f-info{display:flex;gap:12px;align-items:flex-start;margin-top:20px;padding:14px 16px;border-radius:14px;background:var(--t8);color:var(--mute);font-size:14px}
.f-info svg{flex:none;color:var(--accent);margin-top:2px}
.f-info b{color:var(--ink)}
.f-grid2{display:grid;gap:16px;margin-top:16px}
@media(min-width:900px){.f-grid2{grid-template-columns:7fr 5fr}}
.f-h3{font-size:20px;font-weight:600;letter-spacing:-.02em}
.f-h3sub{font-size:14px;color:var(--mute);margin-top:2px}
.f-chartbox{position:relative;margin-top:16px;width:100%}
.f-chartbox svg{display:block;overflow:visible}
.f-draw{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.8s cubic-bezier(.2,.7,.2,1) .2s}
.in .f-draw,.f-draw.in{stroke-dashoffset:0}
.f-areafill{opacity:0;transition:opacity 1.2s ease .8s}.in .f-areafill{opacity:1}
.f-ctip{position:absolute;top:0;transform:translate(-50%,-110%);pointer-events:none;padding:6px 10px;border-radius:10px;background:var(--ink);color:var(--bg);font-size:12px;font-weight:600;white-space:nowrap;z-index:2}
.f-segrow+.f-segrow{margin-top:18px}
.f-segrow .top{display:flex;justify-content:space-between;gap:12px;font-size:14px;font-weight:600}
.f-segrow .top span:last-child{color:var(--mute);font-weight:400}
.f-segbar{height:10px;border-radius:999px;margin-top:8px;background:color-mix(in oklab,var(--ink) 8%,transparent);overflow:hidden;position:relative}
.f-segbar i{position:absolute;inset:0;border-radius:999px;background:var(--grad);transform:scaleX(0);transform-origin:left;transition:transform 1.3s cubic-bezier(.2,.8,.2,1);transition-delay:calc(var(--i,0)*120ms + 150ms)}
.in .f-segbar i{transform:scaleX(var(--p,0))}

/* tooltip */
.f-tipwrap{position:relative;display:inline-flex;vertical-align:middle}
.f-tipbtn{width:20px;height:20px;border-radius:50%;display:inline-grid;place-items:center;color:var(--faint);border:1px solid var(--hairline-strong);font-size:11px;font-weight:700;line-height:1;margin-left:6px;position:relative}
.f-tipbtn::before{content:"";position:absolute;inset:-12px}
.f-tipbtn:hover,.f-tipbtn[aria-expanded="true"]{color:var(--accent);border-color:var(--accent)}
.f-tippop{position:absolute;z-index:30;top:calc(100% + 8px);right:-8px;width:240px;max-width:70vw;padding:12px 14px;border-radius:14px;background:var(--ink);color:var(--bg);font-size:13px;font-weight:400;letter-spacing:0;text-transform:none;line-height:1.45;box-shadow:var(--shadow-lg);text-align:left;opacity:0;transform:translateY(-4px);pointer-events:none;transition:opacity .2s,transform .2s}
.f-tipwrap[data-open="true"] .f-tippop{opacity:1;transform:none;pointer-events:auto}

/* leaderboard controls */
.f-controls{display:flex;flex-wrap:wrap;gap:12px 16px;align-items:center;justify-content:space-between;margin-bottom:28px}
.f-tabs{position:relative;display:inline-grid;grid-template-columns:repeat(3,1fr);padding:4px;border-radius:999px;background:color-mix(in oklab,var(--ink) 6%,transparent);border:1px solid var(--hairline);width:min(100%,420px)}
.f-tab{position:relative;z-index:1;min-height:44px;padding:0 14px;border-radius:999px;font-size:14px;font-weight:600;color:var(--mute);transition:color .25s;white-space:nowrap}
.f-tab[aria-selected="true"]{color:var(--accent-ink)}
.f-tab:not([aria-selected="true"]):hover{color:var(--ink)}
.f-ind{position:absolute;z-index:0;top:4px;bottom:4px;left:4px;width:calc((100% - 8px)/3);border-radius:999px;background:var(--grad);box-shadow:0 8px 22px -8px var(--t60);transition:transform .45s cubic-bezier(.3,.8,.3,1)}
.f-search{position:relative;flex:1 1 240px;max-width:360px}
.f-search input{width:100%;height:48px;padding:0 44px 0 44px;border-radius:14px;border:1px solid var(--hairline-strong);background:var(--card);outline:none;font-size:15px;transition:border-color .2s,box-shadow .2s}
.f-search input::placeholder{color:var(--faint)}
.f-search input:focus{border-color:var(--accent);box-shadow:0 0 0 4px var(--t12)}
.f-search>svg{position:absolute;left:15px;top:15px;color:var(--faint);pointer-events:none}
.f-search .clr{position:absolute;right:6px;top:2px;width:44px;height:44px;display:grid;place-items:center;color:var(--faint);border-radius:50%}
.f-search .clr:hover{color:var(--ink)}
.f-meta{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between;margin-bottom:20px;font-size:13px;color:var(--mute)}

/* podium */
.f-podium-wrap{border-radius:32px;border:1px solid var(--hairline);background:linear-gradient(180deg,var(--t4),transparent 60%),var(--card);box-shadow:var(--shadow-lg),var(--inset);padding:clamp(20px,4vw,40px) clamp(14px,3vw,36px) 0;position:relative;overflow:clip;margin-bottom:24px}
.f-podium-wrap::before{content:"";position:absolute;inset:0;opacity:.04;background-image:linear-gradient(var(--ink) 1px,transparent 1px),linear-gradient(90deg,var(--ink) 1px,transparent 1px);background-size:36px 36px;-webkit-mask-image:radial-gradient(60% 70% at 50% 40%,#000,transparent 80%);mask-image:radial-gradient(60% 70% at 50% 40%,#000,transparent 80%);pointer-events:none}
.f-podium-label{display:flex;align-items:center;justify-content:center;gap:10px;text-align:center;font-size:12px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--mute);position:relative}
.f-podium{display:grid;grid-template-columns:1fr 1.18fr 1fr;gap:clamp(8px,2vw,24px);align-items:end;margin-top:28px;position:relative}
.f-pcol{display:flex;flex-direction:column;align-items:stretch;min-width:0}
.f-pcol.p1{order:2}.f-pcol.p2{order:1}.f-pcol.p3{order:3}
.f-pcard{position:relative;text-align:center;padding:clamp(14px,2vw,22px) clamp(8px,1.4vw,16px) 18px;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0}
.f-pcol.p1 .f-pcard{padding-top:clamp(32px,4vw,44px)}
.f-avatar{position:relative;width:clamp(58px,8vw,84px);height:clamp(58px,8vw,84px);border-radius:50%;display:grid;place-items:center;font-size:clamp(20px,2.6vw,28px);font-weight:700;color:#1b1405;
background:linear-gradient(135deg,var(--m1),var(--m2));box-shadow:0 14px 30px -12px var(--m2),inset 0 2px 0 rgba(255,255,255,.55)}
.p1{--m1:#ffe08a;--m2:var(--gold)}.p2{--m1:#f1f4fb;--m2:var(--silver)}.p3{--m1:#f0c29b;--m2:var(--bronze)}
.f-flagb{position:absolute;right:-4px;bottom:-4px;width:26px;height:26px;border-radius:50%;border:2px solid var(--card);overflow:hidden;background:var(--card);display:grid;place-items:center;color:var(--mute)}
.f-pname{font-weight:600;font-size:clamp(13px,1.6vw,17px);letter-spacing:.02em;overflow-wrap:anywhere}
.f-psaved{font-size:clamp(22px,3.4vw,38px);font-weight:700;letter-spacing:-.04em;line-height:1.1}
.f-pcol.p1 .f-psaved{font-size:clamp(26px,4.4vw,48px)}
.f-pcity{font-size:12px;color:var(--faint)}
.f-pchip{font-size:11px;line-height:1.35;padding:5px 10px;border-radius:999px;background:var(--t12);color:var(--accent);font-weight:600;max-width:100%}
.f-ped{margin-top:12px;border-radius:18px 18px 0 0;display:grid;place-items:start center;padding-top:14px;position:relative;overflow:clip;
background:linear-gradient(180deg,color-mix(in oklab,var(--m2) 30%,var(--card)),color-mix(in oklab,var(--m2) 6%,var(--card)));border:1px solid color-mix(in oklab,var(--m2) 40%,transparent);border-bottom:0;
transform:scaleY(0);transform-origin:bottom;transition:transform 1s cubic-bezier(.2,.9,.2,1);transition-delay:var(--pd,0ms)}
.f-ped b{font-size:clamp(34px,6vw,64px);font-weight:700;letter-spacing:-.05em;color:color-mix(in oklab,var(--m2) 85%,var(--ink));line-height:1}
.p1 .f-ped{height:clamp(96px,16vw,170px);--pd:350ms}.p2 .f-ped{height:clamp(70px,11vw,120px);--pd:100ms}.p3 .f-ped{height:clamp(54px,8vw,90px);--pd:600ms}
.in .f-ped{transform:none}
.f-crown{position:absolute;top:-6px;left:50%;margin-left:-22px;width:44px;height:36px;color:var(--gold);transform:translateY(-60px);opacity:0;z-index:2;filter:drop-shadow(0 6px 10px rgba(242,179,61,.5))}
.in .f-crown{animation:f-crown 1s cubic-bezier(.3,1.5,.5,1) .9s forwards}
.f-spotlight{position:absolute;left:50%;top:-30%;width:150%;height:150%;margin-left:-75%;pointer-events:none;background:radial-gradient(closest-side,color-mix(in oklab,var(--gold) 34%,transparent),transparent 75%);animation:f-breathe 5s ease-in-out infinite}
.f-shine{position:absolute;inset:0;pointer-events:none;overflow:clip;border-radius:inherit}
.f-shine::after{content:"";position:absolute;top:-20%;bottom:-20%;left:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:translateX(-160%) skewX(-18deg);animation:f-shine 6s ease-in-out 2s infinite}
.dark .f-shine::after{background:linear-gradient(100deg,transparent,rgba(255,255,255,.16),transparent)}
@media(max-width:639px){
.f-podium{grid-template-columns:1fr;gap:12px;margin-top:20px;padding-bottom:20px}
.f-pcol.p1{order:1}.f-pcol.p2{order:2}.f-pcol.p3{order:3}
.f-pcard{flex-direction:row;text-align:left;justify-content:flex-start;flex-wrap:wrap;gap:6px 14px;border:1px solid var(--hairline);border-radius:20px;background:var(--bg-alt);padding:16px}
.f-pcard .info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;align-items:flex-start}
.f-pcard .f-psaved,.f-pcol.p1 .f-psaved{font-size:26px}
.f-ped,.f-crown{display:none}.f-avatar{width:56px;height:56px;font-size:22px}
}
@media(min-width:640px){.f-pcard .info{display:contents}}
.f-mv{display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:600}
.f-mv.up{color:var(--up)}.f-mv.down{color:var(--down)}.f-mv.flat{color:var(--faint)}
.f-mv svg{animation:f-pulse1 .9s ease-out .6s 1 both}

/* table */
.f-board{padding:0}
.f-thead,.f-row{display:grid;align-items:center;column-gap:12px;grid-template-columns:64px minmax(180px,1.7fr) 92px 78px 112px 150px 112px 150px;padding:0 24px}
.f-thead{position:sticky;top:72px;z-index:5;min-height:52px;background:color-mix(in oklab,var(--card) 92%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--hairline);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.f-thead .r,.f-row .r{text-align:right;justify-content:flex-end}
.f-row{position:relative;min-height:68px;border-bottom:1px solid var(--hairline);transition:background-color .25s,transform .25s;font-size:14px}
.f-row:hover{background:var(--t8);transform:translateY(-2px);z-index:1}
.f-row.zone{background:var(--t4)}
.f-row.zone:hover{background:var(--t12)}
.f-row.zone::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--grad)}
.f-row.you{background:var(--t8)}
.row-st{opacity:0}
.in .row-st{animation:f-rowin .6s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i,0)*45ms)}
.f-rank{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;background:color-mix(in oklab,var(--ink) 7%,transparent);color:var(--mute);transition:transform .3s cubic-bezier(.3,1.6,.5,1)}
.f-row:hover .f-rank{transform:scale(1.12)}
.f-rank.zone{background:var(--t12);color:var(--accent)}
.f-rank.p1{background:linear-gradient(135deg,var(--m1),var(--m2));color:#1b1405}
.f-rank.p2{background:linear-gradient(135deg,var(--m1),var(--m2));color:#1b1405}
.f-rank.p3{background:linear-gradient(135deg,var(--m1),var(--m2));color:#1b1405}
.f-who{min-width:0;display:flex;flex-direction:column;gap:2px}
.f-who .n{font-weight:600;letter-spacing:.03em;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.f-who .c{font-size:12px;color:var(--faint)}
.f-saved{display:flex;align-items:center;gap:8px;justify-content:flex-end;font-weight:700;font-size:16px}
.f-flag{width:20px;height:20px;border-radius:50%;flex:none;display:inline-grid;place-items:center;overflow:hidden;color:var(--faint)}
.f-cut{display:flex;align-items:center;gap:14px;padding:14px 24px;font-size:13px;font-weight:600;color:var(--accent);background:var(--t8);border-bottom:1px solid var(--hairline)}
.f-cut::before,.f-cut::after{content:"";flex:1;height:1px;background:repeating-linear-gradient(90deg,var(--t35) 0 6px,transparent 6px 12px)}
.f-cut span{text-align:center}
.f-you{position:sticky;bottom:12px;z-index:6;margin:12px;border-radius:18px;overflow:clip;box-shadow:var(--shadow-lg)}
.f-you .tag{position:absolute;top:0;right:16px;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:2px 10px 3px;border-radius:0 0 10px 10px;background:var(--grad);color:var(--accent-ink);z-index:2}
.f-you .f-row{border-bottom:0;background:var(--card);cursor:default}.f-you .f-row:hover{transform:none}
.f-more{display:flex;justify-content:center;padding:24px}
.f-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:0 4px;margin-top:16px;font-size:13px;color:var(--faint)}
.c-mob{display:none}
@media(max-width:1039px){.f-thead,.f-row{grid-template-columns:64px minmax(160px,1.6fr) 92px 78px 140px 120px}.c-turn,.c-trend{display:none}}
@media(max-width:759px){
.f-thead{display:none}
.f-row{grid-template-columns:44px 1fr auto;grid-template-areas:"rank who saved" "rank meta meta";row-gap:8px;padding:14px 16px;min-height:0}
.f-row>.c-rank{grid-area:rank;align-self:start}.f-row>.c-who{grid-area:who}.f-row>.c-saved{grid-area:saved}
.f-row>.c-mv,.f-row>.c-trades,.f-row>.c-seg{display:none}
.c-mob{display:flex;grid-area:meta;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:12px;color:var(--mute)}
.f-cut{padding:12px 16px}
}

/* winners */
.f-wgrid{display:grid;gap:16px}
@media(min-width:960px){.f-wgrid{grid-template-columns:1.25fr 1fr}}
.f-banner{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;justify-content:center;padding:14px 20px;border-radius:999px;margin:0 auto 28px;width:fit-content;max-width:100%;font-size:14px;font-weight:600;text-align:center}
.f-banner.final{background:var(--grad);color:var(--accent-ink);box-shadow:0 14px 40px -14px var(--t60)}
.f-banner.prov{background:var(--t8);border:1px solid var(--t20);color:var(--ink)}
.f-champ{padding:clamp(22px,3vw,36px)}
.f-champ .name{font-size:clamp(28px,4vw,44px);font-weight:700;letter-spacing:-.04em;line-height:1.05;margin-top:12px;overflow-wrap:anywhere}
.f-champ .big{font-size:clamp(40px,6vw,68px);font-weight:700;letter-spacing:-.05em;line-height:1.05;margin-top:20px}
.f-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:24px}
@media(min-width:560px){.f-stats{grid-template-columns:repeat(4,1fr)}}
.f-stat{padding:12px 14px;border-radius:14px;background:var(--bg-alt);border:1px solid var(--hairline)}
.f-stat .l{font-size:10.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.f-stat .v{font-weight:600;font-size:15px;margin-top:4px;overflow-wrap:anywhere}
.f-wlist{display:flex;flex-direction:column;max-height:560px}
.f-wlist ol{overflow:auto;margin:0 -8px;padding:0 8px;flex:1;scrollbar-width:thin;scrollbar-color:var(--hairline-strong) transparent}
.f-wli{display:grid;grid-template-columns:40px 1fr auto;gap:2px 12px;align-items:center;padding:12px 8px;border-bottom:1px solid var(--hairline);border-radius:12px;transition:background-color .2s}
.f-wli:hover{background:var(--t8)}
.f-wli .p{grid-column:2;font-size:12px;color:var(--faint)}
.f-wli .n{font-weight:600;grid-column:2;letter-spacing:.03em;display:flex;align-items:center;gap:8px}
.f-wli .s{grid-row:1/3;grid-column:3;font-weight:700;text-align:right}
.f-wli .f-rank{grid-row:1/3;width:34px;height:34px;font-size:13px}
.f-past{display:grid;gap:16px;margin-top:16px}
@media(min-width:760px){.f-past{grid-template-columns:1fr 1fr}}
.f-past li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--hairline);font-size:14px}
.f-past li:last-child{border-bottom:0}
.f-past .rk{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;margin-right:10px;font-size:12px;font-weight:700;color:#1b1405;background:linear-gradient(135deg,var(--m1),var(--m2))}

/* prizes */
.f-prizes{display:grid;gap:16px}
@media(min-width:900px){.f-prizes{grid-template-columns:repeat(3,1fr)}}
.f-prize{padding:clamp(22px,3vw,32px);display:flex;flex-direction:column;gap:14px;height:100%}
.f-prize .rng{font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}
.f-prize .rw{font-size:clamp(22px,2.4vw,28px);font-weight:600;letter-spacing:-.03em;line-height:1.15}
.f-prize ul{display:grid;gap:10px;color:var(--mute);font-size:15px}
.f-prize li,.f-rules li{display:flex;gap:10px;align-items:flex-start}
.f-prize li svg,.f-rules li svg{flex:none;margin-top:3px;color:var(--accent)}
.f-prize .ft{margin-top:auto;padding-top:16px;border-top:1px solid var(--hairline);font-weight:600;font-size:14px}
.f-gbadge{position:absolute;top:16px;right:16px;z-index:2;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;padding:5px 12px;border-radius:999px;background:var(--grad);color:var(--accent-ink)}
.f-note{margin-top:28px;text-align:center;color:var(--mute);font-size:15px}
.f-note b{color:var(--ink)}

/* how to enter */
.f-steps{display:grid;gap:16px}
@media(min-width:900px){.f-steps{grid-template-columns:340px 1fr;gap:24px}}
.f-stabs{display:flex;flex-direction:column;gap:6px}
.f-stab{position:relative;display:flex;gap:16px;align-items:center;text-align:left;padding:18px 20px 18px 24px;border-radius:18px;min-height:64px;overflow:clip;transition:background-color .25s}
.f-stab:hover{background:var(--t8)}
.f-stab[aria-selected="true"]{background:var(--card);box-shadow:var(--shadow);border:1px solid var(--hairline)}
.f-stab .bar{position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:3px;background:var(--hairline);overflow:hidden}
.f-stab .bar i{position:absolute;inset:0;background:var(--grad);transform:scaleY(0);transform-origin:top}
.f-stab[aria-selected="true"] .bar i{animation:f-fill var(--adv,6s) linear forwards;animation-play-state:var(--ps,running)}
.f-stab .no{font-size:14px;font-weight:600;color:var(--faint);letter-spacing:.06em}
.f-stab[aria-selected="true"] .no{color:var(--accent)}
.f-stab .tt{font-size:20px;font-weight:600;letter-spacing:-.02em;color:var(--mute)}
.f-stab[aria-selected="true"] .tt{color:var(--ink)}
.f-spanel{display:grid;padding:clamp(24px,4vw,44px);min-height:340px}
.f-spanel>div{grid-area:1/1;display:grid;gap:28px;align-items:center;opacity:0;transform:translateY(10px);transition:opacity .5s,transform .5s;pointer-events:none;visibility:hidden}
.f-spanel>div[data-active="true"]{opacity:1;transform:none;pointer-events:auto;visibility:visible}
@media(min-width:700px){.f-spanel>div{grid-template-columns:1fr 1fr}}
.f-spanel h3{font-size:clamp(26px,3.4vw,38px);font-weight:600;letter-spacing:-.04em;margin:10px 0 12px}
.f-spanel p{color:var(--mute);font-size:17px}
.f-spanel .art{display:grid;place-items:center;color:var(--accent)}
.f-rules{display:grid;gap:14px 40px;margin-top:48px}
@media(min-width:760px){.f-rules{grid-template-columns:1fr 1fr}}
.f-rules li{padding:14px 0;border-bottom:1px solid var(--hairline);color:var(--mute);font-size:15px}

/* faq */
.f-faq{max-width:820px;margin:0 auto;display:grid;gap:12px}
.f-qa{border:1px solid var(--hairline);border-radius:20px;background:var(--card);transition:border-color .25s,box-shadow .25s;overflow:clip}
.f-qa[data-open="true"]{border-color:var(--t35);box-shadow:var(--shadow)}
.f-qa button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;text-align:left;padding:20px 24px;min-height:64px;font-weight:600;font-size:17px}
.f-pm{position:relative;width:20px;height:20px;flex:none;color:var(--accent)}
.f-pm::before,.f-pm::after{content:"";position:absolute;left:2px;right:2px;top:9px;height:2px;border-radius:2px;background:currentColor;transition:transform .35s cubic-bezier(.3,.8,.3,1)}
.f-pm::after{transform:rotate(90deg)}
.f-qa[data-open="true"] .f-pm::after{transform:rotate(0)}
.f-qa[data-open="true"] .f-pm::before{transform:rotate(180deg)}
.f-ans{display:grid;grid-template-rows:0fr;transition:grid-template-rows .4s cubic-bezier(.3,.8,.3,1)}
.f-qa[data-open="true"] .f-ans{grid-template-rows:1fr}
.f-ans>div{overflow:hidden}
.f-ans p{padding:0 24px 22px;color:var(--mute);font-size:16px}

/* cta + footer */
.f-cta{position:relative;overflow:clip;isolation:isolate;border-radius:32px;background:var(--grad);color:#fff;text-align:center;padding:clamp(48px,8vw,96px) clamp(20px,5vw,64px);box-shadow:0 40px 90px -30px var(--t60)}
.f-cta h2{font-size:clamp(34px,5.4vw,60px);font-weight:700;letter-spacing:-.045em;max-width:16ch;margin:0 auto;color:#fff}
.f-cta p{margin:16px auto 0;max-width:520px;color:rgba(255,255,255,.88);font-size:17px}
.f-cta .shape{position:absolute;border-radius:50%;filter:blur(40px);z-index:-1;background:rgba(255,255,255,.22);will-change:transform}
.f-cta .s1{width:280px;height:280px;left:-60px;top:-80px;animation:f-drift1 14s ease-in-out infinite alternate}
.f-cta .s2{width:340px;height:340px;right:-80px;bottom:-120px;animation:f-drift2 17s ease-in-out infinite alternate}
.f-cta .s3{width:140px;height:140px;right:22%;top:12%;opacity:.7;animation:f-drift3 12s ease-in-out infinite alternate}
.f-cta small{display:block;margin-top:20px;font-size:14px;color:rgba(255,255,255,.88)}
.f-footer{border-top:1px solid var(--hairline);background:var(--bg-alt);padding:64px 0 32px}
.f-fgrid{display:grid;gap:40px;grid-template-columns:1fr 1fr}
.f-fgrid>:first-child{grid-column:1/-1}
@media(min-width:900px){.f-fgrid{grid-template-columns:1.6fr 1fr 1fr 1.2fr}.f-fgrid>:first-child{grid-column:auto}}
.f-footer h4{font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--faint);margin-bottom:14px}
.f-footer li a{display:inline-block;padding:7px 0;color:var(--mute);font-size:15px;transition:color .2s}
.f-footer li a:hover{color:var(--accent)}
.f-footer li{color:var(--mute);font-size:15px;padding:7px 0}
.f-footer li span{display:block;font-size:12px;color:var(--faint)}
.f-disc{margin-top:40px;padding-top:24px;border-top:1px solid var(--hairline);font-size:13px;color:var(--mute);line-height:1.6;max-width:900px}
.f-fbot{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-top:24px;font-size:13px;color:var(--faint)}

/* theme studio */
.f-studio{position:fixed;left:16px;bottom:16px;z-index:80;padding:14px;border-radius:20px;background:var(--card);border:1px solid var(--hairline-strong);box-shadow:var(--shadow-lg);display:grid;gap:10px;font-size:12px;font-weight:600;width:230px}
.f-studio .sw{display:flex;gap:8px;flex-wrap:wrap}
.f-studio .sw button{width:30px;height:30px;border-radius:50%;border:2px solid var(--card);box-shadow:0 0 0 1px var(--hairline-strong)}
.f-studio label{display:flex;justify-content:space-between;align-items:center;color:var(--mute)}
.f-studio input[type=color]{width:44px;height:30px;border:0;background:none;padding:0;cursor:pointer}

/* keyframes */
@keyframes f-ping{0%{transform:scale(1);opacity:.6}80%,100%{transform:scale(2.8);opacity:0}}
@keyframes f-drift1{to{transform:translate3d(90px,60px,0) scale(1.12)}}
@keyframes f-drift2{to{transform:translate3d(-80px,70px,0) scale(.92)}}
@keyframes f-drift3{to{transform:translate3d(60px,-70px,0) scale(1.18)}}
@keyframes f-wordin{to{transform:translateY(0)}}
@keyframes f-fadeup{to{opacity:1;transform:none}}
@keyframes f-scroll{to{transform:translateX(-50%)}}
@keyframes f-shimmer{to{background-position:-300% 0}}
@keyframes f-rowin{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes f-crown{0%{transform:translateY(-60px);opacity:0}60%{opacity:1}100%{transform:translateY(-14px);opacity:1}}
@keyframes f-breathe{0%,100%{opacity:.55;transform:scale(.94)}50%{opacity:1;transform:scale(1.06)}}
@keyframes f-shine{0%,70%{transform:translateX(-160%) skewX(-18deg)}100%{transform:translateX(420%) skewX(-18deg)}}
@keyframes f-pulse1{0%{transform:scale(.6)}50%{transform:scale(1.4)}100%{transform:scale(1)}}
@keyframes f-fill{to{transform:scaleY(1)}}

@media(prefers-reduced-motion:reduce){
html{scroll-behavior:auto}
.fogm *,.fogm *::before,.fogm *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;animation-delay:0ms!important}
.f-track{animation:none!important}
.rv,.rv[data-v]{transform:none!important;filter:none!important;transition:opacity .6s!important}
.st{transform:none!important;transition:opacity .6s!important}
.f-ped{transform:none!important;transition:none!important}
.f-crown{transform:translateY(-14px)!important;opacity:1!important;animation:none!important}
.f-word>span{transform:none!important}
.f-draw{transition:none!important;stroke-dashoffset:0!important}
.f-bar i,.f-segbar i{transition:none!important}
.f-blob,.f-cta .shape{animation:none!important}
}
`;

const NOSCRIPT_CSS = `.rv,.st,.row-st{opacity:1!important;transform:none!important;filter:none!important}.f-ped{transform:none!important}.f-draw{stroke-dashoffset:0!important}.f-bar i{transform:scaleX(var(--p,0))!important}.f-segbar i{transform:scaleX(var(--p,0))!important}`;

/** Runs before first paint (inline in SSR HTML): system preference first, then a saved choice. */
const THEME_BOOT = `try{var s=localStorage.getItem('fogm-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;

/* ═══════════════════════════ FONTS ══════════════════════════════════════ */
const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const fontBody = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-body",
  display: "swap",
});

/* ═══════════════════════════ FORMAT CONTEXT ═════════════════════════════
 * All money goes through here, using the competition's currency + locale.
 * No currency symbol or locale is hardcoded in the UI.
 * ════════════════════════════════════════════════════════════════════════ */
interface Fmt {
  money: (n: number) => string;
  compact: (n: number) => string;
  num: (n: number) => string;
  date: (iso: string, o?: Intl.DateTimeFormatOptions) => string;
}
function makeFmt(cur?: Competition["currency"]): Fmt {
  const opts = cur ? { code: cur.code, locale: cur.locale } : undefined;
  return {
    money: (n) => formatINR(n, opts),
    compact: (n) => formatCompactINR(n, opts),
    num: (n) => formatNumber(n, cur?.locale),
    date: (iso, o) =>
      new Intl.DateTimeFormat(cur?.locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC", ...o }).format(new Date(iso)),
  };
}
const FmtCtx = createContext<Fmt>(makeFmt());
const useFmt = () => useContext(FmtCtx);

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

type RevealVariant = "up" | "fade" | "scale" | "left" | "right";
/** Fade + translate + blur-to-sharp when scrolled into view. `stagger` makes `.st` children cascade (60–90ms). */
function Reveal({
  variant = "up",
  delay = 0,
  className = "",
  style,
  children,
}: {
  variant?: RevealVariant;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [ref, seen] = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-v={variant}
      className={`rv${seen ? " in" : ""} ${className}`}
      style={{ "--d": `${delay}ms`, ...style } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Container that only toggles `.in` (children use .st / .row-st / .f-draw / etc.). */
function InView({
  className = "",
  style,
  children,
  threshold,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  threshold?: number;
}) {
  const [ref, seen] = useReveal<HTMLDivElement>(threshold);
  return (
    <div ref={ref} className={`${className}${seen ? " in" : ""}`} style={style}>
      {children}
    </div>
  );
}

/** easeOutExpo count-up (~1.4s) that starts when scrolled into view. */
function CountUp({
  value,
  format,
  duration = 1400,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
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
    <span ref={ref} className={className}>
      {format(Math.round(shown))}
    </span>
  );
}

/** Cursor-follow spotlight: sets --mx/--my for `.f-spot::before`. */
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

/** Infinite marquee: renders children twice and scrolls -50%. */
function Track({ children, dur = 60, label }: { children: ReactNode; dur?: number; label?: string }) {
  return (
    <div className="f-track" style={{ "--dur": `${dur}s` } as CSSProperties} aria-label={label}>
      <div style={{ display: "flex" }}>{children}</div>
      <div style={{ display: "flex" }} aria-hidden="true">
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
};
function Icon({ name, size = 18, stroke = 2 }: { name: keyof typeof ICONS; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

function LogoGlyph({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="currentColor" />
      <path d="M9 21.5 15 15l3.5 3.5L24 11" stroke="var(--accent-ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 11H24v5.5" stroke="var(--accent-ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Crown() {
  return (
    <svg className="f-crown" viewBox="0 0 44 36" fill="currentColor" aria-hidden="true">
      <path d="M4 30 2 10l10 9L22 3l10 16 10-9-2 20Z" />
      <rect x="4" y="31" width="36" height="4" rx="2" />
    </svg>
  );
}

function Flag({ code, size = 20 }: { code: string; size?: number }) {
  const id = useId();
  if (code === "IN") {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" aria-label="India" role="img" style={{ borderRadius: "50%", flex: "none" }}>
        <defs>
          <clipPath id={id}>
            <circle cx="10" cy="10" r="10" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          <rect width="20" height="7" y="0" fill="#ff9933" />
          <rect width="20" height="6.5" y="6.7" fill="#ffffff" />
          <rect width="20" height="7" y="13" fill="#138808" />
          <circle cx="10" cy="10" r="2.1" fill="none" stroke="#000080" strokeWidth=".9" />
        </g>
      </svg>
    );
  }
  return (
    <span style={{ display: "inline-grid", placeItems: "center", color: "var(--faint)" }} title={code} role="img" aria-label={code}>
      <Icon name="globe" size={size} stroke={1.8} />
    </span>
  );
}

function Movement({ movement, previousRank }: { movement: number; previousRank: number | null }) {
  if (previousRank === null) return <span className="f-pill acc" style={{ fontSize: 11 }}>NEW</span>;
  if (movement === 0) return <span className="f-mv flat" aria-label="No change">–</span>;
  const up = movement > 0;
  return (
    <span className={`f-mv ${up ? "up" : "down"}`} aria-label={`${up ? "Up" : "Down"} ${Math.abs(movement)} places`}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" style={up ? undefined : { transform: "rotate(180deg)" }}>
        <path d="M5 1 9.5 9h-9z" />
      </svg>
      {Math.abs(movement)}
    </span>
  );
}

function InfoTip({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <span ref={ref} className="f-tipwrap" data-open={open} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="f-tipbtn" aria-label={label} aria-expanded={open} aria-describedby={id} onClick={() => setOpen((o) => !o)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        i
      </button>
      <span role="tooltip" id={id} className="f-tippop">
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
/** Smooth path through points with control-point y clamped (no overshoot on monotone data). */
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
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

function AreaChart({
  labels,
  values,
  formatY,
  formatTip,
  height = 240,
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
  const wrap = useRef<HTMLDivElement | null>(null);
  const w = useWidth(wrap, 640);
  const [ref, seen] = useReveal<HTMLDivElement>(0.2);
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 54, r: 14, t: 14, b: 30 };
  const iw = Math.max(w - pad.l - pad.r, 40);
  const ih = height - pad.t - pad.b;
  const max = niceMax(Math.max(...values, 1) * 1.05);
  const pts: Pt[] = values.map((v, i) => ({
    x: pad.l + (values.length === 1 ? iw / 2 : (i / (values.length - 1)) * iw),
    y: pad.t + ih - (v / max) * ih,
  }));
  const line = smoothPath(pts);
  const area = `${line}L${pts[pts.length - 1].x.toFixed(1)} ${pad.t + ih}L${pts[0].x.toFixed(1)} ${pad.t + ih}Z`;
  const ticks = [0, 1, 2, 3, 4].map((k) => ({ v: (max * k) / 4, y: pad.t + ih - (k / 4) * ih }));
  const xi = [0, Math.floor((labels.length - 1) / 2), labels.length - 1];
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = (e.clientX - r.left - pad.l) / iw;
    setHover(Math.max(0, Math.min(values.length - 1, Math.round(t * (values.length - 1)))));
  };
  return (
    <div
      ref={(n) => {
        wrap.current = n;
        ref.current = n;
      }}
      className={`f-chartbox${seen ? " in" : ""}`}
      onPointerMove={move}
      onPointerLeave={() => setHover(null)}
    >
      <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.32 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={t.y} y2={t.y} stroke="var(--hairline)" strokeDasharray={i === 0 ? undefined : "3 5"} />
            <text x={pad.l - 10} y={t.y + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--faint)" }}>
              {formatY(t.v)}
            </text>
          </g>
        ))}
        {xi.map((i, k) => (
          <text key={k} x={pts[i].x} y={height - 8} textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"} fontSize="11" style={{ fill: "var(--faint)" }}>
            {labels[i]}
          </text>
        ))}
        <path className="f-areafill" d={area} fill={`url(#${gid})`} />
        <path className="f-draw" d={line} pathLength={1} fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null && (
          <g>
            <line x1={pts[hover].x} x2={pts[hover].x} y1={pad.t} y2={pad.t + ih} stroke="var(--t35)" />
            <circle cx={pts[hover].x} cy={pts[hover].y} r="5" fill="var(--card)" stroke="var(--accent)" strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="f-ctip" style={{ left: Math.min(Math.max(pts[hover].x, 70), w - 70), top: pts[hover].y }}>
          {formatTip(hover)}
        </div>
      )}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const W = 96;
  const H = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts: Pt[] = values.map((v, i) => ({ x: 2 + (i / (values.length - 1)) * (W - 4), y: H - 3 - ((v - min) / span) * (H - 6) }));
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <path className="f-draw" d={smoothPath(pts)} pathLength={1} fill="none" stroke={up ? "var(--up)" : "var(--down)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function Sk({ w = "100%", h = 16, r, style }: { w?: number | string; h?: number | string; r?: number; style?: CSSProperties }) {
  return <div className="sk" aria-hidden="true" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function ErrorBox({ message, onRetry, what }: { message: string | null; onRetry: () => void; what: string }) {
  return (
    <div className="f-err" role="alert">
      <b>Couldn&apos;t load {what}</b>
      <span>{message ?? "Something went wrong."}</span>
      <button type="button" className="f-btn ghost sm" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function Async<T>({
  res,
  what,
  onRetry,
  skeleton,
  isEmpty,
  emptyText,
  children,
}: {
  res: Res<T>;
  what: string;
  onRetry: () => void;
  skeleton: ReactNode;
  isEmpty?: (d: T) => boolean;
  emptyText?: string;
  children: (d: T) => ReactNode;
}) {
  if (res.state === "error" && !res.data) return <ErrorBox message={res.error} onRetry={onRetry} what={what} />;
  if (!res.data) return <>{skeleton}</>;
  if (isEmpty?.(res.data))
    return (
      <div className="f-empty">
        <b>Nothing here yet</b>
        {emptyText ?? `No ${what} to show right now.`}
      </div>
    );
  return <>{children(res.data)}</>;
}

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

function useLandingData() {
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
    [period, dq, limit, key],
  );

  useEffect(() => {
    void loadBoard(false);
    const id = setInterval(() => void loadBoard(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [loadBoard]);

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

/* ═══════════════════════════ SMALL SHARED BITS ══════════════════════════ */
type Landing = ReturnType<typeof useLandingData>;

function useNow(ms: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function Ago({ iso }: { iso: string }) {
  const now = useNow(15000);
  return <>{timeAgo(iso, now ?? undefined)}</>;
}

function combine<A, B>(a: Res<A>, b: Res<B>): Res<[A, B]> {
  if (a.data && b.data) return { state: "ready", data: [a.data, b.data], error: null };
  if (a.state === "error" || b.state === "error") return { state: "error", data: null, error: a.error ?? b.error };
  return loadingRes();
}

const STATUS_LABEL: Record<ContestStatus, { badge: string; pill: string }> = {
  upcoming: { badge: "Starting soon", pill: "UPCOMING" },
  registration_open: { badge: "Registration open", pill: "REGISTRATION OPEN" },
  active: { badge: "Live · Contest running", pill: "ACTIVE" },
  ended: { badge: "Contest ended", pill: "ENDED" },
  winners_declared: { badge: "Winners declared", pill: "WINNERS DECLARED" },
};

function Section({
  id,
  alt,
  label,
  children,
}: {
  id: string;
  alt?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`f-sec${alt ? " alt" : ""}`} aria-labelledby={`${id}-title`}>
      <div className="f-wrap" data-label={label}>
        {children}
      </div>
    </section>
  );
}

function SectionHead({
  id,
  eyebrow,
  title,
  sub,
  center,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  center?: boolean;
}) {
  return (
    <Reveal className={`f-head${center ? " center" : ""}`}>
      <span className="f-eyebrow">{eyebrow}</span>
      <h2 id={`${id}-title`} className="f-title f-display">
        {title}
      </h2>
      {sub && <p className="f-sub">{sub}</p>}
    </Reveal>
  );
}

/* ═══════════════════════════ NAV ════════════════════════════════════════ */
function ThemeToggle({ mode, onToggle }: { mode: "light" | "dark"; onToggle: () => void }) {
  return (
    <button type="button" className="f-iconbtn f-theme" onClick={onToggle} aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      <svg className="sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={ICONS.sun} />
      </svg>
      <svg className="moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={ICONS.moon} />
      </svg>
    </button>
  );
}

function Nav({ mode, onToggle, declared }: { mode: "light" | "dark"; onToggle: () => void; declared: boolean }) {
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
    <header className={`f-nav${scrolled || open ? " scrolled" : ""}`}>
      <div className="f-wrap f-nav-in">
        <a href="#top" className="f-logo f-display" aria-label={`${BRAND.name} home`}>
          <LogoGlyph />
          {BRAND.name}
        </a>
        <nav className="f-links" aria-label="Primary">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="f-nav-cta">
          <ThemeToggle mode={mode} onToggle={onToggle} />
          <a href={URLS.login} className="f-btn ghost sm">
            Log in
          </a>
          <a href={URLS.join} className="f-btn primary sm">
            Join the pool
          </a>
        </div>
        <div style={{ display: "flex", gap: 8 }} className="f-burger">
          <ThemeToggle mode={mode} onToggle={onToggle} />
          <button type="button" className="f-iconbtn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? "x" : "menu"} />
          </button>
        </div>
      </div>
      <div id="mobile-menu" className="f-sheet" data-open={open} aria-hidden={!open}>
        {links.map((l) => (
          <a key={l.href} className="l" href={l.href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
            {l.label}
          </a>
        ))}
        <div className="row">
          <a href={URLS.login} className="f-btn ghost" tabIndex={open ? 0 : -1}>
            Log in
          </a>
          <a href={URLS.join} className="f-btn primary" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
            Join the pool
          </a>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════ HERO ═══════════════════════════════════════ */
function Word({ i, grad, children }: { i: number; grad?: boolean; children: ReactNode }) {
  return (
    <span className="f-word">
      <span className={grad ? "f-gradtext" : undefined} style={{ "--w": i } as CSSProperties}>
        {children}
      </span>
    </span>
  );
}

function Countdown({ target, label }: { target: string; label: string }) {
  const now = useNow(1000);
  const ms = now === null ? null : Math.max(0, Date.parse(target) - now);
  const minuteKey = ms === null ? -1 : Math.floor(ms / 60000);
  // screen-reader text only changes once a minute (polite + throttled)
  const live = useMemo(() => {
    if (minuteKey < 0) return "";
    const d = Math.floor(minuteKey / 1440);
    const h = Math.floor((minuteKey % 1440) / 60);
    const m = minuteKey % 60;
    return `${label}: ${d} days, ${h} hours, ${m} minutes`;
  }, [minuteKey, label]);
  const total = ms === null ? 0 : Math.floor(ms / 1000);
  const parts = [
    { v: Math.floor(total / 86400), u: "Days" },
    { v: Math.floor((total % 86400) / 3600), u: "Hours" },
    { v: Math.floor((total % 3600) / 60), u: "Mins" },
    { v: total % 60, u: "Secs" },
  ];
  return (
    <div className="f-count f-heroin" style={{ "--hd": "1450ms" } as CSSProperties}>
      <span className="lbl">{label}</span>
      <div className="f-cd" aria-hidden="true">
        {parts.map((p) => (
          <div key={p.u}>
            <b className="f-display">{ms === null ? "––" : String(p.v).padStart(2, "0")}</b>
            <span>{p.u}</span>
          </div>
        ))}
      </div>
      <span className="f-sr" aria-live="polite" role="timer">
        {live}
      </span>
    </div>
  );
}

function TickerItem({ a }: { a: ActivityItem }) {
  const f = useFmt();
  const icon = a.kind === "saving" ? "bolt" : a.kind === "rank_up" ? "up" : "userplus";
  return (
    <span className="f-tk">
      <i>
        <Icon name={icon} size={13} />
      </i>
      <b>{a.maskedName}</b>
      {a.kind === "saving" && (
        <>
          saved <span className="amt">{f.money(a.amount)}</span> on {a.segment}
        </>
      )}
      {a.kind === "rank_up" && <>climbed the board in {a.segment}</>}
      {a.kind === "joined" && <>joined the pool · {a.segment}</>}
      <span style={{ color: "var(--faint)" }}>· {timeAgo(a.at)}</span>
    </span>
  );
}

function Hero({ d }: { d: Landing }) {
  const f = useFmt();
  const now = useNow(60000);
  const c = d.competition.data;
  const p = d.pool.data;
  const status = c?.status;
  const ended = status === "ended" || status === "winners_declared";
  let daysLeft: number | null = null;
  if (c && now !== null) daysLeft = Math.max(0, Math.ceil((Date.parse(c.endsAt) - now) / 86400000));
  const countdown =
    c && !ended
      ? status === "registration_open"
        ? { t: c.registrationClosesAt, l: "Registration closes in" }
        : status === "upcoming"
          ? { t: c.startsAt, l: "Contest starts in" }
          : { t: c.endsAt, l: "Contest ends in" }
      : null;
  const hd = (ms: number) => ({ "--hd": `${ms}ms` }) as CSSProperties;

  return (
    <section id="top" className="f-hero" aria-label="Introduction">
      <div className="f-mesh" aria-hidden="true">
        <div className="f-grid" />
        <div className="f-blob a" />
        <div className="f-blob b" />
        <div className="f-blob c" />
      </div>
      <div className="f-wrap">
        <div className="f-heroin" style={hd(0)}>
          {c ? (
            <span className="f-badge">
              <span className={`f-dot${status === "active" || status === "registration_open" ? "" : " off"}`} />
              {STATUS_LABEL[c.status].badge}
            </span>
          ) : d.competition.state === "error" ? (
            <span className="f-badge">{BRAND.tagline}</span>
          ) : (
            <Sk w={190} h={38} r={999} style={{ margin: "0 auto" }} />
          )}
        </div>

        <h1 className="f-h1 f-display">
          <span className="f-line">
            <Word i={0}>Trade</Word> <Word i={1}>smart.</Word>
          </span>
          <span className="f-line">
            <Word i={2}>Climb</Word> <Word i={3}>the</Word> <Word i={4} grad>Board!</Word>
          </span>
        </h1>

        <div className="f-herosub f-heroin" style={hd(1000)}>
          {c ? c.subtitle : d.competition.state === "error" ? "Trade as you normally do and climb the leaderboard." : (
            <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
              <Sk w="92%" h={16} />
              <Sk w="64%" h={16} />
            </div>
          )}
        </div>

        <div className="f-ctas f-heroin" style={hd(1150)}>
          {ended ? (
            <a href="#winners" className="f-btn primary">
              {status === "winners_declared" ? "See the winners" : "See the final standings"}
            </a>
          ) : (
            <a href={URLS.join} className="f-btn primary">
              Join the pool
            </a>
          )}
          <a href="#leaderboard" className="f-btn ghost">
            View leaderboard
          </a>
        </div>

        <div className="f-spec f-heroin" style={hd(1300)} role="group" aria-label="Contest at a glance">
          <SpecItem label="Pool size" loading={!p}>
            {p && <CountUp value={p.poolSize} format={f.compact} />}
          </SpecItem>
          <SpecItem label="Traders enrolled" loading={!p}>
            {p && (
              <>
                <CountUp value={p.tradersEnrolled} format={f.num} />
              </>
            )}
          </SpecItem>
          <SpecItem label="Brokerage saved so far" loading={!p}>
            {p && <CountUp value={p.used} format={f.money} />}
          </SpecItem>
          <SpecItem label="Days left" loading={!c || daysLeft === null} unit={ended || daysLeft === 0 ? undefined : "days"}>
            {c && daysLeft !== null && (ended || daysLeft === 0 ? "Ended" : <CountUp value={daysLeft} format={(n) => String(n)} duration={1200} />)}
          </SpecItem>
        </div>

        {countdown && <Countdown target={countdown.t} label={countdown.l} />}
      </div>

      <div className="f-ticker f-heroin" style={hd(1600)} role="region" aria-label="Live activity">
        <Async
          res={d.activity}
          what="activity"
          onRetry={() => d.retry("activity")}
          skeleton={<div style={{ display: "flex", gap: 24, padding: "0 28px", width: "100%" }}><Sk w={260} h={20} /><Sk w={220} h={20} /><Sk w={280} h={20} /><Sk w={240} h={20} /></div>}
          isEmpty={(a) => a.length === 0}
          emptyText="Activity will show up here as traders save."
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
    </section>
  );
}

function SpecItem({ label, unit, loading, children }: { label: string; unit?: string; loading: boolean; children: ReactNode }) {
  return (
    <div className="f-spec-item">
      <div className="f-spec-num f-display">
        {loading ? (
          <Sk w="60%" h={40} style={{ margin: "0 auto" }} />
        ) : (
          <>
            {children}
            {unit && <small>{unit}</small>}
          </>
        )}
      </div>
      <div className="f-spec-label">{label}</div>
    </div>
  );
}

/* ═══════════════════════════ POOL OVERVIEW ══════════════════════════════ */
function Tile({ label, i, small, children }: { label: string; i: number; small?: boolean; children: ReactNode }) {
  return (
    <div className={`f-tile f-spot st${small ? " sm" : ""}`} style={{ "--i": i } as CSSProperties} onPointerMove={onSpot}>
      <div className="l">{label}</div>
      <div className="v f-display">{children}</div>
    </div>
  );
}

function PoolSection({ d }: { d: Landing }) {
  const f = useFmt();
  const head = combine(d.competition, d.pool);
  return (
    <Section id="pool" alt label="Pool overview">
      <SectionHead id="pool" eyebrow="The pool" title="Where the money goes" sub="A fixed pool refunds trading brokerage to participants until it runs out. Here is how much has been used so far." />
      <Reveal variant="up">
        <div className="f-card pad f-wash">
          <Async
            res={head}
            what="pool overview"
            onRetry={() => {
              d.retry("competition");
              d.retry("pool");
            }}
            skeleton={
              <div style={{ display: "grid", gap: 16 }}>
                <Sk w="50%" h={34} />
                <Sk h={14} r={999} />
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Sk key={i} h={84} r={14} />
                  ))}
                </div>
              </div>
            }
          >
            {([c, p]) => (
              <InView>
                <div className="f-pool-head">
                  <h3 className="f-pool-title f-display">
                    {c.title}
                    <span className="f-pill acc" style={{ letterSpacing: ".12em" }}>
                      <span className={`f-dot${c.status === "active" || c.status === "registration_open" ? "" : " off"}`} />
                      {STATUS_LABEL[c.status].pill}
                    </span>
                  </h3>
                  <span className="f-dates">
                    {f.date(c.startsAt)} – {f.date(c.endsAt)}
                  </span>
                </div>

                <div className="f-used">
                  <span>
                    <b className="f-display">
                      <CountUp value={p.used} format={f.money} />
                    </b>{" "}
                    of {f.money(p.poolSize)} used
                  </span>
                  <span>
                    <b className="f-display">{p.usedPct.toFixed(2)}%</b> of the pool
                  </span>
                </div>
                <div className="f-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.usedPct * 100) / 100} aria-label="Pool used" style={{ "--p": Math.max(p.usedPct / 100, 0.012) } as CSSProperties}>
                  <i />
                </div>

                <div className="f-tiles t5">
                  <Tile label="Pool size" i={0}>
                    <CountUp value={p.poolSize} format={f.compact} />
                  </Tile>
                  <Tile label="Used" i={1}>
                    <CountUp value={p.used} format={f.money} />
                  </Tile>
                  <Tile label="Remaining" i={2}>
                    <CountUp value={p.remaining} format={f.money} />
                  </Tile>
                  <Tile label="Traders enrolled" i={3}>
                    <CountUp value={p.tradersEnrolled} format={f.num} />
                  </Tile>
                  <Tile label="Traders benefited" i={4}>
                    <CountUp value={p.tradersBenefited} format={f.num} />
                  </Tile>
                </div>
                <div className="f-tiles t4" style={{ marginTop: 12 }}>
                  <Tile small label="Total trades" i={5}>
                    <CountUp value={p.totalTrades} format={f.num} />
                  </Tile>
                  <Tile small label="Total turnover" i={6}>
                    <CountUp value={p.totalTurnover} format={f.compact} />
                  </Tile>
                  <Tile small label="Avg saved / beneficiary" i={7}>
                    <CountUp value={p.avgSavedPerBeneficiary} format={f.money} />
                  </Tile>
                  <Tile small label="Largest single saving" i={8}>
                    <CountUp value={p.largestSingleSaving} format={f.money} />
                  </Tile>
                </div>

                <div className="f-info">
                  <Icon name="info" size={18} />
                  <span>
                    <b>{c.metricLabel}.</b> {c.metricHelp}
                  </span>
                </div>
              </InView>
            )}
          </Async>
        </div>
      </Reveal>

      <div className="f-grid2">
        <Reveal variant="left">
          <div className="f-card pad" style={{ height: "100%" }}>
            <h3 className="f-h3 f-display">Pool used over time</h3>
            <p className="f-h3sub">Cumulative brokerage refunded, last 14 days</p>
            <Async
              res={d.history}
              what="pool history"
              onRetry={() => d.retry("history")}
              skeleton={<Sk h={240} r={16} style={{ marginTop: 16 }} />}
              isEmpty={(h) => h.length < 2}
            >
              {(h) => (
                <AreaChart
                  labels={h.map((x) => f.date(x.date, { day: "numeric", month: "short", year: undefined }))}
                  values={h.map((x) => x.used)}
                  formatY={f.compact}
                  formatTip={(i) => `${f.date(h[i].date, { day: "numeric", month: "short", year: undefined })} · ${f.money(h[i].used)}`}
                  ariaLabel={`Area chart of cumulative pool used, from ${f.money(h[0].used)} to ${f.money(h[h.length - 1].used)}`}
                />
              )}
            </Async>
          </div>
        </Reveal>
        <Reveal variant="right">
          <div className="f-card pad" style={{ height: "100%" }}>
            <h3 className="f-h3 f-display">Saved by segment</h3>
            <p className="f-h3sub">Where the refunds are coming from</p>
            <div style={{ marginTop: 22 }}>
              <Async
                res={d.segments}
                what="segment breakdown"
                onRetry={() => d.retry("segments")}
                skeleton={
                  <div style={{ display: "grid", gap: 22 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <Sk key={i} h={36} />
                    ))}
                  </div>
                }
                isEmpty={(s) => s.length === 0}
              >
                {(segs) => (
                  <InView>
                    {segs.map((s, i) => (
                      <div className="f-segrow" key={s.segment}>
                        <div className="top">
                          <span>{s.segment}</span>
                          <span>
                            {f.money(s.saved)} · {s.sharePct}%
                          </span>
                        </div>
                        <div className="f-segbar" style={{ "--p": s.sharePct / 100, "--i": i } as CSSProperties}>
                          <i />
                        </div>
                      </div>
                    ))}
                  </InView>
                )}
              </Async>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ═══════════════════════════ MARQUEE ════════════════════════════════════ */
function MarqueeStrip({ declared }: { declared: boolean }) {
  const words = ["LEADERBOARD", declared ? "WINNERS" : "LEADERS", "PRIZES", "RANKINGS"];
  const set = (
    <>
      {words.map((w) => (
        <span key={w} style={{ display: "inline-flex" }}>
          <span className="f-display mw w">{w}</span>
          <span className="f-display mw dotm">•</span>
        </span>
      ))}
    </>
  );
  return (
    <div className="f-marq" aria-hidden="true">
      <Track dur={44}>
        {set}
        {set}
      </Track>
    </div>
  );
}

/* ═══════════════════════════ LEADERBOARD ════════════════════════════════ */
const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "overall", label: "Overall" },
];

function Podium({ entries, heading, tiers, declared }: { entries: LeaderboardEntry[]; heading: string; tiers: PrizeTier[] | null; declared: boolean }) {
  const f = useFmt();
  const top = entries.slice(0, 3);
  if (top.length < 3) return null;
  return (
    <div className="f-podium-wrap">
      <div className="f-podium-label">
        <Icon name="trophy" size={16} />
        {heading}
      </div>
      <InView className="f-podium" threshold={0.25}>
        {top.map((e) => {
          const prize = tiers?.find((t) => t.id === e.prizeTierId)?.reward;
          return (
            <div key={e.rank} className={`f-pcol p${e.rank}`}>
              <div className="f-pcard">
                {e.rank === 1 && (
                  <>
                    <div className="f-spotlight" aria-hidden="true" />
                    <Crown />
                    <div className="f-shine" aria-hidden="true" />
                  </>
                )}
                <div className="f-avatar" aria-label={`Rank ${e.rank}`}>
                  {e.rank}
                  <span className="f-flagb">
                    <Flag code={e.countryCode} size={22} />
                  </span>
                </div>
                <div className="info">
                  <div className="f-pname">{e.maskedName}</div>
                  <div className="f-pcity">{e.city}</div>
                  <div className="f-psaved f-display">
                    <CountUp value={e.brokerageSaved} format={f.money} />
                  </div>
                  {prize && <span className="f-pchip">{prize}</span>}
                  <Movement movement={e.movement} previousRank={e.previousRank} />
                </div>
              </div>
              <div className="f-ped" aria-hidden="true">
                <b className="f-display">{e.rank}</b>
              </div>
            </div>
          );
        })}
      </InView>
      <span className="f-sr">{declared ? "Final podium" : "Provisional podium"}</span>
    </div>
  );
}

function Row({ e, i, chip, plain }: { e: LeaderboardEntry; i: number; chip?: string; plain?: boolean }) {
  const f = useFmt();
  const medal = e.rank <= 3 ? ` p${e.rank}` : e.inWinningZone ? " zone" : "";
  return (
    <div role="row" className={`f-row${plain ? "" : " row-st"}${e.inWinningZone ? " zone" : ""}${e.isYou ? " you" : ""}`} style={{ "--i": i } as CSSProperties}>
      <div role="cell" className="c-rank">
        <span className={`f-rank${medal}`}>{e.rank}</span>
      </div>
      <div role="cell" className="c-who f-who">
        <span className="n">
          {e.maskedName}
          {e.isYou && <span className="f-pill acc">You</span>}
          {e.inWinningZone && e.rank > 3 && chip && <span className="f-pill acc">{chip}</span>}
        </span>
        <span className="c">{e.city}</span>
      </div>
      <div role="cell" className="c-mv">
        <Movement movement={e.movement} previousRank={e.previousRank} />
      </div>
      <div role="cell" className="c-trades">
        {f.num(e.tradesCount)}
      </div>
      <div role="cell" className="c-turn">
        {f.compact(e.turnover)}
      </div>
      <div role="cell" className="c-seg">
        <span className="f-pill mute">{e.topSegment}</span>
      </div>
      <div role="cell" className="c-trend">
        <Sparkline values={e.trend} />
      </div>
      <div role="cell" className="c-saved f-saved">
        <span>{f.money(e.brokerageSaved)}</span>
        <Flag code={e.countryCode} />
      </div>
      <div className="c-mob">
        <Movement movement={e.movement} previousRank={e.previousRank} />
        <span>{f.num(e.tradesCount)} trades</span>
        <span className="f-pill mute">{e.topSegment}</span>
      </div>
    </div>
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
  const chipFor = (e: LeaderboardEntry) => tiers?.find((t) => t.id === e.prizeTierId)?.label === "Laptop" ? "Laptop" : (tiers?.find((t) => t.id === e.prizeTierId)?.reward ?? "Laptop");

  return (
    <Section id="leaderboard" alt label="Leaderboard">
      <SectionHead
        id="leaderboard"
        eyebrow="Leaderboard"
        title={
          <>
            Who&apos;s climbing the <span className="f-gradtext">Board</span>
          </>
        }
        sub={
          <>
            Ranked by <b style={{ color: "var(--ink)" }}>{metric}</b>: the brokerage refunded to each trader from the pool.{" "}
            {declared ? "Final standings are verified and locked." : "Ranks 1 to 20 are the winning zone. They are current leaders until winners are declared."}
          </>
        }
      />

      <Reveal>
        <div className="f-controls">
          <div className="f-tabs" role="tablist" aria-label="Leaderboard period" ref={tabsRef} onKeyDown={onTabKey}>
            <span className="f-ind" aria-hidden="true" style={{ transform: `translateX(${idx * 100}%)` }} />
            {PERIODS.map((p) => (
              <button key={p.id} type="button" role="tab" id={`tab-${p.id}`} aria-selected={d.period === p.id} aria-controls="board-panel" tabIndex={d.period === p.id ? 0 : -1} className="f-tab" onClick={() => d.setPeriod(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="f-search">
            <Icon name="search" size={18} />
            <input type="search" value={d.search} onChange={(e) => d.setSearch(e.target.value)} placeholder="Search masked name, e.g. SU****AR" aria-label="Search leaderboard by masked name" autoComplete="off" spellCheck={false} />
            {d.search && (
              <button type="button" className="clr" aria-label="Clear search" onClick={() => d.setSearch("")}>
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        </div>
      </Reveal>

      <div id="board-panel" role="tabpanel" aria-labelledby={`tab-${d.period}`} aria-busy={busy || d.board.state === "loading"}>
        <Async
          res={stale ? { state: "loading", data: null, error: null } : d.board}
          what="the leaderboard"
          onRetry={d.retryBoard}
          skeleton={
            <>
              <div className="f-podium-wrap" style={{ minHeight: 360 }}>
                <div className="f-podium">
                  {[0, 1, 2].map((i) => (
                    <Sk key={i} h={i === 1 ? 260 : 200} r={24} />
                  ))}
                </div>
              </div>
              <div className="f-card pad" style={{ display: "grid", gap: 14 }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Sk key={i} h={48} />
                ))}
              </div>
            </>
          }
        >
          {(b) => (
            <>
              <div className="f-meta">
                <span aria-live="polite">
                  <b style={{ color: "var(--ink)" }}>{f.num(b.page.total)}</b> {b.page.total === 1 ? "trader" : "traders"}
                  {d.query ? <> match &ldquo;{d.query}&rdquo;</> : " ranked"}
                </span>
                <span>
                  <span className="f-dot" style={{ display: "inline-block", marginRight: 8 }} aria-hidden="true" />
                  Last updated <Ago iso={b.page.updatedAt} />
                </span>
              </div>

              <Podium key={b.key.split("|")[0]} entries={b.top3} heading={d.winners.data?.heading ?? (declared ? "Winners" : "Current leaders (provisional)")} tiers={tiers} declared={declared} />

              <div className="f-card f-board" style={{ opacity: busy ? 0.6 : 1, transition: "opacity .2s" }}>
                {rows.length === 0 ? (
                  <div className="f-empty">
                    <b>No trader matches &lsquo;{d.query}&rsquo;</b>
                    Check the spelling, or search with the first two letters of the masked name.
                    <div style={{ marginTop: 16 }}>
                      <button type="button" className="f-btn ghost sm" onClick={() => d.setSearch("")}>
                        Clear search
                      </button>
                    </div>
                  </div>
                ) : (
                  <div role="table" aria-label={`${PERIODS[idx].label} leaderboard`}>
                    <div role="row" className="f-thead">
                      <div role="columnheader" className="c-rank">Rank</div>
                      <div role="columnheader" className="c-who">Participant</div>
                      <div role="columnheader" className="c-mv">Movement</div>
                      <div role="columnheader" className="c-trades">Trades</div>
                      <div role="columnheader" className="c-turn">Turnover</div>
                      <div role="columnheader" className="c-seg">Top segment</div>
                      <div role="columnheader" className="c-trend">Trend</div>
                      <div role="columnheader" className="c-saved r" style={{ display: "flex", alignItems: "center" }}>
                        {metric}
                        {metricHelp && <InfoTip text={metricHelp} label={`What is ${metric}?`} />}
                      </div>
                    </div>
                    <InView key={b.key} className="f-rows" threshold={0.05}>
                      <div role="rowgroup">
                        {rows.map((e, i) => (
                          <div key={`${b.key}-${e.rank}`} style={{ display: "contents" }}>
                            <Row e={e} i={i % PAGE_SIZE} chip={chipFor(e)} />
                            {!d.query && e.rank === b.page.cutoffRank && (
                              <div role="row" className="f-cut row-st" style={{ "--i": (i % PAGE_SIZE) + 1 } as CSSProperties}>
                                <span role="cell">
                                  Winning zone cutoff · {f.money(b.page.cutoffSaved)} needed to enter the top {b.page.cutoffRank}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </InView>
                  </div>
                )}

                {you && (
                  <div className="f-you f-gborder" role="complementary" aria-label="Your rank">
                    <span className="tag">Your rank</span>
                    <Row e={you} i={0} plain chip={chipFor(you)} />
                  </div>
                )}

                {d.hasMore && (
                  <div className="f-more">
                    <button type="button" className="f-btn ghost" onClick={d.loadMore} disabled={busy}>
                      Load more
                    </button>
                  </div>
                )}
              </div>
              <div className="f-foot">
                <span>
                  Showing {f.num(b.page.entries.length)} of {f.num(b.page.total)}
                </span>
                <span>Names are masked to protect privacy.</span>
              </div>
            </>
          )}
        </Async>
      </div>
    </Section>
  );
}

/* ═══════════════════════════ WINNERS / CHAMPION ═════════════════════════ */
function WinnersSection({ d }: { d: Landing }) {
  const f = useFmt();
  const c = d.competition.data;
  const w = d.winners;
  const declared = c?.status === "winners_declared";
  const finalDate = c ? (c.winnersDeclaredAt ?? new Date(Date.parse(c.endsAt) + VERIFICATION_DAYS * 86400000).toISOString()) : null;
  const heading = w.data?.heading ?? (declared ? "Winners" : "Current leaders (provisional)");

  return (
    <Section id="winners" label="Winners">
      <SectionHead
        id="winners"
        eyebrow={heading}
        title={declared ? <>Meet the <span className="f-gradtext">winners</span></> : <>Who&apos;s leading <span className="f-gradtext">right now</span></>}
        sub={declared ? "Verified and declared. Congratulations to everyone in the winning zone." : "These are provisional standings. Winners are confirmed only after the contest ends and every account is verified."}
        center
      />

      {c && finalDate && (
        <Reveal variant="scale">
          {w.data?.isFinal ? (
            <div className="f-banner final" role="status">
              <Icon name="trophy" size={18} />
              Winners declared on {f.date(finalDate)}
            </div>
          ) : (
            <div className="f-banner prov" role="status">
              <span className="f-pill acc">Provisional</span>
              Final winners are declared on {f.date(finalDate)}, after verification
            </div>
          )}
        </Reveal>
      )}

      <Async
        res={w}
        what="winners"
        onRetry={() => d.retry("winners")}
        skeleton={
          <div className="f-wgrid">
            <Sk h={460} r={24} />
            <Sk h={460} r={24} />
          </div>
        }
        isEmpty={(x) => x.winners.length === 0 && !x.champion}
        emptyText="Standings will appear here once traders start saving."
      >
        {(x) => (
          <div className="f-wgrid">
            {x.champion && (
              <Reveal variant="left">
                <ChampionCard e={x.champion} isFinal={x.isFinal} />
              </Reveal>
            )}
            <Reveal variant="right">
              <div className="f-card pad f-wlist" style={{ height: "100%" }}>
                <h3 className="f-h3 f-display" style={{ marginBottom: 6 }}>
                  {x.isFinal ? "All winners" : "Top 20 right now"}
                </h3>
                <p className="f-h3sub" style={{ marginBottom: 14 }}>
                  {x.isFinal ? "Rank, prize and brokerage saved" : "Rank, prize at stake and brokerage saved"}
                </p>
                <ol aria-label={x.heading}>
                  {x.winners.map((m) => (
                    <li key={m.rank} className="f-wli">
                      <span className={`f-rank${m.rank <= 3 ? ` p${m.rank}` : " zone"}`}>{m.rank}</span>
                      <span className="n">
                        {m.maskedName}
                        <Flag code={m.countryCode} size={16} />
                      </span>
                      <span className="p">{m.prize}</span>
                      <span className="s">{f.money(m.brokerageSaved)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </div>
        )}
      </Async>

      <div style={{ marginTop: "clamp(40px,6vw,72px)" }}>
        <Reveal>
          <h3 className="f-h3 f-display" style={{ fontSize: 26 }}>
            Past editions
          </h3>
          <p className="f-h3sub">Previous pools and their podiums</p>
        </Reveal>
        <Async
          res={d.past}
          what="past editions"
          onRetry={() => d.retry("past")}
          skeleton={
            <div className="f-past">
              <Sk h={220} r={24} />
              <Sk h={220} r={24} />
            </div>
          }
          isEmpty={(p) => p.length === 0}
          emptyText="Past editions will be listed here."
        >
          {(eds) => (
            <InView className="f-past">
              {eds.map((ed, i) => (
                <div key={ed.id} className="st" style={{ "--i": i } as CSSProperties}>
                  <div className="f-card pad f-spot" onPointerMove={onSpot} style={{ height: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <h4 className="f-display" style={{ fontSize: 22, fontWeight: 600 }}>{ed.title}</h4>
                        <p className="f-h3sub">{ed.period}</p>
                      </div>
                      <div style={{ textAlign: "right", fontSize: 13, color: "var(--mute)" }}>
                        <div><b style={{ color: "var(--ink)" }}>{f.compact(ed.poolSize)}</b> pool</div>
                        <div>{f.num(ed.tradersEnrolled)} traders</div>
                      </div>
                    </div>
                    <ul style={{ marginTop: 14 }} aria-label={`${ed.title} podium`}>
                      {ed.podium.map((m) => (
                        <li key={m.rank} className={`p${m.rank}`}>
                          <span style={{ display: "flex", alignItems: "center" }}>
                            <span className="rk">{m.rank}</span>
                            <span style={{ fontWeight: 600, letterSpacing: ".03em" }}>{m.maskedName}</span>
                          </span>
                          <b>{f.money(m.brokerageSaved)}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </InView>
          )}
        </Async>
      </div>
    </Section>
  );
}

function ChampionCard({ e, isFinal }: { e: LeaderboardEntry; isFinal: boolean }) {
  const f = useFmt();
  return (
    <div className="f-card f-gborder f-wash f-spot f-champ" onPointerMove={onSpot} style={{ height: "100%" }}>
      <span className="f-pill acc" style={{ letterSpacing: ".1em", textTransform: "uppercase" }}>
        <Icon name="trophy" size={14} />
        {isFinal ? "Champion" : "Current #1 · provisional"}
      </span>
      <div className="name f-display">{e.maskedName}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--mute)", marginTop: 8 }}>
        <Flag code={e.countryCode} />
        {e.city}
        <span aria-hidden="true">·</span>
        <Movement movement={e.movement} previousRank={e.previousRank} />
      </div>
      <div className="big f-display f-gradtext">
        <CountUp value={e.brokerageSaved} format={f.money} />
      </div>
      <div style={{ fontSize: 13, color: "var(--mute)" }}>brokerage saved</div>
      <AreaChart
        labels={e.trend.map((_, i) => `Day ${i + 1}`)}
        values={e.trend}
        formatY={f.compact}
        formatTip={(i) => `Day ${i + 1} · ${f.money(e.trend[i])}`}
        height={200}
        ariaLabel={`Cumulative brokerage saved by ${e.maskedName} over 14 days, ending at ${f.money(e.brokerageSaved)}`}
      />
      <div className="f-stats">
        <div className="f-stat"><div className="l">Saved</div><div className="v">{f.money(e.brokerageSaved)}</div></div>
        <div className="f-stat"><div className="l">Trades</div><div className="v">{f.num(e.tradesCount)}</div></div>
        <div className="f-stat"><div className="l">Turnover</div><div className="v">{f.compact(e.turnover)}</div></div>
        <div className="f-stat"><div className="l">Top segment</div><div className="v">{e.topSegment}</div></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ PRIZES ═════════════════════════════════════ */
function PrizesSection({ d }: { d: Landing }) {
  const declared = d.competition.data?.status === "winners_declared";
  return (
    <Section id="prizes" alt label="Prizes">
      <SectionHead id="prizes" eyebrow="Prizes" title={<>Win big, <span className="f-gradtext">save more</span></>} sub="The higher you finish, the better the reward. Ranks 1 to 20 make up the winning zone." center />
      <Async
        res={d.prizes}
        what="prizes"
        onRetry={() => d.retry("prizes")}
        skeleton={
          <div className="f-prizes">
            {[0, 1, 2].map((i) => (
              <Sk key={i} h={340} r={24} />
            ))}
          </div>
        }
        isEmpty={(t) => t.length === 0}
      >
        {(tiers) => (
          <InView className="f-prizes">
            {tiers.map((t, i) => {
              const grand = t.id === "grand";
              const range = t.ranksFrom === t.ranksTo ? `Rank #${t.ranksFrom}` : `Ranks #${t.ranksFrom} to #${t.ranksTo}`;
              const n = t.winnersCount;
              return (
                <div key={t.id} className="st" style={{ "--i": i } as CSSProperties}>
                  <div className={`f-card f-prize f-spot${grand ? " f-gborder f-wash" : ""}`} onPointerMove={onSpot}>
                    {grand && <span className="f-gbadge">Grand prize</span>}
                    <span className="rng">{range}</span>
                    <div style={{ width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", background: grand ? "var(--grad)" : "var(--t12)", color: grand ? "var(--accent-ink)" : "var(--accent)" }}>
                      <Icon name={grand ? "trophy" : t.id === "podium" ? "bolt" : "laptop"} size={24} />
                    </div>
                    <div>
                      <div className="f-display" style={{ fontSize: 14, color: "var(--mute)", fontWeight: 600 }}>{t.label}</div>
                      <div className="rw f-display">{t.reward}</div>
                    </div>
                    <ul>
                      {t.perks.map((p) => (
                        <li key={p}>
                          <Icon name="check" size={16} stroke={2.6} />
                          {p}
                        </li>
                      ))}
                    </ul>
                    <div className="ft">
                      {declared ? `${n} ${n === 1 ? "winner" : "winners"}` : `${n} ${n === 1 ? "prize" : "prizes"} up for grabs`}
                    </div>
                  </div>
                </div>
              );
            })}
          </InView>
        )}
      </Async>
      <Reveal>
        <p className="f-note">
          <b>Everyone gets rewarded.</b> All traders also get brokerage reimbursed from the pool until it runs out.
        </p>
      </Reveal>
    </Section>
  );
}

/* ═══════════════════════════ HOW TO ENTER ═══════════════════════════════ */
function StepArt({ i }: { i: number }) {
  const common = { width: 220, height: 170, viewBox: "0 0 220 170", fill: "none", "aria-hidden": true } as const;
  if (i === 0)
    return (
      <svg {...common}>
        <rect x="46" y="14" width="128" height="142" rx="20" stroke="currentColor" strokeWidth="2.5" fill="var(--t8)" />
        <circle cx="110" cy="56" r="20" fill="var(--t20)" stroke="currentColor" strokeWidth="2.5" />
        <path d="M76 112c4-18 18-26 34-26s30 8 34 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="70" y="124" width="80" height="8" rx="4" fill="var(--t35)" />
        <rect x="86" y="140" width="48" height="6" rx="3" fill="var(--t20)" />
        <circle cx="164" cy="40" r="16" fill="var(--up)" />
        <path d="m157 40 5 5 9-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (i === 1)
    return (
      <svg {...common}>
        <rect x="16" y="14" width="188" height="142" rx="18" stroke="currentColor" strokeWidth="2.5" fill="var(--t8)" />
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const h = [30, 46, 38, 62, 52, 78][k];
          const y = 128 - h - [0, 6, 2, 14, 8, 22][k];
          return (
            <g key={k}>
              <line x1={42 + k * 28} x2={42 + k * 28} y1={y - 10} y2={y + h + 10} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <rect x={34 + k * 28} y={y} width="16" height={h} rx="4" fill={k % 2 ? "var(--t35)" : "currentColor"} />
            </g>
          );
        })}
        <path d="M30 118c28-6 48-24 74-34s52-24 80-50" stroke="var(--up)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 7" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="22" y="104" width="52" height="52" rx="8" fill="var(--t20)" stroke="currentColor" strokeWidth="2.5" />
      <rect x="84" y="70" width="52" height="86" rx="8" fill="var(--t35)" stroke="currentColor" strokeWidth="2.5" />
      <rect x="146" y="120" width="52" height="36" rx="8" fill="var(--t12)" stroke="currentColor" strokeWidth="2.5" />
      <text x="48" y="140" textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor">2</text>
      <text x="110" y="122" textAnchor="middle" fontSize="28" fontWeight="700" fill="currentColor">1</text>
      <text x="172" y="145" textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor">3</text>
      <path d="m110 16 7 14 15 2-11 10 3 15-14-8-14 8 3-15-11-10 15-2Z" fill="var(--gold)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function HowSection({ d }: { d: Landing }) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const baseId = useId();
  return (
    <Section id="how" label="How to enter">
      <SectionHead id="how" eyebrow="How to enter" title={<>Three steps. <span className="f-gradtext">Zero extra effort.</span></>} sub="Existing customers are already enrolled. New here? You are one signup away." />
      <Async
        res={d.content}
        what="how it works"
        onRetry={() => d.retry("content")}
        skeleton={
          <div className="f-steps">
            <div style={{ display: "grid", gap: 10 }}>{[0, 1, 2].map((i) => <Sk key={i} h={64} r={18} />)}</div>
            <Sk h={340} r={24} />
          </div>
        }
        isEmpty={(c) => c.steps.length === 0}
      >
        {(c) => (
          <>
            <Reveal>
              <div
                className="f-steps"
                style={{ "--ps": paused ? "paused" : "running" } as CSSProperties}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
              >
                <div className="f-stabs" role="tablist" aria-orientation="vertical" aria-label="Steps">
                  {c.steps.map((s, i) => (
                    <button
                      key={s.title}
                      type="button"
                      role="tab"
                      id={`${baseId}-t${i}`}
                      aria-selected={active === i}
                      aria-controls={`${baseId}-p${i}`}
                      tabIndex={active === i ? 0 : -1}
                      className="f-stab"
                      onClick={() => setActive(i)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                          e.preventDefault();
                          const n = (i + (e.key === "ArrowDown" ? 1 : c.steps.length - 1)) % c.steps.length;
                          setActive(n);
                          document.getElementById(`${baseId}-t${n}`)?.focus();
                        }
                      }}
                    >
                      <span className="bar" aria-hidden="true">
                        <i onAnimationEnd={() => !reduced && active === i && setActive((i + 1) % c.steps.length)} />
                      </span>
                      <span className="no">{String(i + 1).padStart(2, "0")}</span>
                      <span className="tt f-display">{s.title}</span>
                    </button>
                  ))}
                </div>
                <div className="f-card f-wash f-spanel">
                  {c.steps.map((s, i) => (
                    <div key={s.title} role="tabpanel" id={`${baseId}-p${i}`} aria-labelledby={`${baseId}-t${i}`} data-active={active === i}>
                      <div>
                        <span className="f-eyebrow">Step {String(i + 1).padStart(2, "0")}</span>
                        <h3 className="f-display">{s.title}</h3>
                        <p>{s.body}</p>
                      </div>
                      <div className="art">
                        <StepArt i={i} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <div id="rules" style={{ scrollMarginTop: 90 }}>
              <Reveal>
                <h3 className="f-h3 f-display" style={{ marginTop: 56, fontSize: 26 }}>Contest rules</h3>
                <p className="f-h3sub">The short version. Full terms apply.</p>
              </Reveal>
              <InView>
                <ul className="f-rules">
                  {c.rules.map((r, i) => (
                    <li key={r} className="st" style={{ "--i": i } as CSSProperties}>
                      <Icon name="check" size={18} stroke={2.6} />
                      <span>{r}</span>
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
    <Section id="faq" alt label="FAQ">
      <SectionHead id="faq" eyebrow="FAQs" title={<>Questions, <span className="f-gradtext">answered</span></>} center />
      <Async
        res={d.content}
        what="FAQs"
        onRetry={() => d.retry("content")}
        skeleton={<div className="f-faq">{[0, 1, 2, 3, 4, 5].map((i) => <Sk key={i} h={64} r={20} />)}</div>}
        isEmpty={(c) => c.faqs.length === 0}
      >
        {(c) => (
          <InView className="f-faq">
            {c.faqs.map((q, i) => {
              const isOpen = open === i;
              return (
                <div key={q.q} className="f-qa st" data-open={isOpen} style={{ "--i": i } as CSSProperties}>
                  <h3 style={{ margin: 0, font: "inherit" }}>
                    <button type="button" aria-expanded={isOpen} aria-controls={`${base}-a${i}`} id={`${base}-q${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                      <span>{q.q}</span>
                      <span className="f-pm" aria-hidden="true" />
                    </button>
                  </h3>
                  <div className="f-ans" id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`}>
                    <div>
                      <p>{q.a}</p>
                    </div>
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
  return (
    <section id="join" className="f-sec" style={{ paddingTop: "clamp(48px,7vw,96px)", paddingBottom: "clamp(48px,7vw,96px)" }} aria-labelledby="join-title">
      <div className="f-wrap">
        <Reveal variant="scale">
          <div className="f-cta">
            <span className="shape s1" aria-hidden="true" />
            <span className="shape s2" aria-hidden="true" />
            <span className="shape s3" aria-hidden="true" />
            <h2 id="join-title" className="f-display">
              {declared ? "See you in the next pool." : BRAND.tagline}
            </h2>
            <p>{declared ? "Follow along for the next edition and be first in line to join." : "Trade the way you already do. Let the pool pay your brokerage, and see how high you can climb."}</p>
            <div className="f-ctas">
              <a href={URLS.join} className="f-btn white">
                {declared ? "Get notified" : "Join the pool"}
              </a>
            </div>
            <small>Existing customers are already part of the pool.</small>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer({ d, mode, onToggle, declared }: { d: Landing; mode: "light" | "dark"; onToggle: () => void; declared: boolean }) {
  const c = d.competition.data;
  const year = c ? new Date(c.startsAt).getUTCFullYear() : null;
  return (
    <footer className="f-footer">
      <div className="f-wrap">
        <div className="f-fgrid">
          <div>
            <a href="#top" className="f-logo f-display" aria-label={`${BRAND.name} home`}>
              <LogoGlyph />
              {BRAND.name}
            </a>
            <p style={{ marginTop: 14, color: "var(--mute)", maxWidth: 320, fontSize: 15 }}>{BRAND.tagline} Trade as usual. Save brokerage. Climb the board.</p>
          </div>
          <nav aria-label="Explore">
            <h4>Explore</h4>
            <ul>
              <li><a href="#leaderboard">Leaderboard</a></li>
              <li><a href="#winners">{declared ? "Winners" : "Current leaders"}</a></li>
              <li><a href="#prizes">Prizes</a></li>
              <li><a href="#how">How to enter</a></li>
            </ul>
          </nav>
          <nav aria-label="Support">
            <h4>Support</h4>
            <ul>
              <li><a href="#rules">Contest rules</a></li>
              <li><a href="#faq">FAQs</a></li>
              <li><a href={URLS.login}>Log in</a></li>
              <li><a href={URLS.join}>Join the pool</a></li>
            </ul>
          </nav>
          <div>
            <h4>Partners</h4>
            {c ? (
              <ul>
                {c.partners.map((p) => (
                  <li key={p.name}>
                    {p.name}
                    <span>{p.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <Sk w={140} h={18} />
                <Sk w={180} h={18} />
              </div>
            )}
          </div>
        </div>
        <div className="f-disc">
          {d.content.data ? (
            d.content.data.disclosure
          ) : d.content.state === "error" ? (
            <button type="button" className="f-btn ghost sm" onClick={() => d.retry("content")}>
              Retry loading disclosure
            </button>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <Sk h={13} />
              <Sk h={13} w="80%" />
            </div>
          )}
        </div>
        <div className="f-fbot">
          <span>
            © {year ?? ""} {BRAND.name}. All rights reserved.
          </span>
          <ThemeToggle mode={mode} onToggle={onToggle} />
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════ THEME STUDIO (dev) ═════════════════════════ */
function ThemeStudio({ palette, mode, setPalette }: { palette: Palette; mode: "light" | "dark"; setPalette: (p: Palette) => void }) {
  const tone = palette[mode];
  const set = (patch: Partial<Tone>) => setPalette({ ...palette, [mode]: { ...tone, ...patch } });
  return (
    <div className="f-studio" role="region" aria-label="Theme studio">
      <div>Theme studio · {mode}</div>
      <div className="sw">
        {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
          <button key={k} type="button" aria-label={`Preset ${k}`} title={k} style={{ background: `linear-gradient(135deg,${PRESETS[k][mode].accent},${PRESETS[k][mode].accent2})` }} onClick={() => setPalette(PRESETS[k])} />
        ))}
      </div>
      <label>
        Accent
        <input type="color" value={tone.accent} onChange={(e) => set({ accent: e.target.value })} />
      </label>
      <label>
        Accent 2
        <input type="color" value={tone.accent2} onChange={(e) => set({ accent2: e.target.value })} />
      </label>
    </div>
  );
}

/* ═══════════════════════════ PAGE ═══════════════════════════════════════ */
export default function Page() {
  const d = useLandingData();
  const cur = d.competition.data?.currency;
  const fmt = useMemo(() => makeFmt(cur), [cur]);
  const declared = d.competition.data?.status === "winners_declared";

  const [mode, setMode] = useState<"light" | "dark">("light");
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
    <FmtCtx.Provider value={fmt}>
      <div className={`fogm ${fontDisplay.variable} ${fontBody.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} suppressHydrationWarning />
        <style dangerouslySetInnerHTML={{ __html: css + STYLES }} />
        <noscript>
          <style>{NOSCRIPT_CSS}</style>
        </noscript>
        <Nav mode={mode} onToggle={toggle} declared={declared} />
        <main id="main">
          <Hero d={d} />
          <PoolSection d={d} />
          <MarqueeStrip declared={declared} />
          <LeaderboardSection d={d} />
          <WinnersSection d={d} />
          <PrizesSection d={d} />
          <HowSection d={d} />
          <FaqSection d={d} />
          <CtaBand declared={declared} />
        </main>
        <Footer d={d} mode={mode} onToggle={toggle} declared={declared} />
        {SHOW_THEME_STUDIO && <ThemeStudio palette={palette} mode={mode} setPalette={setPalette} />}
      </div>
    </FmtCtx.Provider>
  );
}
