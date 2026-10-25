"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/admin/AdminPrimitives";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { useFetch } from "@/lib/use-async";

interface TraderRow {
  id: string;
  name: string;
  countryCode: string;
  city: string;
  netProfit: number;
  returnPct: number;
  winRatePct: number;
  maxDrawdownPct: number;
  tradesCount: number;
  volumeLots: number;
  topInstrument: string;
  trend?: number[];
  period: "today" | "week" | "overall";
  previousRank: number | null;
  userId?: string | null;
}

interface TradersResponse {
  total: number;
  page: number;
  pageSize: number;
  traders: TraderRow[];
}

function countryFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  const upper = code.toUpperCase();
  const c1 = 127397 + upper.charCodeAt(0);
  const c2 = 127397 + upper.charCodeAt(1);
  return String.fromCodePoint(c1, c2);
}

export default function AdminLeaderboardPage() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<"today" | "week" | "overall">("overall");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  // Drawer / Editing state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTrader, setEditingTrader] = useState<Partial<TraderRow> | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Import Modal
  const [importOpen, setImportOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importing, setImporting] = useState(false);

  const { data, loading, error, reload } = useFetch<TradersResponse>(async () => {
    const qs = new URLSearchParams({
      period,
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search.trim()) qs.set("search", search.trim());

    const res = await fetch(`/api/admin/traders?${qs.toString()}`);
    if (!res.ok) throw new Error("Failed to load traders");
    return (await res.json()) as TradersResponse;
  }, [period, page, pageSize, search]);

  const openNewTrader = () => {
    setEditingTrader({
      name: "",
      countryCode: "US",
      city: "",
      netProfit: 0,
      returnPct: 0,
      winRatePct: 50,
      maxDrawdownPct: 5,
      tradesCount: 10,
      volumeLots: 10,
      topInstrument: "EURUSD",
      period,
      trend: Array(14).fill(0),
    });
    setDrawerOpen(true);
  };

  const openEditTrader = (t: TraderRow) => {
    setEditingTrader({ ...t });
    setDrawerOpen(true);
  };

  const handleSaveTrader = async () => {
    if (!editingTrader || saving) return;
    setSaving(true);
    try {
      const isNew = !editingTrader.id;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch("/api/admin/traders", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingTrader,
          netProfit: Number(editingTrader.netProfit) || 0,
          returnPct: Number(editingTrader.returnPct) || 0,
          winRatePct: Number(editingTrader.winRatePct) || 0,
          maxDrawdownPct: Number(editingTrader.maxDrawdownPct) || 0,
          tradesCount: Math.round(Number(editingTrader.tradesCount)) || 0,
          volumeLots: Number(editingTrader.volumeLots) || 0,
          trend: editingTrader.trend ?? Array(14).fill(0),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Failed to save trader");
      }

      showToast(isNew ? "Trader created successfully" : "Trader updated successfully");
      setDrawerOpen(false);
      reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrader = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/traders?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Trader removed from leaderboard");
      setDeleteId(null);
      reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to delete", "error");
    }
  };

  const handleImportJson = async () => {
    if (!jsonText.trim() || importing) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error("Import data must be a JSON array of trader records.");
      }

      const res = await fetch("/api/admin/traders/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          mode: importMode,
          traders: parsed,
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errJson?.message ?? "Import rejected by server");
      }

      showToast(`Successfully imported ${parsed.length} leaderboard records`);
      setImportOpen(false);
      setJsonText("");
      reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "JSON parsing or import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  const columns: Column<TraderRow>[] = [
    {
      key: "rank",
      header: "Rank",
      align: "center",
      render: (_row: TraderRow, i?: number) => {
        const rankNum = (page - 1) * pageSize + (i !== undefined ? i + 1 : 1);
        return (
          <span className="font-bold text-ink tabular-nums text-meta">
            #{rankNum}
          </span>
        );
      },
    },
    {
      key: "name",
      header: "Trader",
      sortable: true,
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-alt border border-hairline font-bold flex items-center justify-center text-xs text-ink">
            {t.name ? t.name.slice(0, 2).toUpperCase() : "??"}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-ink truncate">{t.name}</div>
            <div className="flex items-center gap-1 text-[11px] text-mute">
              <span>{countryFlagEmoji(t.countryCode)}</span>
              <span>{t.city ? `${t.city}, ` : ""}{t.countryCode}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "netProfit",
      header: "Net Profit (USD)",
      sortable: true,
      align: "right",
      render: (t) => (
        <span className="font-bold font-mono text-cell text-up tabular-nums">
          +${t.netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "returnPct",
      header: "Return",
      sortable: true,
      align: "right",
      render: (t) => (
        <span className="font-semibold text-meta tabular-nums text-ink">
          +{t.returnPct.toFixed(1)}%
        </span>
      ),
    },
    {
      key: "winRatePct",
      header: "Win Rate",
      sortable: true,
      align: "right",
      render: (t) => (
        <span className="text-meta text-mute tabular-nums">
          {t.winRatePct.toFixed(1)}%
        </span>
      ),
    },
    {
      key: "tradesCount",
      header: "Trades",
      sortable: true,
      align: "right",
      render: (t) => <span className="text-meta text-mute tabular-nums">{t.tradesCount}</span>,
    },
    {
      key: "topInstrument",
      header: "Instrument",
      render: (t) => (
        <Badge variant="mute">{t.topInstrument}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openEditTrader(t)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-down hover:bg-down/10"
            onClick={() => setDeleteId(t.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-[f-fadein_.3s_ease-out]">
      <PageHeader
        title="Leaderboard Data"
        description="Manage championship trading participants, simulated ranks, and performance metrics."
      >
        <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
          Bulk Import JSON
        </Button>
        <Button variant="primary" size="sm" onClick={openNewTrader}>
          + Add Trader
        </Button>
      </PageHeader>

      {/* Period Tabs & Search */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Period selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-hairline bg-alt p-1">
            {(["overall", "week", "today"] as const).map((p) => {
              const active = period === p;
              const labels = { overall: "All-Time", week: "This Week", today: "Today" };
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPeriod(p);
                    setPage(1);
                  }}
                  className={`rounded-lg px-4 py-1.5 text-meta font-semibold transition ${
                    active
                      ? "bg-card text-ink shadow-xs"
                      : "text-mute hover:text-ink"
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-72">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search trader name…"
            />
          </div>
        </div>
      </Card>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={data?.traders ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={loading}
        error={error}
        onPageChange={setPage}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(1);
        }}
        onRowClick={openEditTrader}
      />

      {/* Edit / Add Trader Drawer */}
      <Drawer
        isOpen={drawerOpen}
        title={editingTrader?.id ? "Edit Leaderboard Trader" : "Add Leaderboard Trader"}
        description={`Period: ${period.toUpperCase()}`}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={saving} disabled={saving} onClick={handleSaveTrader}>
              {editingTrader?.id ? "Update Trader" : "Create Trader"}
            </Button>
          </div>
        }
      >
        {editingTrader && (
          <div className="space-y-4">
            <Field label="Trader Full Name" required>
              <Input
                value={editingTrader.name ?? ""}
                onChange={(e) => setEditingTrader({ ...editingTrader, name: e.target.value })}
                placeholder="e.g. Liam Henderson"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Country Code" hint="2-letter ISO" required>
                <Input
                  maxLength={2}
                  value={editingTrader.countryCode ?? ""}
                  onChange={(e) => setEditingTrader({ ...editingTrader, countryCode: e.target.value.toUpperCase() })}
                  placeholder="GB"
                  className="font-mono uppercase"
                />
              </Field>

              <Field label="City">
                <Input
                  value={editingTrader.city ?? ""}
                  onChange={(e) => setEditingTrader({ ...editingTrader, city: e.target.value })}
                  placeholder="London"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Net Profit ($)" required>
                <Input
                  type="number"
                  step="any"
                  value={editingTrader.netProfit ?? 0}
                  onChange={(e) => setEditingTrader({ ...editingTrader, netProfit: parseFloat(e.target.value) || 0 })}
                  className="font-mono"
                />
              </Field>

              <Field label="Return %" required>
                <Input
                  type="number"
                  step="any"
                  value={editingTrader.returnPct ?? 0}
                  onChange={(e) => setEditingTrader({ ...editingTrader, returnPct: parseFloat(e.target.value) || 0 })}
                  className="font-mono"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Win Rate %">
                <Input
                  type="number"
                  step="0.1"
                  value={editingTrader.winRatePct ?? 50}
                  onChange={(e) => setEditingTrader({ ...editingTrader, winRatePct: parseFloat(e.target.value) || 0 })}
                  className="font-mono"
                />
              </Field>

              <Field label="Max Drawdown %">
                <Input
                  type="number"
                  step="0.1"
                  value={editingTrader.maxDrawdownPct ?? 5}
                  onChange={(e) => setEditingTrader({ ...editingTrader, maxDrawdownPct: parseFloat(e.target.value) || 0 })}
                  className="font-mono"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Total Trades">
                <Input
                  type="number"
                  value={editingTrader.tradesCount ?? 10}
                  onChange={(e) => setEditingTrader({ ...editingTrader, tradesCount: parseInt(e.target.value) || 0 })}
                  className="font-mono"
                />
              </Field>

              <Field label="Top Instrument">
                <Input
                  value={editingTrader.topInstrument ?? "EURUSD"}
                  onChange={(e) => setEditingTrader({ ...editingTrader, topInstrument: e.target.value.toUpperCase() })}
                  placeholder="EURUSD"
                  className="font-mono"
                />
              </Field>
            </div>
          </div>
        )}
      </Drawer>

      {/* Bulk Import JSON Drawer */}
      <Drawer
        isOpen={importOpen}
        title="Bulk Import Traders (JSON)"
        description={`Import into '${period.toUpperCase()}' period`}
        onClose={() => setImportOpen(false)}
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={importing} disabled={importing || !jsonText.trim()} onClick={handleImportJson}>
              Import Records
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Import Mode">
            <Select
              value={importMode}
              options={[
                { value: "append", label: "Append to existing traders" },
                { value: "replace", label: "Replace all traders for this period" },
              ]}
              onChange={(val) => setImportMode(val as "append" | "replace")}
            />
          </Field>

          <Field label="Paste JSON Array" hint="Array of trader objects matching schema">
            <textarea
              rows={12}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='[{"name": "Trader Name", "countryCode": "US", "city": "New York", "netProfit": 12500, "returnPct": 42.5, "winRatePct": 65, "maxDrawdownPct": 8, "tradesCount": 45, "volumeLots": 20, "topInstrument": "XAUUSD"}]'
              className="w-full rounded-xl border border-hairline-strong bg-bg p-3.5 font-mono text-meta text-ink outline-none transition focus-visible:border-accent"
            />
          </Field>
        </div>
      </Drawer>

      {/* Delete Trader Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Delete Leaderboard Trader?"
        description="This removes the trader from the specified period leaderboard ranking."
        confirmText="Yes, Delete"
        danger
        onConfirm={() => deleteId && handleDeleteTrader(deleteId)}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
