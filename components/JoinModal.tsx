"use client";

import { useCallback, useEffect, useId, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import Avatar from "./Avatar";
import ShareCard from "./ShareCard";
import { useAuth } from "./auth-context";

/* ─────────────────────────── shared UI bits ─────────────────────────────── */
const BTN_BASE =
  "inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-cell font-semibold transition duration-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none";
const BTN_PRIMARY = `${BTN_BASE} bg-linear-to-br from-accent to-accent-2 text-accent-ink shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--accent)_60%,transparent)] enabled:hover:-translate-y-px`;
const BTN_GHOST = `${BTN_BASE} border border-hairline-strong bg-card text-ink enabled:hover:border-accent`;
const FIELD =
  "h-12 w-full rounded-xl border border-hairline-strong bg-bg px-4 text-body text-ink outline-none transition placeholder:text-faint focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Spinner() {
  return <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />;
}

function ErrorLine({ id, children }: { id?: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-3 text-meta font-medium text-down">
      {children}
    </p>
  );
}

/* ─────────────────────────── modal shell ────────────────────────────────── */
function Shell({ titleId, onClose, children }: { titleId: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // scroll lock
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  // document-level so Esc / Tab still work when focus has fallen back to <body>
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-sm animate-[f-fadein_.25s_ease-out_both] motion-reduce:animate-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[calc(100dvh-32px)] w-full max-w-[440px] overflow-y-auto rounded-3xl border border-hairline bg-card p-6 text-ink shadow-[0_32px_80px_-24px_rgba(0,0,0,.5)] animate-[f-modalin_.4s_var(--ease)_both] motion-reduce:animate-none md:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-11 place-items-center rounded-full text-mute transition hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────── API helpers ────────────────────────────────── */
interface ApiError {
  ok: false;
  error: string;
  message?: string;
  attemptsLeft?: number;
  retryAfter?: number;
}
async function postJson<T extends object>(url: string, body: object, method: "POST" | "PATCH" = "POST"): Promise<(T & { ok: true }) | ApiError> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as (T & { ok?: boolean }) | ApiError | null;
    if (res.ok && data && (data as { ok?: boolean }).ok !== false) return { ...(data as T), ok: true };
    if (res.status === 401) return { ok: false, error: "unauthorized", message: "Your session expired. Please verify your email again." };
    if (res.status === 403) return { ok: false, error: "forbidden", message: "Your session expired. Please verify your email again." };
    return data && "error" in data ? (data as ApiError) : { ok: false, error: "server", message: "Something went wrong. Please try again." };
  } catch {
    return { ok: false, error: "network", message: "Network error. Check your connection and try again." };
  }
}
const msgFor = (e: ApiError): string => {
  switch (e.error) {
    case "unauthorized":
    case "forbidden":
      return "Your session expired. Please verify your email again.";
    case "rate_limited":
      return e.retryAfter ? `Too many attempts. Try again in ${Math.ceil(e.retryAfter / 60)} min.` : "Too many attempts. Try again later.";
    case "invalid_code":
      return e.attemptsLeft !== undefined ? `That code is incorrect. ${e.attemptsLeft} ${e.attemptsLeft === 1 ? "attempt" : "attempts"} left.` : "That code is incorrect.";
    case "expired":
      return "That code has expired. Request a new one.";
    case "too_many_attempts":
      return "Too many wrong attempts. Request a new code.";
    case "invalid_email":
      return "Enter a valid email address.";
    default:
      return e.message ?? "Something went wrong. Please try again.";
  }
};

/* ─────────────────────────── step 1: email ──────────────────────────────── */
function EmailStep({ initialEmail = "", initialError = "", onSent }: { initialEmail?: string; initialError?: string; onSent: (email: string) => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(initialError);
  const errId = useId();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setErr(msgFor({ ok: false, error: "invalid_email" }));
    setErr("");
    setBusy(true);
    const r = await postJson("/api/auth/request-otp", { email: v });
    setBusy(false);
    if (r.ok) onSent(v);
    else setErr(msgFor(r));
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <p className="text-label uppercase text-accent">FOGM Championship</p>
      <h2 id="join-title" className="mt-3 text-ctitle text-ink">See where you rank</h2>
      <p className="mb-6 mt-2 text-cell text-mute">Enter your email to unlock your rank card.</p>
      <label htmlFor="join-email" className="mb-2 block text-meta font-medium text-ink">Email</label>
      <input
        id="join-email"
        data-autofocus
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setErr("");
        }}
        aria-invalid={!!err}
        aria-describedby={err ? errId : undefined}
        className={FIELD}
      />
      <ErrorLine id={errId}>{err}</ErrorLine>
      <button type="submit" disabled={busy || email.trim() === ""} aria-busy={busy} className={`${BTN_PRIMARY} mt-5`}>
        {busy && <Spinner />}Send code
      </button>
      <p className="mt-4 text-center text-meta text-faint">By continuing you agree to the championship rules.</p>
    </form>
  );
}

