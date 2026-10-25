"use client";

import { useEffect, useState, useCallback } from "react";
import { FormField, SwitchField } from "@/components/admin/FormField";
import { useToast } from "@/components/admin/Toast";
import type { SiteSettingsData } from "@/lib/defaults";

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: "FOGM Trading Championship is undergoing scheduled maintenance. We will be back online shortly.",
  });
  const [dataSource, setDataSource] = useState<SiteSettingsData["dataSource"]>("mock");

  // Actions
  const [sendingEmail, setSendingEmail] = useState(false);
  const [revalidating, setRevalidating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      if (data.maintenance) {
        setMaintenance({
          enabled: Boolean(data.maintenance.enabled),
          message: data.maintenance.message || "FOGM Trading Championship is undergoing scheduled maintenance.",
        });
      }
      if (data.dataSource) {
        setDataSource(data.dataSource);
      }
    } catch {
      showToast("Could not load system settings", "error");
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
        body: JSON.stringify({ maintenance, dataSource }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      showToast("System settings saved successfully", "success");
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send test email");
      }
      showToast("Test email sent to your admin address!", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Test email failed", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRevalidate = async () => {
    setRevalidating(true);
    try {
      const res = await fetch("/api/admin/settings/revalidate", { method: "POST" });
      if (!res.ok) throw new Error("Revalidation failed");
      showToast("Settings cache successfully revalidated across all nodes", "success");
    } catch {
      showToast("Revalidation failed", "error");
    } finally {
      setRevalidating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        <svg className="animate-spin size-5 mr-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">System & Environment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage data source mode, maintenance lock, cache invalidation, and diagnostic mail delivery.
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

      {/* Maintenance Mode */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Maintenance Mode</h2>
          <p className="text-xs text-muted-foreground">
            When enabled, public visitors are shown a maintenance screen. Admin pages remain accessible.
          </p>
        </div>

        <SwitchField
          label="Enable Maintenance Mode"
          description="Temporarily take the public site offline for all visitors."
          checked={maintenance.enabled}
          onChange={(checked) => setMaintenance({ ...maintenance, enabled: checked })}
        />

        {maintenance.enabled && (
          <FormField label="Maintenance Message" hint="Shown to public visitors on the maintenance screen">
            <textarea
              rows={3}
              value={maintenance.message}
              onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
              className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
        )}
      </div>

      {/* Data Source Mode */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Data Source Mode</h2>
          <p className="text-xs text-muted-foreground">
            Select the source of contest metrics and leaderboard standings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: "mock" as const,
              title: "Mock Data (Seeded)",
              desc: "Deterministic mock dataset of 50 global traders generated via seeded PRNG. Great for demos and testing.",
            },
            {
              id: "database" as const,
              title: "Database Collection",
              desc: "Pulls live traders from MongoDB Trader collection, populated via Admin CSV import or direct updates.",
            },
            {
              id: "external" as const,
              title: "External Integration",
              desc: "Prepares system for external webhook or broker sync feed. Falls back to DB collection if inactive.",
            },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setDataSource(mode.id)}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-colors ${
                dataSource === mode.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-border/80 bg-background"
              }`}
            >
              <div>
                <span className="text-sm font-bold text-foreground block">{mode.title}</span>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{mode.desc}</p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
                {dataSource === mode.id ? "● Active Source" : "Select this"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostics & Operations */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Operations & Diagnostics</h2>
          <p className="text-xs text-muted-foreground">Verify infrastructure services and clear cache tags.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-border bg-muted/20 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Revalidate Cache</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Forces immediate cache invalidation for the &apos;settings&apos; tag across Next.js Cache Components.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRevalidate}
              disabled={revalidating}
              className="mt-4 px-3.5 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors self-start disabled:opacity-50"
            >
              {revalidating ? "Revalidating..." : "Revalidate Site Cache"}
            </button>
          </div>

          <div className="p-4 rounded-lg border border-border bg-muted/20 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Test Email Delivery</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Dispatches a verification test email via configured SMTP to your designated ADMIN_EMAIL address.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={sendingEmail}
              className="mt-4 px-3.5 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors self-start disabled:opacity-50"
            >
              {sendingEmail ? "Sending..." : "Send Test Email"}
            </button>
          </div>
        </div>

        {/* Security / Admin Env Note */}
        <div className="p-4 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Admin Authentication & Security</p>
          <p>
            Admin credentials and secret keys are stored strictly in the server environment (
            <code className="font-mono text-foreground font-semibold">.env</code>). No administrator records or credentials exist in the database.
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-1">
            Active session: Authenticated via secure HTTP-only JWT cookie (<code className="font-mono">fogm_admin</code>).
          </p>
        </div>
      </div>
    </div>
  );
}
