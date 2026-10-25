"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { FormField } from "@/components/admin/FormField";

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

export default function AdminLeaderboardPage() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<"today" | "week" | "overall">("overall");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<TradersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer / Editing state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTrader, setEditingTrader] = useState<Partial<TraderRow> | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // CSV Import Modal
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importing, setImporting] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<{ valid: number; errors: { row: number; error: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTraders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        period,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) qs.set("search", search);

      const res = await fetch(`/api/admin/traders?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to load traders");
      const json = await res.json() as TradersResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading traders");
    } finally {
      setLoading(false);
    }
  }, [period, page, pageSize, search]);

  useEffect(() => {
    void loadTraders();
  }, [loadTraders]);

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
    if (!editingTrader) return;
    setSaving(true);
    try {
      const isNew = !editingTrader.id;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch("/api/admin/traders", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingTrader,
          netProfit: Number(editingTrader.netProfit ?? 0),
          returnPct: Number(editingTrader.returnPct ?? 0),
          winRatePct: Number(editingTrader.winRatePct ?? 0),
          maxDrawdownPct: Number(editingTrader.maxDrawdownPct ?? 0),
          tradesCount: Number(editingTrader.tradesCount ?? 0),
          volumeLots: Number(editingTrader.volumeLots ?? 0),
          trend: Array.isArray(editingTrader.trend) && editingTrader.trend.length === 14
            ? editingTrader.trend
            : Array.from({ length: 14 }, (_, i) => Math.round((Number(editingTrader.netProfit ?? 0) * (i + 1)) / 14)),
        }),
      });
      if (!res.ok) throw new Error("Failed to save trader");
      showToast(isNew ? "Trader added" : "Trader updated");
      setDrawerOpen(false);
      void loadTraders();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrader = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/traders?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete trader");
      showToast("Trader deleted");
      setDeleteId(null);
      void loadTraders();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const handleDryRun = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/admin/traders/import?dryRun=true&mode=${importMode}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvText,
      });
      const json = await res.json() as { valid: number; errors: { row: number; error: string }[] };
      setDryRunResult({ valid: json.valid ?? 0, errors: json.errors ?? [] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Dry run failed", "error");
    } finally {
      setImporting(false);
    }
  };

  const handleCommitImport = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/admin/traders/import?dryRun=false&mode=${importMode}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvText,
      });
      if (!res.ok) {
        const errJson = await res.json() as { message?: string };
        throw new Error(errJson.message ?? "Import failed");
      }
      showToast("Traders imported successfully");
      setImportOpen(false);
      setCsvText("");
      setDryRunResult(null);
      void loadTraders();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(String(ev.target?.result ?? ""));
      setDryRunResult(null);
    };
    reader.readAsText(file);
  };

  const columns: Column<TraderRow>[] = [
    {
      key: "name",
      header: "Trader",
      render: (t) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{t.name}</div>
          <div className="text-xs text-gray-500">{t.city ? `${t.city}, ` : ""}{t.countryCode}</div>
        </div>
      ),
    },
    {
      key: "netProfit",
      header: "Net Profit (USD)",
      align: "right",
      render: (t) => (
        <span className={`font-mono font-semibold ${t.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {t.netProfit >= 0 ? "+" : ""}${t.netProfit.toLocaleString()}
        </span>
      ),
    },
    {
      key: "returnPct",
      header: "Return",
      align: "right",
      render: (t) => <span className="font-mono">{t.returnPct}%</span>,
    },
    {
      key: "winRatePct",
      header: "Win Rate",
      align: "right",
      render: (t) => <span className="font-mono">{t.winRatePct}%</span>,
    },
    {
      key: "maxDrawdownPct",
      header: "Drawdown",
      align: "right",
      render: (t) => <span className="font-mono text-red-500">{t.maxDrawdownPct}%</span>,
    },
    {
      key: "tradesCount",
      header: "Trades",
      align: "right",
      render: (t) => <span className="font-mono">{t.tradesCount}</span>,
    },
    {
      key: "volumeLots",
      header: "Lots",
      align: "right",
      render: (t) => <span className="font-mono">{t.volumeLots}</span>,
    },
    {
      key: "topInstrument",
      header: "Instrument",
      render: (t) => <span className="font-mono text-xs font-semibold">{t.topInstrument}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (t) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openEditTrader(t)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteId(t.id)}
            className="text-xs font-medium text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Leaderboard Data</h1>
          <p className="text-xs text-gray-500">Manage trading contest records across all timeframes</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
          >
            📥 Import CSV
          </button>
          <button
            type="button"
            onClick={openNewTrader}
            className="h-9 px-3 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            + Add Trader
          </button>
        </div>
      </div>

      {/* Period Selector Tabs and Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-xl bg-gray-200 p-1 dark:bg-gray-800">
          {(["overall", "week", "today"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPeriod(p);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                period === p
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 text-xs outline-none focus:border-indigo-500 dark:border-gray-700"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.traders ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={loading}
        error={error}
        getRowId={(t) => t.id}
        onPageChange={setPage}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(1);
        }}
        onRowClick={openEditTrader}
      />

      {/* Add / Edit Drawer */}
      <Drawer
        isOpen={drawerOpen}
        title={editingTrader?.id ? "Edit Trader Entry" : "Add Contest Trader"}
        onClose={() => setDrawerOpen(false)}
      >
        {editingTrader && (
          <div className="space-y-4">
            <FormField label="Trader Name" required>
              <input
                type="text"
                value={editingTrader.name ?? ""}
                onChange={(e) => setEditingTrader({ ...editingTrader, name: e.target.value })}
                className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Country Code">
                <input
                  type="text"
                  maxLength={2}
                  value={editingTrader.countryCode ?? ""}
                  onChange={(e) => setEditingTrader({ ...editingTrader, countryCode: e.target.value.toUpperCase() })}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm uppercase dark:border-gray-700"
                />
              </FormField>
              <FormField label="City">
                <input
                  type="text"
                  value={editingTrader.city ?? ""}
                  onChange={(e) => setEditingTrader({ ...editingTrader, city: e.target.value })}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                />
              </FormField>
            </div>

            <FormField label="Net Profit (USD)" required hint="Realised USD profit. Ranking metric.">
              <input
                type="number"
                value={editingTrader.netProfit ?? 0}
                onChange={(e) => setEditingTrader({ ...editingTrader, netProfit: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm font-mono dark:border-gray-700"
              />
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Return %">
                <input
                  type="number"
                  step="0.1"
                  value={editingTrader.returnPct ?? 0}
                  onChange={(e) => setEditingTrader({ ...editingTrader, returnPct: parseFloat(e.target.value) || 0 })}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm font-mono dark:border-gray-700"
                />
              </FormField>
              <FormField label="Win Rate %">
                <input
                  type="number"
                  step="0.1"
                  value={editingTrader.winRatePct ?? 0}
                  onChange={(e) => setEditingTrader({ ...editingTrader, winRatePct: parseFloat(e.target.value) || 0 })}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm font-mono dark:border-gray-700"
                />
              </FormField>
              <FormField label="Max DD %">
                <input
                  type="number"
                  step="0.1"
                  value={editingTrader.maxDrawdownPct ?? 0}
                  onChange={(e) => setEditingTrader({ ...editingTrader, maxDrawdownPct: parseFloat(e.target.value) || 0 })}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm font-mono dark:border-gray-700"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Trades Count">
                <input
                  type="number"
                  value={editingTrader.tradesCount ?? 0}
                  onChange={(e) => setEditingTrader({ ...editingTrader, tradesCount: parseInt(e.target.value) || 0 })}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm font-mono dark:border-gray-700"
                />
              </FormField>
              <FormField label="Volume (Lots)">
                <input
                  type="number"
                  step="0.01"
                  value={editingTrader.volumeLots ?? 0}
                  onChange={(e) => setEditingTrader({ ...editingTrader, volumeLots: parseFloat(e.target.value) || 0 })}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm font-mono dark:border-gray-700"
                />
              </FormField>
            </div>

            <FormField label="Top Instrument">
              <input
                type="text"
                value={editingTrader.topInstrument ?? "EURUSD"}
                onChange={(e) => setEditingTrader({ ...editingTrader, topInstrument: e.target.value.toUpperCase() })}
                placeholder="EURUSD, XAUUSD, US30..."
                className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm uppercase dark:border-gray-700"
              />
            </FormField>

            <FormField label="Period">
              <select
                value={editingTrader.period ?? period}
                onChange={(e) => setEditingTrader({ ...editingTrader, period: e.target.value as "today" | "week" | "overall" })}
                className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
              >
                <option value="overall">Overall</option>
                <option value="week">Week</option>
                <option value="today">Today</option>
              </select>
            </FormField>

            <div className="pt-4 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveTrader}
                className="flex-1 h-10 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Trader"}
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* CSV Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Import Traders CSV</h2>
              <button type="button" onClick={() => setImportOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Headers required: <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">name, netProfit, returnPct, tradesCount...</code>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Choose file…
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setDryRunResult(null);
                }}
                placeholder="name,countryCode,city,netProfit,returnPct,winRatePct,maxDrawdownPct,tradesCount,volumeLots,topInstrument,period
Alex Morgan,US,New York,18420,112.5,65,8.2,320,140,EURUSD,overall"
                className="w-full font-mono text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent p-3 outline-none focus:border-indigo-500"
              />

              <div className="flex items-center gap-4 text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Mode:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === "append"}
                    onChange={() => setImportMode("append")}
                    className="accent-indigo-600"
                  />
                  <span>Append to existing</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                    className="accent-indigo-600"
                  />
                  <span>Replace period</span>
                </label>
              </div>

              {dryRunResult && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-3 text-xs">
                  <div className="font-semibold text-emerald-600">✓ {dryRunResult.valid} valid row(s) found</div>
                  {dryRunResult.errors.length > 0 && (
                    <div className="mt-1 text-red-600">
                      ⚠ {dryRunResult.errors.length} error(s): {dryRunResult.errors.slice(0, 3).map((e) => `Row ${e.row}: ${e.error}`).join("; ")}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImportOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importing || !csvText.trim()}
                  onClick={handleDryRun}
                  className="px-4 py-2 rounded-lg border border-indigo-300 text-indigo-600 text-xs font-semibold hover:bg-indigo-50 dark:border-indigo-700 dark:hover:bg-indigo-950/40"
                >
                  Dry Run Validation
                </button>
                <button
                  type="button"
                  disabled={importing || !csvText.trim() || (dryRunResult !== null && dryRunResult.errors.length > 0)}
                  onClick={handleCommitImport}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {importing ? "Importing…" : "Commit Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Delete Trader Entry"
        message="Are you sure you want to delete this trader from the leaderboard? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteId) void handleDeleteTrader(deleteId);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
