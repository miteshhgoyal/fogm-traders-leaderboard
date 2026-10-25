"use client";

import { useEffect, useState, useCallback } from "react";
import { Drawer } from "@/components/admin/Drawer";
import { useToast } from "@/components/admin/Toast";

interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
}

export default function AdminAuditPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);

  // Filters & pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [actionFilter, setActionFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Drawer detail
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (actionFilter) qs.set("action", actionFilter);
      if (fromDate) qs.set("from", new Date(fromDate).toISOString());
      if (toDate) qs.set("to", new Date(toDate).toISOString());

      const res = await fetch(`/api/admin/audit?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to load audit logs");
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch {
      showToast("Could not load audit log", "error");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actionFilter, fromDate, toDate, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleExport = () => {
    const qs = new URLSearchParams();
    if (actionFilter) qs.set("action", actionFilter);
    window.location.href = `/api/admin/audit/export?${qs.toString()}`;
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit & Security Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable log of administrative actions, data modifications, and security events. Retained for 180 days.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Filter by action (e.g. update_settings, delete_user)..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {(actionFilter || fromDate || toDate) && (
          <button
            type="button"
            onClick={() => {
              setActionFilter("");
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Audit Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                    <svg className="animate-spin size-5 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading audit events...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                    No audit records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-primary">
                      {entry.action}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-foreground">
                      {entry.target}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {entry.actor}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {entry.ip ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedEntry(entry)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10 text-xs text-muted-foreground">
          <span>
            Showing {entries.length} of {total} events
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-border hover:bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-border hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Diff Drawer */}
      <Drawer
        isOpen={selectedEntry !== null}
        title="Audit Event Details"
        description={selectedEntry ? `${selectedEntry.action} on ${selectedEntry.target}` : ""}
        onClose={() => setSelectedEntry(null)}
      >
        {selectedEntry && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border font-mono">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Actor</span>
                <span className="text-foreground">{selectedEntry.actor}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">IP</span>
                <span className="text-foreground">{selectedEntry.ip ?? "Unknown"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Timestamp</span>
                <span className="text-foreground">{new Date(selectedEntry.createdAt).toISOString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Event ID</span>
                <span className="text-foreground">{selectedEntry.id}</span>
              </div>
            </div>

            {/* Before Payload */}
            <div>
              <span className="font-semibold text-foreground block mb-1">State Before:</span>
              <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60 border border-border">
                {selectedEntry.before ? JSON.stringify(selectedEntry.before, null, 2) : "null"}
              </pre>
            </div>

            {/* After Payload */}
            <div>
              <span className="font-semibold text-foreground block mb-1">State After / Payload:</span>
              <pre className="p-3 rounded-lg bg-zinc-950 text-cyan-400 font-mono text-[11px] overflow-x-auto max-h-60 border border-border">
                {selectedEntry.after ? JSON.stringify(selectedEntry.after, null, 2) : "null"}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
