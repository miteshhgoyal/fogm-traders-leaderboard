"use client";

import { useState, useMemo } from "react";
import {
  PageHeader,
  Card,
  Button,
  Field,
  Input,
  Select,
  UnsavedBar,
  Skeleton,
} from "@/components/admin/AdminPrimitives";
import { ColorField } from "@/components/admin/ColorField";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { useToast } from "@/components/admin/Toast";
import { DEFAULT_SETTINGS, type BrandSettings, type ThemeSettings } from "@/lib/defaults";
import { useFetch } from "@/lib/use-async";

const PRESET_PALETTES = [
  {
    name: "Classic FOGM",
    sub: "Indigo & Purple",
    light: { accent: "#3b36e0", accent2: "#7a5cff", accentInk: "#ffffff" },
    dark: { accent: "#8b87ff", accent2: "#b49bff", accentInk: "#0b0b1a" },
  },
  {
    name: "Emerald & Gold",
    sub: "Forex Champion",
    light: { accent: "#059669", accent2: "#d97706", accentInk: "#ffffff" },
    dark: { accent: "#34d399", accent2: "#fbbf24", accentInk: "#06231a" },
  },
  {
    name: "Sapphire & Cyan",
    sub: "Ocean Terminal",
    light: { accent: "#2563eb", accent2: "#06b6d4", accentInk: "#ffffff" },
    dark: { accent: "#60a5fa", accent2: "#22d3ee", accentInk: "#09172e" },
  },
  {
    name: "Crimson & Rose",
    sub: "Bull & Bear",
    light: { accent: "#e11d48", accent2: "#f43f5e", accentInk: "#ffffff" },
    dark: { accent: "#fb7185", accent2: "#fda4af", accentInk: "#26060e" },
  },
];

export default function AdminDesignPage() {
  const { showToast } = useToast();
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_SETTINGS.brand);
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_SETTINGS.theme);

  const [initialState, setInitialState] = useState<{
    brand: BrandSettings;
    theme: ThemeSettings;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  const { loading, error, refetch } = useFetch(async () => {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) throw new Error("Failed to load settings");
    const data = await res.json();
    const loadedBrand = data.brand ? { ...DEFAULT_SETTINGS.brand, ...data.brand } : DEFAULT_SETTINGS.brand;
    const loadedTheme = data.theme ? { ...DEFAULT_SETTINGS.theme, ...data.theme } : DEFAULT_SETTINGS.theme;

    setBrand(loadedBrand);
    setTheme(loadedTheme);
    setInitialState({ brand: loadedBrand, theme: loadedTheme });
    return data;
  }, []);

  const isDirty = useMemo(() => {
    if (!initialState) return false;
    return (
      JSON.stringify(brand) !== JSON.stringify(initialState.brand) ||
      JSON.stringify(theme) !== JSON.stringify(initialState.theme)
    );
  }, [brand, theme, initialState]);

  const handleDiscard = () => {
    if (!initialState) return;
    setBrand(initialState.brand);
    setTheme(initialState.theme);
    showToast("Changes discarded", "info");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, theme }),
      });
      if (!res.ok) throw new Error("Failed to save design settings");
      setInitialState({ brand, theme });
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
    showToast(`Applied palette: ${preset.name}`, "info");
  };

  const resetToDefault = () => {
    setTheme({ ...DEFAULT_SETTINGS.theme });
    showToast("Reset theme to default colors", "info");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <p className="text-down font-medium">Failed to load design settings</p>
        <Button variant="secondary" size="sm" onClick={refetch} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Design & Brand"
        description="Configure brand name, logos, favicon, OG images, and visual color palettes."
      >
        <Button onClick={handleSave} loading={saving} disabled={!isDirty}>
          Save Changes
        </Button>
      </PageHeader>

      {/* Brand Identity */}
      <Card className="space-y-6">
        <div>
          <h2 className="text-sub font-semibold text-ink">Brand Identity</h2>
          <p className="text-cell text-mute mt-0.5">
            General branding displayed across title tags, headers, and footer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Brand Name" required>
            <Input
              type="text"
              value={brand.name}
              onChange={(e) => setBrand({ ...brand, name: e.target.value })}
            />
          </Field>

          <Field label="Brand Tagline">
            <Input
              type="text"
              value={brand.tagline}
              onChange={(e) => setBrand({ ...brand, tagline: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-hairline">
          <ImageUpload
            label="Logo (Light Mode)"
            value={brand.logoLight}
            onChange={(url) => setBrand({ ...brand, logoLight: url })}
            hint="SVG or PNG (transparent)"
          />
          <ImageUpload
            label="Logo (Dark Mode)"
            value={brand.logoDark}
            onChange={(url) => setBrand({ ...brand, logoDark: url })}
            hint="Light-colored logo"
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
            hint="1200x630 social banner"
          />
        </div>
      </Card>

      {/* Color System & Themes */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sub font-semibold text-ink">Color System & Themes</h2>
            <p className="text-cell text-mute mt-0.5">
              Customize primary accents and contrast ink tones. Verified for AA accessibility.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={resetToDefault}>
            Reset to Default
          </Button>
        </div>

        {/* Default Mode Selector */}
        <div className="max-w-xs">
          <Field label="Default Theme Mode" hint="Visitor initial theme">
            <Select
              value={theme.defaultMode}
              onChange={(val) =>
                setTheme({ ...theme, defaultMode: val as ThemeSettings["defaultMode"] })
              }
              options={[
                { value: "system", label: "Follow System / OS" },
                { value: "dark", label: "Dark Mode" },
                { value: "light", label: "Light Mode" },
              ]}
            />
          </Field>
        </div>

        {/* Preset Palettes */}
        <div className="space-y-3 pt-2 border-t border-hairline">
          <span className="text-meta font-semibold text-mute">Quick Palette Presets</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESET_PALETTES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(preset)}
                className="group flex flex-col items-start p-3 rounded-xl border border-hairline bg-card hover:border-accent/40 text-left transition hover:shadow-xs"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="size-4 rounded-full shadow-xs"
                    style={{ backgroundColor: preset.light.accent }}
                  />
                  <span
                    className="size-4 rounded-full shadow-xs"
                    style={{ backgroundColor: preset.light.accent2 }}
                  />
                </div>
                <span className="text-meta font-medium text-ink group-hover:text-accent transition">
                  {preset.name}
                </span>
                <span className="text-[11px] text-faint">{preset.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Fields: Light & Dark */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-hairline">
          {/* Light Mode */}
          <div className="space-y-4 p-5 rounded-2xl bg-white text-zinc-900 border border-zinc-200 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-cell font-bold text-zinc-800">Light Mode Palette</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                bg: #ffffff
              </span>
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
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">
                Live Preview
              </span>
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl text-cell font-bold shadow-xs transition-transform active:scale-95"
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
          <div className="space-y-4 p-5 rounded-2xl bg-[#0b0b1a] text-zinc-100 border border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-cell font-bold text-zinc-200">Dark Mode Palette</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400">
                bg: #0b0b1a
              </span>
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
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                Live Preview
              </span>
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl text-cell font-bold shadow-xs transition-transform active:scale-95"
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
      </Card>

      <UnsavedBar
        visible={isDirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
