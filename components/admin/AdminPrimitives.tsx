"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

/* ─────────────────────────── helpers & cursor spotlight ─────────────────── */
export function onSpotlightMove(e: React.PointerEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
}

/* ─────────────────────────── Button ─────────────────────────────────────── */
export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition duration-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none";

  const sizes = {
    sm: "h-9 rounded-lg px-3.5 text-meta",
    md: "h-11 rounded-xl px-5 text-cell font-semibold",
    lg: "h-12 rounded-xl px-6 text-body font-semibold",
  };

  const variants = {
    primary:
      "bg-linear-to-br from-accent to-accent-2 text-accent-ink shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--accent)_60%,transparent)] enabled:hover:-translate-y-px enabled:hover:shadow-[0_12px_28px_-8px_color-mix(in_oklab,var(--accent)_70%,transparent)]",
    secondary:
      "border border-hairline-strong bg-card text-ink enabled:hover:border-accent enabled:hover:bg-alt shadow-xs",
    danger:
      "bg-down text-white shadow-[0_8px_20px_-8px_rgba(217,48,74,.5)] enabled:hover:-translate-y-px enabled:hover:bg-down/90",
    ghost:
      "text-mute hover:bg-alt hover:text-ink",
  };

  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/* ─────────────────────────── Badge ──────────────────────────────────────── */
export type BadgeVariant = "accent" | "up" | "down" | "mute" | "gold" | "silver" | "bronze";

