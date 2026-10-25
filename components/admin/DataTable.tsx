"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./AdminPrimitives";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  defaultVisible?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  error?: string | null;
  sortField?: string;
  sortDir?: "asc" | "desc";
  selectedIds?: string[];
  getRowId?: (row: T) => string;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (field: string) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  loading = false,
  error = null,
  sortField,
  sortDir = "desc",
  selectedIds = [],
  getRowId,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSelectionChange,
  onRowClick,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  const [visibleKeys, setVisibleKeys] = useState<string[]>(
    () => columns.filter((c) => c.defaultVisible !== false).map((c) => c.key)
  );
  const [showColMenu, setShowColMenu] = useState(false);

  const activeColumns = columns.filter((c) => visibleKeys.includes(c.key));
  const hasSelection = Boolean(onSelectionChange && getRowId);
  const allSelected = hasSelection && data.length > 0 && data.every((row) => selectedIds.includes(getRowId!(row)));

  const handleSelectAll = () => {
    if (!onSelectionChange || !getRowId) return;
    if (allSelected) {
      onSelectionChange([]);
    } else {
      const allIds = Array.from(new Set([...selectedIds, ...data.map((r) => getRowId(r))]));
      onSelectionChange(allIds);
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-3 font-sans">
      {/* Table toolbar / Column menu */}
      <div className="flex items-center justify-between text-meta text-mute">
        <div>
          {hasSelection && selectedIds.length > 0 && (
            <span className="font-semibold text-accent">
              {selectedIds.length} row(s) selected
            </span>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColMenu(!showColMenu)}
            className="flex items-center gap-1.5 rounded-xl border border-hairline-strong bg-card px-3 py-1.5 text-meta font-medium text-ink hover:border-accent hover:bg-alt transition"
          >
            <span>Columns</span>
            <svg className="size-3.5 text-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {showColMenu && (
            <div className="absolute right-0 top-full mt-1.5 z-30 w-48 rounded-2xl border border-hairline bg-card p-2 shadow-xl animate-[f-fadein_.15s_ease-out]">
              <div className="text-[10px] font-semibold text-faint uppercase tracking-wider px-2 py-1">
                Toggle Columns
              </div>
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2.5 px-2 py-1.5 text-cell text-ink hover:bg-alt rounded-lg cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={visibleKeys.includes(col.key)}
                    onChange={() => {
                      if (visibleKeys.includes(col.key)) {
                        if (visibleKeys.length > 1) {
                          setVisibleKeys(visibleKeys.filter((k) => k !== col.key));
                        }
                      } else {
                        setVisibleKeys([...visibleKeys, col.key]);
                      }
                    }}
                    className="size-4 accent-accent rounded"
                  />
                  <span>{col.header}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-hairline bg-card shadow-[var(--shadow)]">
        <table className="w-full text-left text-cell border-collapse">
          <thead className="sticky top-0 z-10 border-b border-hairline bg-alt text-meta font-semibold text-mute uppercase tracking-wider">
            <tr>
              {hasSelection && (
                <th className="w-12 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    className="size-4 rounded accent-accent"
                  />
                </th>
              )}
              {activeColumns.map((col) => {
                const isSorted = sortField === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3.5 ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${col.sortable ? "cursor-pointer select-none hover:text-ink transition" : ""}`}
                    onClick={() => col.sortable && onSortChange?.(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === "right" ? "justify-end" : ""
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-faint text-xs">
                          {isSorted ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading ? (
              <tr>
                <td
                  colSpan={activeColumns.length + (hasSelection ? 1 : 0)}
                  className="px-4 py-16 text-center text-cell text-mute"
                >
                  <div className="inline-flex items-center gap-2.5">
                    <span className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <span>Loading data…</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={activeColumns.length + (hasSelection ? 1 : 0)}
                  className="px-4 py-10 text-center text-cell text-down font-medium"
                >
                  {error}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={activeColumns.length + (hasSelection ? 1 : 0)}
                  className="px-4 py-16 text-center text-cell text-mute"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => {
                const id = getRowId ? getRowId(row) : String(i);
                const isSelected = selectedIds.includes(id);

                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={`transition-colors duration-150 ${
                      onRowClick ? "cursor-pointer" : ""
                    } ${
                      isSelected
                        ? "bg-accent/10"
                        : "hover:bg-accent/[0.04]"
                    }`}
                  >
                    {hasSelection && (
                      <td
                        className="w-12 px-4 py-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(id)}
                          aria-label={`Select row ${id}`}
                          className="size-4 rounded accent-accent"
                        />
                      </td>
                    )}
                    {activeColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 text-ink ${
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        }`}
                      >
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? "–")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-meta text-mute pt-2">
        <div>
          Showing {data.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
          {Math.min(page * pageSize, total)} of {total.toLocaleString()} records
        </div>
        <div className="flex items-center gap-3">
          {onPageSizeChange && (
            <div className="flex items-center gap-2">
              <span className="text-meta">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-8 rounded-lg border border-hairline-strong bg-card px-2 text-meta text-ink outline-none focus:border-accent"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
          {onPageChange && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
              <span className="px-2 font-medium text-ink tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
