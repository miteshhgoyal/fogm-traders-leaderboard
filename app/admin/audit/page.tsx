"use client";

import { useState, useMemo } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Input,
  Select,
  Drawer,
  Skeleton,
  EmptyState,
} from "@/components/admin/AdminPrimitives";
import { useFetch } from "@/lib/use-async";

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

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "update_settings", label: "update_settings" },
  { value: "delete_user", label: "delete_user" },
  { value: "bulk_delete_users", label: "bulk_delete_users" },
  { value: "bulk_update_users", label: "bulk_update_users" },
  { value: "import_traders", label: "import_traders" },
  { value: "create_trader", label: "create_trader" },
  { value: "update_trader", label: "update_trader" },
  { value: "delete_trader", label: "delete_trader" },
  { value: "test_email", label: "test_email" },
  { value: "revalidate_settings", label: "revalidate_settings" },
  { value: "admin_login", label: "admin_login" },
];

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);

  // Filters & pagination
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [actionFilter, setActionFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Drawer detail
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const { loading, error, refetch } = useFetch(async () => {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (actionFilter && actionFilter !== "all") qs.set("action", actionFilter);
    if (fromDate) qs.set("from", new Date(fromDate).toISOString());
    if (toDate) qs.set("to", new Date(toDate).toISOString());

    const res = await fetch(`/api/admin/audit?${qs.toString()}`);
    if (!res.ok) throw new Error("Failed to load audit logs");
    const data = await res.json();
    setEntries(data.entries ?? []);
    setTotal(data.total ?? 0);
    return data;
  }, [page, actionFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportUrl = useMemo(() => {
    const qs = new URLSearchParams();
    if (actionFilter && actionFilter !== "all") qs.set("action", actionFilter);
    if (fromDate) qs.set("from", new Date(fromDate).toISOString());
    if (toDate) qs.set("to", new Date(toDate).toISOString());
    return `/api/admin/audit/export?${qs.toString()}`;
  }, [actionFilter, fromDate, toDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit & Security Log"
        description="Log of administrative actions, data modifications, and security events. Retained for 180 days."
      >
        <a
          href={exportUrl}
          download="audit-log.csv"
          className="inline-flex items-center justify-center gap-2 h-11 rounded-xl px-5 text-cell font-semibold border border-hairline-strong bg-card text-ink hover:border-accent hover:bg-alt shadow-xs transition"
        >
          <svg className="size-4 text-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </a>
      </PageHeader>

      {/* Filters */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-full sm:w-64">
            <Select
              value={actionFilter}
              onChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
              options={ACTION_OPTIONS}
            />
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="h-11 text-meta"
            />
            <span className="text-meta text-mute">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="h-11 text-meta"
            />
          </div>

          {(actionFilter !== "all" || fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActionFilter("all");
                setFromDate("");
                setToDate("");
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Table / Results */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-down font-medium">Failed to load audit entries</p>
            <Button variant="secondary" size="sm" onClick={refetch} className="mt-4">
              Retry
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No audit events found"
            description="No logged administrative events match your filter criteria."
            action={
              (actionFilter !== "all" || fromDate || toDate) ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setActionFilter("all");
                    setFromDate("");
                    setToDate("");
                    setPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-cell border-collapse">
              <thead>
                <tr className="border-b border-hairline bg-alt/50 text-meta font-semibold text-mute uppercase tracking-wider">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-alt/30 transition">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-semibold text-accent">
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-ink">{entry.target}</td>
                    <td className="py-3 px-4 text-meta text-mute">{entry.actor}</td>
                    <td className="py-3 px-4 font-mono text-xs text-faint">
                      {entry.ip ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-meta text-mute whitespace-nowrap">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEntry(entry)}
                        className="h-8 px-2.5 text-accent hover:text-accent font-medium text-xs"
                      >
                        View Diff
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-hairline bg-alt/20 text-meta text-mute">
          <span>
            Showing <span className="font-semibold text-ink">{entries.length}</span> of{" "}
            <span className="font-semibold text-ink">{total}</span> events
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 text-xs"
            >
              Previous
            </Button>
            <span className="font-mono text-xs">
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Diff Drawer */}
      <Drawer
        isOpen={selectedEntry !== null}
        title="Audit Event Details"
        description={selectedEntry ? `${selectedEntry.action} on ${selectedEntry.target}` : ""}
        onClose={() => setSelectedEntry(null)}
      >
        {selectedEntry && (
          <div className="space-y-5 text-cell">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-alt border border-hairline font-mono text-meta">
              <div>
                <span className="text-faint block text-[10px] uppercase font-sans font-semibold">Actor</span>
                <span className="text-ink">{selectedEntry.actor}</span>
              </div>
              <div>
                <span className="text-faint block text-[10px] uppercase font-sans font-semibold">IP Address</span>
                <span className="text-ink">{selectedEntry.ip ?? "Unknown"}</span>
              </div>
              <div>
                <span className="text-faint block text-[10px] uppercase font-sans font-semibold">Timestamp (UTC)</span>
                <span className="text-ink">{new Date(selectedEntry.createdAt).toISOString()}</span>
              </div>
              <div>
                <span className="text-faint block text-[10px] uppercase font-sans font-semibold">Event ID</span>
                <span className="text-ink truncate block" title={selectedEntry.id}>{selectedEntry.id}</span>
              </div>
            </div>

            {/* Before Payload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-ink text-meta">State Before:</span>
                <Badge variant="mute">before</Badge>
              </div>
              <pre className="p-4 rounded-xl bg-[#0b0b1a] text-up font-mono text-xs overflow-x-auto max-h-60 border border-zinc-800">
                {selectedEntry.before ? JSON.stringify(selectedEntry.before, null, 2) : "null"}
              </pre>
            </div>

            {/* After Payload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-ink text-meta">State After / Payload:</span>
                <Badge variant="accent">after</Badge>
              </div>
              <pre className="p-4 rounded-xl bg-[#0b0b1a] text-[#38bdf8] font-mono text-xs overflow-x-auto max-h-60 border border-zinc-800">
                {selectedEntry.after ? JSON.stringify(selectedEntry.after, null, 2) : "null"}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