/* ─────────────────────────── step 2: OTP ────────────────────────────────── */
const RESEND_SECONDS = 30;
function OtpStep({ email, onBack, onVerified }: { email: string; onBack: () => void; onVerified: () => Promise<string | null> }) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [left, setLeft] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const submitting = useRef(false);
  const errId = useId();

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const verify = useCallback(
    async (code: string) => {
      if (submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setErr("");
      const r = await postJson("/api/auth/verify-otp", { email, code });
      if (!r.ok) {
        setBusy(false);
        submitting.current = false;
        setErr(msgFor(r));
        if (r.error === "invalid_code") {
          setDigits(["", "", "", "", "", ""]);
          refs.current[0]?.focus();
        }
        return;
      }
      const verifyErr = await onVerified();
      setBusy(false);
      submitting.current = false;
      if (verifyErr) {
        setErr(verifyErr);
      }
    },
    [email, onVerified],
  );

  const fill = (start: number, raw: string) => {
    const nums = raw.replace(/\D/g, "").slice(0, 6 - start).split("");
    if (nums.length === 0) return;
    const next = [...digits];
    nums.forEach((n, i) => (next[start + i] = n));
    setDigits(next);
    setErr("");
    const end = Math.min(start + nums.length, 5);
    refs.current[end]?.focus();
    if (next.every((d) => d !== "")) void verify(next.join(""));
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && digits[i] === "" && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      setErr("");
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fill(0, e.clipboardData.getData("text"));
  };

  const resend = async () => {
    setErr("");
    setResent(false);
    const r = await postJson("/api/auth/request-otp", { email });
    if (r.ok) {
      setLeft(RESEND_SECONDS);
      setResent(true);
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } else setErr(msgFor(r));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (digits.every((d) => d)) void verify(digits.join(""));
      }}
    >
      <p className="text-label uppercase text-accent">Check your email</p>
      <h2 id="join-title" className="mt-3 text-ctitle text-ink">Enter the 6-digit code</h2>
      <p className="mb-6 mt-2 text-cell text-mute">
        We sent a code to <b className="font-semibold text-ink [overflow-wrap:anywhere]">{email}</b>. It expires in 10 minutes.
      </p>
      <div role="group" aria-label="6-digit code" className="grid grid-cols-6 gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-autofocus={i === 0 ? "" : undefined}
            autoFocus={i === 0}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            pattern="[0-9]*"
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={!!err}
            disabled={busy}
            onChange={(e) => fill(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.currentTarget.select()}
            className="h-14 w-full rounded-xl border border-hairline-strong bg-bg text-center text-stat tabular-nums text-ink outline-none transition focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60"
          />
        ))}
      </div>
      <ErrorLine id={errId}>{err}</ErrorLine>
      <div role="status" aria-live="polite" className="mt-3 min-h-5 text-meta text-mute">{resent && !err ? "A new code is on its way." : ""}</div>
      <button type="submit" disabled={busy || digits.some((d) => !d)} aria-busy={busy} className={`${BTN_PRIMARY} mt-3`}>
        {busy && <Spinner />}Verify
      </button>
      <div className="mt-4 flex items-center justify-between gap-3 text-meta">
        <button type="button" onClick={onBack} disabled={busy} className="inline-flex h-11 items-center rounded-full px-2 font-medium text-mute transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          Change email
        </button>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy || left > 0}
          className="inline-flex h-11 items-center rounded-full px-2 font-semibold text-accent transition disabled:cursor-not-allowed disabled:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {left > 0 ? `Resend in ${left}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────────── avatar uploader ────────────────────────────── */
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

interface SignPayload {
  ok: true;
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  overwrite: string;
  invalidate: string;
}
interface UploadResult {
  secure_url?: string;
  error?: { message: string };
}

