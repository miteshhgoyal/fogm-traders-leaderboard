"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Switch,
} from "@/components/admin/AdminPrimitives";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { useFetch } from "@/lib/use-async";

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

function countryFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  const upper = code.toUpperCase();
  const c1 = 127397 + upper.charCodeAt(0);
  const c2 = 127397 + upper.charCodeAt(1);
  return String.fromCodePoint(c1, c2);
}

function AdminUsersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

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
  const [confirmBulkAction, setConfirmBulkAction] = useState<"enable" | "disable" | "force_sign_out" | null>(null);

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

  const { data, loading, error, reload } = useFetch<UsersApiResponse>(async () => {
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
    return (await res.json()) as UsersApiResponse;
  }, [page, pageSize, sortField, sortDir, search, status, profileComplete, country]);

  const openDrawer = (user: UserRow) => {
    setSelectedUser(user);
    setEditingName(user.name);
    setEditingCountry(user.country ?? "");
    setEditingShowName(user.showName);
    setEditingShowPhoto(user.showPhoto);
    setDrawerOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser || savingUser) return;
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
      reload();
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
      reload();
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
      reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const handleBulkAction = async (action: "disable" | "enable" | "force_sign_out") => {
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
      reload();
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
          <div className="size-9 shrink-0 rounded-full bg-accent/15 border border-accent/25 text-accent font-bold grid place-items-center text-xs">
            {u.name ? u.name.slice(0, 2).toUpperCase() : "AT"}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-ink truncate">
              {u.name || <span className="italic text-mute">Anonymous trader</span>}
            </div>
            <div className="text-meta text-mute truncate">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "country",
      header: "Country",
      sortable: true,
      render: (u) => (
        <span className="flex items-center gap-1.5 font-mono text-meta">
          {u.country ? (
            <>
              <span>{countryFlagEmoji(u.country)}</span>
              <span>{u.country.toUpperCase()}</span>
            </>
          ) : (
            <span className="text-faint">–</span>
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (u) => (
        <Badge variant={u.status === "active" ? "up" : "down"}>
          {u.status}
        </Badge>
      ),
    },
    {
      key: "profileComplete",
      header: "Profile",
      sortable: true,
      render: (u) => (
        <Badge variant={u.profileComplete ? "accent" : "mute"}>
          {u.profileComplete ? "Complete" : "Incomplete"}
        </Badge>
      ),
    },
    {
      key: "privacy",
      header: "Privacy Flags",
      render: (u) => (
        <div className="flex flex-col gap-0.5 text-meta">
          <span className={u.showName ? "text-up font-medium" : "text-faint"}>
            {u.showName ? "✓ Name visible" : "✗ Masked publicly"}
          </span>
          <span className={u.showPhoto ? "text-up font-medium" : "text-faint"}>
            {u.showPhoto ? "✓ Photo visible" : "✗ Avatar hidden"}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Registered",
      sortable: true,
      render: (u) => (
        <span className="text-meta text-mute tabular-nums">
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openDrawer(u)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  const exportUrl = `/api/admin/users/export?${new URLSearchParams({
    search,
    status,
  }).toString()}`;

  return (
    <div className="space-y-6 animate-[f-fadein_.3s_ease-out]">
      <PageHeader
        title="Users (CRM)"
        description="Manage championship accounts, privacy visibility, and authentication states."
      >
        <a
          href={exportUrl}
          download="fogm-users.csv"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-hairline-strong bg-card px-4 text-meta font-semibold text-ink hover:border-accent hover:bg-alt transition"
        >
          <svg className="size-4 text-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export CSV</span>
        </a>
      </PageHeader>

      {/* Filter Toolbar */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative min-w-[240px] flex-1">
              <svg className="absolute left-3.5 top-3.5 size-4 text-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateParams({ search: searchInput, page: 1 });
                }}
                placeholder="Search name or email… (press Enter)"
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="w-40">
              <Select
                value={status}
                options={[
                  { value: "", label: "Status: All" },
                  { value: "active", label: "Active" },
                  { value: "disabled", label: "Disabled" },
                ]}
                onChange={(val) => updateParams({ status: val, page: 1 })}
              />
            </div>

            {/* Profile Filter */}
            <div className="w-44">
              <Select
                value={profileComplete}
                options={[
                  { value: "", label: "Profile: All" },
                  { value: "true", label: "Complete" },
                  { value: "false", label: "Incomplete" },
                ]}
                onChange={(val) => updateParams({ profileComplete: val, page: 1 })}
              />
            </div>

            {(search || status || profileComplete || country) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  updateParams({ search: "", status: "", profileComplete: "", country: "", page: 1 });
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Bulk Actions Menu */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-hairline">
              <span className="text-meta text-mute">{selectedIds.length} selected:</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmBulkAction("enable")}
              >
                Set Active
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmBulkAction("disable")}
              >
                Disable
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-down hover:bg-down/10"
                onClick={() => setConfirmBulkAction("force_sign_out")}
              >
                Force Sign Out
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Users DataTable */}
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
        onSortChange={(sf) => {
          const nextDir = sortField === sf && sortDir === "asc" ? "desc" : "asc";
          updateParams({ sortField: sf, sortDir: nextDir });
        }}
        onRowClick={openDrawer}
      />

      {/* User Edit Drawer */}
      <Drawer
        isOpen={drawerOpen}
        title={selectedUser?.name ? selectedUser.name : "Edit Trader Profile"}
        description={selectedUser?.email}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-down hover:bg-down/10"
              onClick={() => selectedUser && setConfirmDeleteId(selectedUser.id)}
            >
              Delete User
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={savingUser} disabled={savingUser} onClick={handleSaveUser}>
                Save Changes
              </Button>
            </div>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="space-y-4">
              <Field label="Display Name">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="Trader name"
                />
              </Field>

              <Field label="Country Code" hint="2-letter ISO (e.g. US, GB, AE)">
                <Input
                  value={editingCountry}
                  maxLength={2}
                  onChange={(e) => setEditingCountry(e.target.value.toUpperCase())}
                  placeholder="GB"
                  className="font-mono uppercase"
                />
              </Field>
            </div>

            <div className="space-y-3 rounded-2xl border border-hairline bg-alt p-4">
              <h4 className="text-cell font-semibold text-ink">Public Privacy Toggles</h4>
              <Switch
                label="Show Display Name"
                description="When off, trader appears as 'Anonymous trader' publicly"
                checked={editingShowName}
                onChange={setEditingShowName}
              />
              <div className="border-t border-hairline pt-3">
                <Switch
                  label="Show Photo"
                  description="When off, initials are displayed on leaderboard"
                  checked={editingShowPhoto}
                  onChange={setEditingShowPhoto}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-hairline bg-alt p-4">
              <h4 className="text-cell font-semibold text-ink">Account & Security</h4>
              <div className="flex items-center justify-between text-cell">
                <div>
                  <span className="block font-medium text-ink">Account Status</span>
                  <span className="block text-meta text-mute">
                    Currently {selectedUser.status === "active" ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <Button
                  variant={selectedUser.status === "active" ? "danger" : "secondary"}
                  size="sm"
                  onClick={() => handleToggleStatus(selectedUser)}
                >
                  {selectedUser.status === "active" ? "Disable Account" : "Enable Account"}
                </Button>
              </div>

              <div className="border-t border-hairline pt-3 flex items-center justify-between text-cell">
                <div>
                  <span className="block font-medium text-ink">Active Sessions</span>
                  <span className="block text-meta text-mute">Force sign-out across all devices</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleForceSignOut(selectedUser.id)}
                >
                  Invalidate JWT
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-hairline bg-card p-3 text-meta text-mute space-y-1">
              <div>Logins: <span className="text-ink font-semibold">{selectedUser.loginCount ?? 0}</span></div>
              <div>Last Login: <span className="text-ink">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : "Never"}</span></div>
              <div>Created: <span className="text-ink">{new Date(selectedUser.createdAt).toLocaleString()}</span></div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Delete User Confirm */}
      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        title="Permanently Delete Trader Account?"
        description="This action immediately purges the user doc, their rank card, and session records. This cannot be undone."
        confirmText="Yes, Delete Permanently"
        confirmPhrase="DELETE"
        danger
        onConfirm={() => confirmDeleteId && handleDeleteUser(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
      />

      {/* Bulk Action Confirm */}
      <ConfirmDialog
        isOpen={Boolean(confirmBulkAction)}
        title={`Execute Bulk ${confirmBulkAction?.toUpperCase()}?`}
        description={`This will apply '${confirmBulkAction}' to ${selectedIds.length} selected user account(s).`}
        confirmText={`Confirm ${confirmBulkAction}`}
        onConfirm={() => confirmBulkAction && handleBulkAction(confirmBulkAction)}
        onClose={() => setConfirmBulkAction(null)}
      />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-cell text-mute">Loading CRM…</div>}>
      <AdminUsersContent />
    </Suspense>
  );
}
