"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/admin/AdminPrimitives";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };

      if (res.ok && data.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        if (res.status === 429) {
          setError(data.message ?? "Too many attempts. Please try again later.");
        } else {
          setError("Invalid credentials.");
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bg p-4 font-sans overflow-hidden">
      {/* Background Animated Blobs & Grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="f-blob a absolute -top-40 -left-40 size-96 rounded-full opacity-30" />
        <div className="f-blob b absolute -bottom-40 -right-40 size-96 rounded-full opacity-25" />
        <div className="fg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_center,black_40%,transparent_80%)]" />
      </div>

      <div className="relative w-full max-w-sm rounded-3xl border border-hairline-strong bg-card/90 backdrop-blur-xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-accent to-accent-2 text-accent-ink font-bold text-2xl mb-3 shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--accent)_60%,transparent)]">
            F
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Admin Portal</h1>
          <p className="mt-1 text-meta text-mute">
            Sign in with server environment credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email Address" required>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@domain.com"
            />
          </Field>

          <Field label="Password" required>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </Field>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-down/30 bg-down/10 p-3 text-meta font-medium text-down"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            loading={busy}
            className="w-full h-11 font-semibold"
          >
            {busy ? "Verifying…" : "Sign In to Admin"}
          </Button>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-faint">
              Protected by rate limiting & encrypted session cookies
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