function AvatarUploader({
  name,
  value,
  disabled,
  onUploadingChange,
  onError,
  onChange,
}: {
  name: string;
  value: string | null;
  disabled?: boolean;
  onUploadingChange: (uploading: boolean) => void;
  onError: (err: string) => void;
  onChange: (url: string | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const upload = async (file: File) => {
    onError("");
    if (!TYPES.includes(file.type)) return onError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return onError("That image is over 2 MB. Choose a smaller one.");
    setPreview(URL.createObjectURL(file)); // instant preview
    setProgress(0);
    onUploadingChange(true);
    const sign = await postJson<Omit<SignPayload, "ok">>("/api/avatar/sign", {});
    if (!sign.ok) {
      setProgress(null);
      setPreview(null);
      onUploadingChange(false);
      return onError(msgFor(sign));
    }
    const s = sign as SignPayload;
    const form = new FormData();
    form.set("file", file);
    form.set("api_key", s.apiKey);
    form.set("timestamp", String(s.timestamp));
    form.set("signature", s.signature);
    form.set("folder", s.folder);
    form.set("public_id", s.publicId);
    form.set("overwrite", s.overwrite);
    form.set("invalidate", s.invalidate);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", s.uploadUrl);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onerror = () => {
      setProgress(null);
      setPreview(null);
      onUploadingChange(false);
      onError("Upload failed. Check your connection and try again.");
    };
    xhr.onload = () => {
      setProgress(null);
      onUploadingChange(false);
      let body: UploadResult = {};
      try {
        body = JSON.parse(xhr.responseText) as UploadResult;
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) onChange(body.secure_url);
      else {
        setPreview(null);
        onError(body.error?.message ?? "Upload failed. Please try another image.");
      }
    };
    xhr.send(form);
  };

  const uploading = progress !== null;
  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar name={name || "You"} src={preview ?? value} size={64} />
        <div className="min-w-0">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            disabled={disabled || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={disabled || uploading}
            aria-busy={uploading}
            className={`${BTN_GHOST} !w-auto`}
          >
            {uploading ? <Spinner /> : null}
            {value || preview ? "Change photo" : "Upload photo"}
          </button>
          <p className="mt-2 text-meta text-faint">JPG, PNG or WebP, up to 2 MB.</p>
        </div>
      </div>
      {uploading && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? 0} aria-label="Upload progress">
          <div className="h-full rounded-full bg-linear-to-r from-accent to-accent-2 transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── step 3: profile ────────────────────────────── */
function ProfileStep({ photoOnly, onSessionExpired, onDone }: { photoOnly?: boolean; onSessionExpired?: (msg: string) => void; onDone: () => void }) {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl ?? null);
  const [showName, setShowName] = useState(user?.showName ?? true);
  const [showPhoto, setShowPhoto] = useState(user?.showPhoto ?? true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const errId = useId();

  const handleAvatarError = (msg: string) => {
    if (msg.includes("session expired") && onSessionExpired) {
      onSessionExpired(msg);
      return;
    }
    setErr(msg);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || uploading) return;
    const n = name.trim();
    if (!photoOnly && (n.length < 2 || n.length > 30)) return setErr("Display name must be 2 to 30 characters.");
    setBusy(true);
    setErr("");
    const body = photoOnly ? { avatarUrl: avatar } : { name: n, avatarUrl: avatar, showName, showPhoto };
    const r = await postJson("/api/me", body, "PATCH");
    if (!r.ok) {
      setBusy(false);
      if ((r.error === "unauthorized" || r.error === "forbidden") && onSessionExpired) {
        onSessionExpired(msgFor(r));
        return;
      }
      return setErr(msgFor(r));
    }
    const me = await refresh();
    setBusy(false);
    if (!me.user) {
      if (onSessionExpired) {
        onSessionExpired("Your session expired. Please verify your email again.");
        return;
      }
      return setErr("Failed to verify user session.");
    }
    onDone();
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <p className="text-label uppercase text-accent">{photoOnly ? "Your photo" : "Almost there"}</p>
      <h2 id="join-title" className="mt-3 text-ctitle text-ink">{photoOnly ? "Change your photo" : "Set up your profile"}</h2>
      <p className="mb-6 mt-2 text-cell text-mute">
        {photoOnly ? "Your new photo appears on your rank card and the leaderboard." : "Choose how your identity appears on your rank card and the championship leaderboard."}
      </p>
      {!photoOnly && (
        <div className="mb-5">
          <label htmlFor="join-name" className="mb-2 block text-meta font-medium text-ink">Display name</label>
          <input
            id="join-name"
            data-autofocus
            autoFocus
            value={name}
            disabled={busy || uploading}
            onChange={(e) => { setName(e.target.value); setErr(""); }}
            minLength={2}
            maxLength={30}
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={!!err}
            aria-describedby={err ? errId : undefined}
            className={FIELD}
          />
        </div>
      )}
      <AvatarUploader
        name={name || user?.name || "You"}
        value={avatar}
        disabled={busy}
        onUploadingChange={setUploading}
        onError={handleAvatarError}
        onChange={(url) => {
          setAvatar(url);
          setErr("");
        }}
      />
      {!photoOnly && (
        <div className="mt-5 space-y-3 rounded-2xl border border-hairline bg-alt p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="block text-cell font-medium text-ink">Show my display name</span>
              <span className="block text-meta text-mute">If off, you appear as &ldquo;Anonymous trader&rdquo; everywhere.</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showName}
              disabled={busy || uploading}
              onClick={() => { setShowName(!showName); setErr(""); }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                showName ? "bg-accent" : "bg-hairline-strong"
              }`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                  showName ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="border-t border-hairline pt-3 flex items-center justify-between gap-3">
            <div>
              <span className="block text-cell font-medium text-ink">Show my photo</span>
              <span className="block text-meta text-mute">If off, initials are displayed instead of your avatar.</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showPhoto}
              disabled={busy || uploading}
              onClick={() => { setShowPhoto(!showPhoto); setErr(""); }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                showPhoto ? "bg-accent" : "bg-hairline-strong"
              }`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                  showPhoto ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      )}
      <ErrorLine id={errId}>{err}</ErrorLine>
      <button type="submit" disabled={busy || uploading} aria-busy={busy || uploading} className={`${BTN_PRIMARY} mt-5`}>
        {(busy || uploading) && <Spinner />}{photoOnly ? "Save photo" : "Finish"}
      </button>
    </form>
  );
}

/* ─────────────────────────── step 4: success ────────────────────────────── */
function SuccessStep({ onClose }: { onClose: () => void }) {
  const { user, entry } = useAuth();
  if (!user) return null;
  return (
    <div>
      <p className="text-label uppercase text-accent">You are in</p>
      <h2 id="join-title" className="mt-3 text-ctitle text-ink">{entry ? `You are #${entry.rank} on the board` : "Welcome to the Championship"}</h2>
      <p className="mb-5 mt-2 text-cell text-mute">Share your rank card and challenge other traders.</p>
      <ShareCard userId={user.id} rank={entry?.rank ?? null} />
      <button type="button" onClick={onClose} data-autofocus className={`${BTN_GHOST} mt-2`}>Done</button>
    </div>
  );
}

/* ─────────────────────────── the modal ──────────────────────────────────── */
type Step = "email" | "otp" | "profile" | "success";

export default function JoinModal() {
  const { modal, closeModal, user, refresh } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [authError, setAuthError] = useState("");

  // reset whenever the join modal (re)opens
  useEffect(() => {
    if (modal === "join") {
      setStep("email");
      setAuthError("");
    }
  }, [modal]);

  const afterVerify = useCallback(async (): Promise<string | null> => {
    const me = await refresh();
    if (!me.user) {
      return "Unable to retrieve user session. Please try again.";
    }
    setStep(me.user.profileComplete ? "success" : "profile");
    return null;
  }, [refresh]);

  const handleSessionExpired = useCallback((msg: string) => {
    setAuthError(msg);
    setStep("email");
  }, []);

  if (!modal) return null;

  if (modal === "card") {
    return (
      <Shell titleId="join-title" onClose={closeModal}>
        {user ? <SuccessStep onClose={closeModal} /> : null}
      </Shell>
    );
  }
  if (modal === "photo") {
    return (
      <Shell titleId="join-title" onClose={closeModal}>
        <ProfileStep photoOnly onSessionExpired={handleSessionExpired} onDone={closeModal} />
      </Shell>
    );
  }
  return (
    <Shell titleId="join-title" onClose={closeModal}>
      {step === "email" && (
        <EmailStep
          initialEmail={email}
          initialError={authError}
          onSent={(e) => {
            setEmail(e);
            setAuthError("");
            setStep("otp");
          }}
        />
      )}
      {step === "otp" && (
        <OtpStep
          email={email}
          onBack={() => setStep("email")}
          onVerified={afterVerify}
        />
      )}
      {step === "profile" && (
        <ProfileStep
          onSessionExpired={handleSessionExpired}
          onDone={() => setStep("success")}
        />
      )}
      {step === "success" && <SuccessStep onClose={closeModal} />}
    </Shell>
  );
}
