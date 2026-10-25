"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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

      const data = await res.json() as { ok?: boolean; message?: string; error?: string };

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xl mb-3 shadow-md">
            F
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Portal</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Sign in with server environment credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@domain.com"
              className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Sign In to Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