export function Badge({
  variant = "accent",
  children,
  className = "",
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  const variants = {
    accent: "bg-accent/15 text-accent border border-accent/20",
    up: "bg-up/15 text-up border border-up/25",
    down: "bg-down/15 text-down border border-down/25",
    mute: "bg-mute/15 text-mute border border-hairline",
    gold: "bg-[#f2b33d]/15 text-[#f2b33d] border border-[#f2b33d]/30",
    silver: "bg-[#b4bccd]/15 text-[#b4bccd] border border-[#b4bccd]/30",
    bronze: "bg-[#cd8a55]/15 text-[#cd8a55] border border-[#cd8a55]/30",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-label font-semibold tracking-wide uppercase ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

/* ─────────────────────────── Card ───────────────────────────────────────── */
export function Card({
  children,
  className = "",
  wash = false,
  spotlight = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  wash?: boolean;
  spotlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onPointerMove={spotlight ? onSpotlightMove : undefined}
      onClick={onClick}
      className={`rounded-2xl border border-hairline bg-card p-6 shadow-[var(--shadow)] transition duration-200 ${
        wash ? "f-wash" : ""
      } ${spotlight ? "f-spot" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────── PageHeader ─────────────────────────────────── */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-title font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-cell text-mute">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

/* ─────────────────────────── StatTile ───────────────────────────────────── */
export function StatTile({
  label,
  value,
  subtext,
  delta,
  tooltip,
  icon,
}: {
  label: string;
  value: ReactNode;
  subtext?: string;
  delta?: { value: string; positive?: boolean };
  tooltip?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      onPointerMove={onSpotlightMove}
      className="f-spot relative rounded-2xl border border-hairline bg-card p-6 shadow-[var(--shadow)] transition hover:border-hairline-strong"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-label font-semibold uppercase tracking-wider text-mute">{label}</span>
        {icon && <div className="text-mute">{icon}</div>}
      </div>
      <div className="mt-3 text-stat font-semibold tracking-tight text-ink tabular-nums">{value}</div>
      <div className="mt-2 flex items-center justify-between text-meta">
        {subtext && <span className="text-mute">{subtext}</span>}
        {delta && (
          <span className={`font-semibold tabular-nums ${delta.positive ? "text-up" : "text-down"}`}>
            {delta.positive ? "↑" : "↓"} {delta.value}
          </span>
        )}
      </div>
      {tooltip && (
        <p className="mt-2 text-[11px] text-faint border-t border-hairline pt-2" title={tooltip}>
          {tooltip}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────── CountUp ────────────────────────────────────── */
export function CountUp({
  value,
  duration = 1400,
  formatter,
}: {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
}) {
  const [disp, setDisp] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || started) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          ob.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const from = 0;
    const to = value;
    const step = (ts: number) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const ease = prog === 1 ? 1 : 1 - Math.pow(2, -10 * prog);
      setDisp(Math.round(from + (to - from) * ease));
      if (prog < 1) requestAnimationFrame(step);
    };
    const req = requestAnimationFrame(step);
    return () => cancelAnimationFrame(req);
  }, [started, value, duration]);

  const fmt = formatter ?? ((n: number) => n.toLocaleString());
  return (
    <span ref={ref} className="tabular-nums">
      {fmt(started ? disp : 0)}
    </span>
  );
}

/* ─────────────────────────── Form Field & Inputs ────────────────────────── */
export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const errId = useId();
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-meta font-medium text-ink">
            {label}
            {required && <span className="ml-1 text-down">*</span>}
          </label>
          {hint && <span className="text-[11px] text-faint">{hint}</span>}
        </div>
      )}
      {children}
      {error && (
        <p id={errId} role="alert" className="text-meta font-medium text-down">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`h-11 w-full rounded-xl border border-hairline-strong bg-bg px-3.5 text-cell text-ink outline-none transition placeholder:text-faint focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full rounded-xl border border-hairline-strong bg-bg p-3.5 text-cell text-ink outline-none transition placeholder:text-faint focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

/* ─────────────────────────── Custom Select ──────────────────────────────── */
export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export function Select({
  value,
  options,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className = "",
}: {
  value: string;
  options: SelectOption[];
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open && focusIndex >= 0 && options[focusIndex]) {
        onChange(options[focusIndex].value);
        setOpen(false);
      } else {
        setOpen(!open);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setFocusIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setFocusIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-hairline-strong bg-bg px-3.5 text-cell text-ink transition hover:border-accent/60 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50"
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.icon}
          <span className={selected ? "text-ink" : "text-faint"}>{selected ? selected.label : placeholder}</span>
        </span>
        <svg
          className={`size-4 text-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-hairline bg-card p-1 shadow-xl animate-[f-fadein_.15s_ease-out]"
        >
          {options.map((opt, i) => {
            const isSel = opt.value === value;
            const isFocused = i === focusIndex;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSel}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-cell transition ${
                  isSel
                    ? "bg-accent/10 font-semibold text-accent"
                    : isFocused
                    ? "bg-alt text-ink"
                    : "text-ink hover:bg-alt"
                }`}
              >
                <div className="flex items-center gap-2">
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {isSel && (
                  <svg className="size-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── DateTimeField ──────────────────────────────── */
// Timezone safe helpers:
export function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromLocalInput(localVal: string): string | null {
  if (!localVal) return null;
  const d = new Date(localVal);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function DateTimeField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
}) {
  const localVal = toLocalInput(value);
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          type="datetime-local"
          value={localVal}
          disabled={disabled}
          onChange={(e) => {
            const iso = fromLocalInput(e.target.value);
            if (iso) onChange(iso);
          }}
          className="h-11 w-full rounded-xl border border-hairline-strong bg-bg px-3.5 text-cell text-ink outline-none transition focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50"
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-faint">
        <span>Browser Zone: {tzName}</span>
        <span>Stored UTC: {value ? new Date(value).toISOString() : "Not set"}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── Switch ─────────────────────────────────────── */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {(label || description) && (
        <div>
          {label && <span className="block text-cell font-medium text-ink">{label}</span>}
          {description && <span className="block text-meta text-mute">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 ${
          checked ? "bg-accent" : "bg-hairline-strong"
        }`}
      >
        <span
          className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

/* ─────────────────────────── UnsavedBar ─────────────────────────────────── */
export function UnsavedBar({
  show,
  visible,
  saving,
  onSave,
  onReset,
  onDiscard,
}: {
  show?: boolean;
  visible?: boolean;
  saving: boolean;
  onSave: () => void | Promise<void>;
  onReset?: () => void;
  onDiscard?: () => void;
}) {
  const isVisible = visible ?? show ?? false;
  const handleDiscard = onDiscard ?? onReset;
  if (!isVisible) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-2xl border border-hairline-strong bg-card/95 p-3 px-5 shadow-[0_16px_40px_-12px_rgba(0,0,0,.5)] backdrop-blur-md animate-[f-modalin_.25s_ease-out]">
      <div className="flex items-center gap-4">
        <span className="text-cell font-medium text-ink">You have unsaved changes</span>
        <div className="flex items-center gap-2">
          {handleDiscard && (
            <Button variant="ghost" size="sm" disabled={saving} onClick={handleDiscard}>
              Discard
            </Button>
          )}
          <Button variant="primary" size="sm" loading={saving} onClick={onSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export { Drawer } from "./Drawer";

/* ─────────────────────────── EmptyState ─────────────────────────────────── */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-hairline border-dashed bg-card/50 p-12 text-center">
      {icon ? (
        <div className="mb-4 rounded-full bg-alt p-3 text-mute">{icon}</div>
      ) : (
        <div className="mb-4 text-3xl">📂</div>
      )}
      <h3 className="text-ctitle font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-cell text-mute">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ─────────────────────────── Skeleton ───────────────────────────────────── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`fg-sk rounded-xl ${className}`} />;
}
