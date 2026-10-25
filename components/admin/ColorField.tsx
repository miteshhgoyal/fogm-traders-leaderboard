"use client";

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  return null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  contrastWith?: string;
}

export function ColorField({ label, value, onChange, contrastWith }: ColorFieldProps) {
  const ratio = contrastWith ? contrastRatio(value, contrastWith) : null;
  const isAAMet = ratio ? ratio >= 4.5 : true;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {ratio !== null && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              isAAMet
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            }`}
            title={`Contrast ratio: ${ratio.toFixed(2)}:1`}
          >
            {isAAMet ? `AA ${ratio.toFixed(1)}:1` : `Low: ${ratio.toFixed(1)}:1`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm">
          <input
            type="color"
            value={value.startsWith("#") ? value : "#3b36e0"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-2 size-14 cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 font-mono text-xs uppercase text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>
      {!isAAMet && ratio !== null && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          ⚠️ WCAG AA contrast warning (&lt; 4.5:1 ratio with background)
        </p>
      )}
    </div>
  );
}
