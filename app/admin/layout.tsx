import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { isAdminConfigured, requireAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: { default: "Admin", template: "%s | FOGM Admin" },
};

async function AdminAuthGuard({ children }: { children: ReactNode }) {
  if (!isAdminConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 font-sans">
        <div className="max-w-md w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center shadow-xl">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mb-4 font-bold text-xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin is not configured</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            The server administrator must set <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">ADMIN_EMAIL</code>, <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">ADMIN_PASSWORD</code> (≥ 12 chars), and <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">ADMIN_SESSION_SECRET</code> (≥ 32 chars) in the server environment.
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

  return <AdminShell>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
          Loading administration...
        </div>
      }
    >
      <AdminAuthGuard>{children}</AdminAuthGuard>
    </Suspense>
  );
}
