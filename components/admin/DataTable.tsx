"use client";

import { useState, type ReactNode } from "react";

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
    <div className="space-y-3">
      {/* Table toolbar / Column menu */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div>
          {hasSelection && selectedIds.length > 0 && (
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {selectedIds.length} row(s) selected
            </span>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColMenu(!showColMenu)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Columns
          </button>
          {showColMenu && (
            <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
                Toggle Columns
              </div>
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800"
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
                    className="size-3.5 accent-indigo-600 rounded"
                  />
                  <span>{col.header}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              {hasSelection && (
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    className="size-4 rounded accent-indigo-600"
                  />
                </th>
              )}
              {activeColumns.map((col) => {
                const isSorted = sortField === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${col.sortable ? "cursor-pointer select-none hover:text-gray-900 dark:hover:text-white" : ""}`}
                    onClick={() => col.sortable && onSortChange?.(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === "right" ? "justify-end" : ""
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-gray-400 text-xs">
                          {isSorted ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td
                  colSpan={activeColumns.length + (hasSelection ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  <div className="inline-flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    <span>Loading data…</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={activeColumns.length + (hasSelection ? 1 : 0)}
                  className="px-4 py-8 text-center text-sm text-red-600"
                >
                  {error}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={activeColumns.length + (hasSelection ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-gray-500"
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
                    className={`transition-colors ${
                      onRowClick ? "cursor-pointer" : ""
                    } ${
                      isSelected
                        ? "bg-indigo-50/60 dark:bg-indigo-950/30"
                        : "hover:bg-gray-50/80 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    {hasSelection && (
                      <td
                        className="w-10 px-4 py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(id)}
                          aria-label={`Select row ${id}`}
                          className="size-4 rounded accent-indigo-600"
                        />
                      </td>
                    )}
                    {activeColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-gray-900 dark:text-gray-100 ${
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
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
        <div>
          Showing {data.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
          {Math.min(page * pageSize, total)} of {total.toLocaleString()} records
        </div>
        <div className="flex items-center gap-3">
          {onPageSizeChange && (
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
          {onPageChange && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="h-8 rounded-lg border border-gray-300 px-2.5 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <span className="px-2 font-medium">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="h-8 rounded-lg border border-gray-300 px-2.5 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
