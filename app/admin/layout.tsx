import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { isAdminConfigured, requireAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: { default: "Admin", template: "%s | FOGM Admin" },
};

async function AdminAuthGuard({ children }: { children: ReactNode }) {
  if (!isAdminConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4 font-sans text-ink">
        <div className="max-w-md w-full rounded-2xl border border-hairline bg-card p-8 text-center shadow-2xl">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 mb-4 font-bold text-xl">
            ⚠️
          </div>
          <h1 className="text-ctitle font-bold text-ink">Admin is not configured</h1>
          <p className="mt-2 text-cell text-mute leading-relaxed">
            The server administrator must set <code className="font-mono text-meta bg-alt px-1.5 py-0.5 rounded-lg border border-hairline">ADMIN_EMAIL</code>, <code className="font-mono text-meta bg-alt px-1.5 py-0.5 rounded-lg border border-hairline">ADMIN_PASSWORD</code> (≥ 12 chars), and <code className="font-mono text-meta bg-alt px-1.5 py-0.5 rounded-lg border border-hairline">ADMIN_SESSION_SECRET</code> (≥ 32 chars) in the server environment.
          </p>
        </div>
      </div>
    );
  }

  const h = await headers();
  const pathname = h.get("x-pathname") || "";

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  let accentStyle = "";
  try {
    const settings = await getSettings();
    if (settings?.theme?.light?.accent) {
      accentStyle = `--accent: ${settings.theme.light.accent}; --accent-2: ${settings.theme.light.accent2 || settings.theme.light.accent};`;
    }
  } catch {
    /* fallback to default accent */
  }

  return (
    <div className="fogm min-h-screen bg-bg text-ink" style={accentStyle ? ({ cssText: accentStyle } as unknown as React.CSSProperties) : undefined}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg text-cell text-mute">
          <div className="inline-flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span>Loading administration…</span>
          </div>
        </div>
      }
    >
      <AdminAuthGuard>{children}</AdminAuthGuard>
    </Suspense>
  );
}
