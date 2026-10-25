"use client";

import { useEffect, useState, useCallback } from "react";
import { FormField } from "@/components/admin/FormField";
import { ColorField } from "@/components/admin/ColorField";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { useToast } from "@/components/admin/Toast";
import { DEFAULT_SETTINGS, type BrandSettings, type ThemeSettings } from "@/lib/defaults";

const PRESET_PALETTES = [
  {
    name: "Classic FOGM (Indigo & Purple)",
    light: { accent: "#3b36e0", accent2: "#7a5cff", accentInk: "#ffffff" },
    dark: { accent: "#8b87ff", accent2: "#b49bff", accentInk: "#0b0b1a" },
  },
  {
    name: "Emerald & Gold (Forex Champion)",
    light: { accent: "#059669", accent2: "#d97706", accentInk: "#ffffff" },
    dark: { accent: "#34d399", accent2: "#fbbf24", accentInk: "#06231a" },
  },
  {
    name: "Sapphire & Cyan (Ocean Terminal)",
    light: { accent: "#2563eb", accent2: "#06b6d4", accentInk: "#ffffff" },
    dark: { accent: "#60a5fa", accent2: "#22d3ee", accentInk: "#09172e" },
  },
  {
    name: "Crimson & Rose (Bull & Bear)",
    light: { accent: "#e11d48", accent2: "#f43f5e", accentInk: "#ffffff" },
    dark: { accent: "#fb7185", accent2: "#fda4af", accentInk: "#26060e" },
  },
];

export default function AdminDesignPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_SETTINGS.brand);
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_SETTINGS.theme);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      if (data.brand) setBrand({ ...DEFAULT_SETTINGS.brand, ...data.brand });
      if (data.theme) setTheme({ ...DEFAULT_SETTINGS.theme, ...data.theme });
    } catch {
      showToast("Could not load design settings", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, theme }),
      });
      if (!res.ok) throw new Error("Failed to save design settings");
      showToast("Brand and theme settings saved", "success");
    } catch {
      showToast("Failed to save design settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: typeof PRESET_PALETTES[0]) => {
    setTheme((prev) => ({
      ...prev,
      light: { ...preset.light },
      dark: { ...preset.dark },
    }));
    showToast(`Applied preset "${preset.name}"`, "info");
  };

  const resetToDefault = () => {
    setTheme({ ...DEFAULT_SETTINGS.theme });
    showToast("Reset theme to default colors", "info");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        <svg className="animate-spin size-5 mr-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading design settings...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Design & Brand</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure brand name, logos, favicon, OG images, and visual color palettes.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Brand Identity */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">Brand Identity</h2>
          <p className="text-xs text-muted-foreground">General branding displayed across title tags and navigation.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Brand Name" required>
            <input
              type="text"
              value={brand.name}
              onChange={(e) => setBrand({ ...brand, name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>

          <FormField label="Brand Tagline">
            <input
              type="text"
              value={brand.tagline}
              onChange={(e) => setBrand({ ...brand, tagline: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border/60">
          <ImageUpload
            label="Logo (Light Mode)"
            value={brand.logoLight}
            onChange={(url) => setBrand({ ...brand, logoLight: url })}
            hint="SVG or PNG with transparent bg"
          />
          <ImageUpload
            label="Logo (Dark Mode)"
            value={brand.logoDark}
            onChange={(url) => setBrand({ ...brand, logoDark: url })}
            hint="Light-colored logo on dark bg"
          />
          <ImageUpload
            label="Favicon"
            value={brand.favicon}
            onChange={(url) => setBrand({ ...brand, favicon: url })}
            hint="32x32 or 64x64 PNG / ICO"
          />
          <ImageUpload
            label="Open Graph Image"
            value={brand.ogImage}
            onChange={(url) => setBrand({ ...brand, ogImage: url })}
            hint="1200x630 social share banner"
          />
        </div>
      </div>

      {/* Theme & Palettes */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Color System & Themes</h2>
            <p className="text-xs text-muted-foreground">Customize primary accents and contrast ink tones.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetToDefault}
              className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded border border-border"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Default Mode Selector */}
        <div className="max-w-xs">
          <FormField label="Default Theme Mode" hint="Initial mode for new visitors without saved preference">
            <select
              value={theme.defaultMode}
              onChange={(e) => setTheme({ ...theme, defaultMode: e.target.value as ThemeSettings["defaultMode"] })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="system">Follow System / OS</option>
              <option value="dark">Dark Mode</option>
              <option value="light">Light Mode</option>
            </select>
          </FormField>
        </div>

        {/* Preset Palettes */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <span className="text-xs font-semibold text-muted-foreground">Quick Palette Presets</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESET_PALETTES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(preset)}
                className="flex flex-col items-start p-3 rounded-lg border border-border hover:border-primary/50 text-left transition-colors bg-muted/20 hover:bg-muted/40"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="size-4 rounded-full" style={{ backgroundColor: preset.light.accent }} />
                  <span className="size-4 rounded-full" style={{ backgroundColor: preset.light.accent2 }} />
                </div>
                <span className="text-xs font-medium text-foreground">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Fields: Light & Dark */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/60">
          {/* Light Mode */}
          <div className="space-y-4 p-4 rounded-xl bg-white text-zinc-900 border border-zinc-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-800">Light Mode Palette</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">bg: #ffffff</span>
            </div>
            <ColorField
              label="Primary Accent"
              value={theme.light.accent}
              contrastWith="#ffffff"
              onChange={(v) => setTheme({ ...theme, light: { ...theme.light, accent: v } })}
            />
            <ColorField
              label="Secondary Accent"
              value={theme.light.accent2}
              contrastWith="#ffffff"
              onChange={(v) => setTheme({ ...theme, light: { ...theme.light, accent2: v } })}
            />
            <ColorField
              label="Accent Text Ink"
              value={theme.light.accentInk}
              contrastWith={theme.light.accent}
              onChange={(v) => setTheme({ ...theme, light: { ...theme.light, accentInk: v } })}
            />
            {/* Live Light Preview */}
            <div className="pt-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Preview</span>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${theme.light.accent}, ${theme.light.accent2})`,
                  color: theme.light.accentInk,
                }}
              >
                See your rank →
              </button>
            </div>
          </div>

          {/* Dark Mode */}
          <div className="space-y-4 p-4 rounded-xl bg-zinc-950 text-zinc-100 border border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200">Dark Mode Palette</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400">bg: #0b0b1a</span>
            </div>
            <ColorField
              label="Primary Accent"
              value={theme.dark.accent}
              contrastWith="#0b0b1a"
              onChange={(v) => setTheme({ ...theme, dark: { ...theme.dark, accent: v } })}
            />
            <ColorField
              label="Secondary Accent"
              value={theme.dark.accent2}
              contrastWith="#0b0b1a"
              onChange={(v) => setTheme({ ...theme, dark: { ...theme.dark, accent2: v } })}
            />
            <ColorField
              label="Accent Text Ink"
              value={theme.dark.accentInk}
              contrastWith={theme.dark.accent}
              onChange={(v) => setTheme({ ...theme, dark: { ...theme.dark, accentInk: v } })}
            />
            {/* Live Dark Preview */}
            <div className="pt-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Preview</span>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${theme.dark.accent}, ${theme.dark.accent2})`,
                  color: theme.dark.accentInk,
                }}
              >
                See your rank →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
