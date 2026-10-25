"use client";

import { useState, useMemo } from "react";
import {
  PageHeader,
  Card,
  Button,
  Field,
  Textarea,
  Switch,
  UnsavedBar,
  Skeleton,
  Badge,
} from "@/components/admin/AdminPrimitives";
import { useToast } from "@/components/admin/Toast";
import type { SiteSettingsData } from "@/lib/defaults";
import { useFetch } from "@/lib/use-async";

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: "FOGM Trading Championship is undergoing scheduled maintenance. We will be back online shortly.",
  });
  const [dataSource, setDataSource] = useState<SiteSettingsData["dataSource"]>("mock");

  const [initialState, setInitialState] = useState<{
    maintenance: { enabled: boolean; message: string };
    dataSource: SiteSettingsData["dataSource"];
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    ok: boolean;
    latencyMs?: number;
    message?: string;
  } | null>(null);

  const { loading, error, refetch } = useFetch(async () => {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) throw new Error("Failed to load settings");
    const data = await res.json();

    const loadedMaintenance = {
      enabled: Boolean(data.maintenance?.enabled),
      message: data.maintenance?.message || "FOGM Trading Championship is undergoing scheduled maintenance.",
    };
    const loadedDataSource = (data.dataSource as SiteSettingsData["dataSource"]) || "mock";

    setMaintenance(loadedMaintenance);
    setDataSource(loadedDataSource);
    setInitialState({
      maintenance: loadedMaintenance,
      dataSource: loadedDataSource,
    });
    return data;
  }, []);

  const isDirty = useMemo(() => {
    if (!initialState) return false;
    return (
      maintenance.enabled !== initialState.maintenance.enabled ||
      maintenance.message !== initialState.maintenance.message ||
      dataSource !== initialState.dataSource
    );
  }, [maintenance, dataSource, initialState]);

  const handleDiscard = () => {
    if (!initialState) return;
    setMaintenance(initialState.maintenance);
    setDataSource(initialState.dataSource);
    showToast("Changes discarded", "info");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance, dataSource }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setInitialState({ maintenance, dataSource });
      showToast("System settings saved successfully", "success");
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    const start = performance.now();
    try {
      const res = await fetch("/api/admin/stats");
      const elapsed = Math.round(performance.now() - start);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConnectionStatus({
        ok: true,
        latencyMs: elapsed,
        message: `Successfully connected to ${dataSource.toUpperCase()} feed (${elapsed}ms)`,
      });
      showToast(`Connection healthy (${elapsed}ms)`, "success");
    } catch (e) {
      setConnectionStatus({
        ok: false,
        message: e instanceof Error ? e.message : "Connection failed",
      });
      showToast("Data source connection check failed", "error");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send test email");
      showToast("Test email sent to designated ADMIN_EMAIL address!", "success");
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
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <p className="text-down font-medium">Failed to load system settings</p>
        <Button variant="secondary" size="sm" onClick={refetch} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings & System"
        description="Manage data source mode, maintenance lock, cache invalidation, and diagnostic mail delivery."
      >
        <Button onClick={handleSave} loading={saving} disabled={!isDirty}>
          Save Changes
        </Button>
      </PageHeader>

      {/* Maintenance Mode */}
      <Card className="space-y-5">
        <div>
          <h2 className="text-sub font-semibold text-ink">Maintenance Mode</h2>
          <p className="text-cell text-mute mt-0.5">
            When enabled, public visitors see a maintenance screen. Admin pages remain fully accessible.
          </p>
        </div>

        <div className="flex items-center justify-between py-2 border-y border-hairline">
          <div>
            <span className="text-cell font-semibold text-ink block">Enable Maintenance Mode</span>
            <span className="text-meta text-mute">Take public contest pages temporarily offline.</span>
          </div>
          <Switch
            checked={maintenance.enabled}
            onChange={(checked) => setMaintenance({ ...maintenance, enabled: checked })}
          />
        </div>

        {maintenance.enabled && (
          <Field label="Maintenance Message" hint="Shown to public visitors on maintenance screen">
            <Textarea
              rows={3}
              value={maintenance.message}
              onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
            />
          </Field>
        )}
      </Card>

      {/* Data Source Mode */}
      <Card className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sub font-semibold text-ink">Data Source Mode</h2>
            <p className="text-cell text-mute mt-0.5">
              Select the active source of contest metrics and leaderboard standings.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTestConnection}
            loading={testingConnection}
          >
            Test Connection
          </Button>
        </div>

        {connectionStatus && (
          <div
            className={`p-3.5 rounded-xl border text-meta font-medium flex items-center justify-between ${
              connectionStatus.ok
                ? "bg-up/10 border-up/30 text-up"
                : "bg-down/10 border-down/30 text-down"
            }`}
          >
            <span>{connectionStatus.message}</span>
            {connectionStatus.latencyMs !== undefined && (
              <Badge variant="up">{connectionStatus.latencyMs} ms</Badge>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              id: "mock" as const,
              title: "Mock Data (Seeded)",
              desc: "Deterministic mock dataset of 50 global traders generated via seeded PRNG. Great for demos and offline staging.",
            },
            {
              id: "database" as const,
              title: "Database Collection",
              desc: "Pulls live traders from MongoDB Trader collection, populated via Admin CSV import or direct management.",
            },
            {
              id: "external" as const,
              title: "External Integration",
              desc: "Prepares system for external webhook or broker sync feed. Automatically falls back to DB collection if inactive.",
            },
          ].map((mode) => {
            const isSelected = dataSource === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setDataSource(mode.id)}
                className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition ${
                  isSelected
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-hairline bg-card hover:border-hairline-strong"
                }`}
              >
                <div>
                  <span className="text-cell font-bold text-ink block">{mode.title}</span>
                  <p className="text-meta text-mute mt-2 leading-relaxed">{mode.desc}</p>
                </div>
                <div className="mt-5 flex items-center gap-2 text-meta font-semibold">
                  {isSelected ? (
                    <Badge variant="accent">● Active Source</Badge>
                  ) : (
                    <span className="text-faint hover:text-ink">Select source</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Diagnostics & Operations */}
      <Card className="space-y-5">
        <div>
          <h2 className="text-sub font-semibold text-ink">Operations & Diagnostics</h2>
          <p className="text-cell text-mute mt-0.5">
            Verify infrastructure services, dispatch test notifications, and invalidate cache tags.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-hairline bg-card flex flex-col justify-between">
            <div>
              <h3 className="text-cell font-semibold text-ink">Revalidate Site Cache</h3>
              <p className="text-meta text-mute mt-1 leading-relaxed">
                Forces immediate cache invalidation for the &apos;settings&apos; tag across Next.js Cache Components.
              </p>
            </div>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRevalidate}
                loading={revalidating}
              >
                Revalidate Site Cache
              </Button>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-hairline bg-card flex flex-col justify-between">
            <div>
              <h3 className="text-cell font-semibold text-ink">Test Email Delivery</h3>
              <p className="text-meta text-mute mt-1 leading-relaxed">
                Dispatches a test verification email via configured SMTP to your designated ADMIN_EMAIL address.
              </p>
            </div>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTestEmail}
                loading={sendingEmail}
              >
                Send Test Email
              </Button>
            </div>
          </div>
        </div>

        {/* Read-Only Admin Security Note */}
        <div className="p-4 rounded-xl bg-alt border border-hairline text-meta text-mute space-y-1">
          <p className="font-semibold text-ink">Admin Authentication & Security</p>
          <p>
            Admin credentials and secret keys are stored strictly in the server environment (
            <code className="font-mono text-ink font-semibold">.env</code>). No administrator records or credentials exist in the database.
          </p>
          <p className="text-[11px] text-faint mt-1">
            Active session: Authenticated via secure HTTP-only JWT cookie (<code className="font-mono">fogm_admin</code>).
          </p>
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
