"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { FormField, SwitchField } from "@/components/admin/FormField";

interface UserRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  country: string | null;
  status: "active" | "disabled";
  profileComplete: boolean;
  showName: boolean;
  showPhoto: boolean;
  loginCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UsersApiResponse {
  total: number;
  page: number;
  pageSize: number;
  users: UserRow[];
}

export default function AdminUsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [data, setData] = useState<UsersApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URL state
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const profileComplete = searchParams.get("profileComplete") ?? "";
  const country = searchParams.get("country") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "25");
  const sortField = searchParams.get("sortField") ?? "createdAt";
  const sortDir = (searchParams.get("sortDir") as "asc" | "desc") ?? "desc";

  // Local search input
  const [searchInput, setSearchInput] = useState(search);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drawer
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingCountry, setEditingCountry] = useState("");
  const [editingShowName, setEditingShowName] = useState(true);
  const [editingShowPhoto, setEditingShowPhoto] = useState(true);
  const [savingUser, setSavingUser] = useState(false);

  // Confirm dialogs
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkAction, setConfirmBulkAction] = useState<string | null>(null);

  const updateParams = useCallback(
    (newParams: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([k, v]) => {
        if (v !== undefined && v !== "") {
          next.set(k, String(v));
        } else {
          next.delete(k);
        }
      });
      router.push(`${pathname}?${next.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortField,
        sortDir,
      });
      if (search) qs.set("search", search);
      if (status) qs.set("status", status);
      if (profileComplete) qs.set("profileComplete", profileComplete);
      if (country) qs.set("country", country);

      const res = await fetch(`/api/admin/users?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to load users");
      const json = await res.json() as UsersApiResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading users");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortField, sortDir, search, status, profileComplete, country]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const openDrawer = (user: UserRow) => {
    setSelectedUser(user);
    setEditingName(user.name);
    setEditingCountry(user.country ?? "");
    setEditingShowName(user.showName);
    setEditingShowPhoto(user.showPhoto);
    setDrawerOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          name: editingName.trim(),
          country: editingCountry.trim().toUpperCase() || undefined,
          showName: editingShowName,
          showPhoto: editingShowPhoto,
        }),
      });
      if (!res.ok) throw new Error("Failed to update user profile");
      showToast("User updated successfully");
      setDrawerOpen(false);
      void loadUsers();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save user", "error");
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleStatus = async (user: UserRow) => {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error("Status update failed");
      showToast(`User ${nextStatus === "active" ? "enabled" : "disabled"}`);
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, status: nextStatus });
      }
      void loadUsers();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    }
  };

  const handleForceSignOut = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, forceSignOut: true }),
      });
      if (!res.ok) throw new Error("Failed to force sign out");
      showToast("User session invalidated");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Action failed", "error");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      showToast("User deleted permanently");
      setConfirmDeleteId(null);
      setDrawerOpen(false);
      void loadUsers();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const handleBulkAction = async (action: "disable" | "enable" | "force_sign_out" | "delete") => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userIds: selectedIds }),
      });
      if (!res.ok) throw new Error("Bulk action failed");
      showToast(`Bulk action (${action}) completed for ${selectedIds.length} users`);
      setSelectedIds([]);
      setConfirmBulkAction(null);
      void loadUsers();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Bulk action failed", "error");
    }
  };

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "Trader / Email",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="size-8 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold grid place-items-center text-xs">
            {u.name ? u.name.slice(0, 2).toUpperCase() : "AT"}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 dark:text-white truncate">
              {u.name || <span className="italic text-gray-400">Anonymous trader</span>}
            </div>
            <div className="text-xs text-gray-500 truncate">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "country",
      header: "Country",
      sortable: true,
      render: (u) => <span>{u.country ?? "–"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (u) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            u.status === "active"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
          }`}
        >
          {u.status}
        </span>
      ),
    },
    {
      key: "profileComplete",
      header: "Complete",
      render: (u) => (
        <span className={u.profileComplete ? "text-emerald-600 font-bold" : "text-gray-400"}>
          {u.profileComplete ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "showName",
      header: "Show Name",
      render: (u) => <span>{u.showName ? "✓" : "–"}</span>,
    },
    {
      key: "showPhoto",
      header: "Show Photo",
      render: (u) => <span>{u.showPhoto ? "✓" : "–"}</span>,
    },
    {
      key: "loginCount",
      header: "Logins",
      sortable: true,
      align: "right",
      render: (u) => <span className="tabular-nums font-mono">{u.loginCount}</span>,
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: true,
      render: (u) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      sortable: true,
      render: (u) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Registered Users</h1>
          <p className="text-xs text-gray-500">Manage user privacy, account status, and credentials</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/admin/users/export?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            📥 Export CSV
          </a>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="min-w-[200px] flex-1">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParams({ search: searchInput, page: 1 });
            }}
            placeholder="Search by name or email (press Enter)…"
            className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-xs text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:text-white"
          />
        </div>

        <select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
          className="h-9 rounded-lg border border-gray-300 bg-transparent px-2.5 text-xs text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>

        <select
          value={profileComplete}
          onChange={(e) => updateParams({ profileComplete: e.target.value, page: 1 })}
          className="h-9 rounded-lg border border-gray-300 bg-transparent px-2.5 text-xs text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="">Profile Status</option>
          <option value="true">Complete</option>
          <option value="false">Incomplete</option>
        </select>

        <button
          type="button"
          onClick={() => updateParams({ search: searchInput, page: 1 })}
          className="h-9 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Search
        </button>

        {(search || status || profileComplete || country) && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              updateParams({ search: undefined, status: undefined, profileComplete: undefined, country: undefined, page: 1 });
            }}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white underline ml-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Bulk Action Controls */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-indigo-50 p-3 text-xs dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
          <span className="font-semibold text-indigo-900 dark:text-indigo-300">
            Bulk Actions for {selectedIds.length} user(s):
          </span>
          <button
            type="button"
            onClick={() => handleBulkAction("enable")}
            className="px-2.5 py-1 rounded bg-white dark:bg-gray-800 border border-indigo-200 font-medium hover:bg-indigo-100"
          >
            Enable
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction("disable")}
            className="px-2.5 py-1 rounded bg-white dark:bg-gray-800 border border-indigo-200 font-medium hover:bg-indigo-100 text-amber-700"
          >
            Disable
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction("force_sign_out")}
            className="px-2.5 py-1 rounded bg-white dark:bg-gray-800 border border-indigo-200 font-medium hover:bg-indigo-100 text-purple-700"
          >
            Force Sign Out
          </button>
          <button
            type="button"
            onClick={() => setConfirmBulkAction("delete")}
            className="px-2.5 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-700"
          >
            Delete Selected
          </button>
        </div>
      )}

      {/* User Data Table */}
      <DataTable
        columns={columns}
        data={data?.users ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={loading}
        error={error}
        sortField={sortField}
        sortDir={sortDir}
        selectedIds={selectedIds}
        getRowId={(u) => u.id}
        onSelectionChange={setSelectedIds}
        onPageChange={(p) => updateParams({ page: p })}
        onPageSizeChange={(ps) => updateParams({ pageSize: ps, page: 1 })}
        onSortChange={(f) => {
          const nextDir = sortField === f && sortDir === "asc" ? "desc" : "asc";
          updateParams({ sortField: f, sortDir: nextDir });
        }}
        onRowClick={openDrawer}
      />

      {/* Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        title={selectedUser?.name || "Trader Profile"}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="size-16 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xl grid place-items-center shrink-0">
                {selectedUser.name ? selectedUser.name.slice(0, 2).toUpperCase() : "AT"}
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-gray-900 dark:text-white truncate">
                  {selectedUser.name || "Anonymous trader"}
                </div>
                <div className="text-xs text-gray-500 font-mono truncate">{selectedUser.email}</div>
                <div className="mt-1">
                  <span
                    className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      selectedUser.status === "active"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    {selectedUser.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <FormField label="Display Name">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700"
                />
              </FormField>

              <FormField label="Country Code">
                <input
                  type="text"
                  maxLength={2}
                  value={editingCountry}
                  onChange={(e) => setEditingCountry(e.target.value)}
                  placeholder="US, GB, etc."
                  className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm uppercase dark:border-gray-700"
                />
              </FormField>

              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <SwitchField
                  label="Show Display Name"
                  checked={editingShowName}
                  onChange={setEditingShowName}
                  hint="Off: Trader appears as 'Anonymous trader' on public boards"
                />
                <SwitchField
                  label="Show Photo"
                  checked={editingShowPhoto}
                  onChange={setEditingShowPhoto}
                  hint="Off: Photo replaced by initials"
                />
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  disabled={savingUser}
                  onClick={handleSaveUser}
                  className="flex-1 h-10 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingUser ? "Saving…" : "Save Changes"}
                </button>
              </div>

              {/* Status and Session Actions */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggleStatus(selectedUser)}
                    className="flex-1 h-9 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {selectedUser.status === "active" ? "Disable User" : "Enable User"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleForceSignOut(selectedUser.id)}
                    className="flex-1 h-9 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Force Sign Out
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(selectedUser.id)}
                  className="w-full h-9 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold dark:border-red-800 dark:hover:bg-red-950/40"
                >
                  Delete User Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        title="Delete User Account"
        message="This action permanently deletes the user account. Their uploaded avatar and history will be cleared. This action cannot be undone."
        confirmLabel="Delete User"
        typeToConfirm="delete"
        onConfirm={() => {
          if (confirmDeleteId) void handleDeleteUser(confirmDeleteId);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(confirmBulkAction === "delete")}
        title="Delete Multiple Users"
        message={`Are you sure you want to permanently delete ${selectedIds.length} users? This cannot be undone.`}
        confirmLabel="Delete All Selected"
        typeToConfirm="delete"
        onConfirm={() => void handleBulkAction("delete")}
        onCancel={() => setConfirmBulkAction(null)}
      />
    </div>
  );
}
