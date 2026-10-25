"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardStats {
  totalUsers: number;
  newIn7d: number;
  activeIn7d: number;
  profileComplete: number;
  profileCompletePct: number;
  signupsByDay: { _id: string; count: number }[];
  topCountries: { _id: string; count: number }[];
  recentSignups: {
    id: string;
    name: string;
    email: string;
    country: string | null;
    profileComplete: boolean;
    createdAt: string;
  }[];
  recentAudit: {
    id: string;
    action: string;
    target: string;
    ip: string;
    createdAt: string;
  }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to load dashboard metrics");
        const data = await res.json() as DashboardStats;
        setStats(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error loading dashboard");
      } finally {
        setLoading(false);
      }
    }
    void loadStats();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-gray-500">
        <div className="inline-flex size-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
        <div>Loading dashboard metrics…</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
        {error ?? "Failed to load dashboard."}
      </div>
    );
  }

  const chartData = stats.signupsByDay;
  const maxSignups = Math.max(...chartData.map((d) => d.count), 5);

  return (
    <div className="space-y-8">
      {/* Top Metric Tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Users</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
            {stats.totalUsers.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-gray-500">All registered traders</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">New in 7 Days</div>
          <div className="mt-2 text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            +{stats.newIn7d.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-gray-500">Recently registered</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active (7 Days)</div>
          <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats.activeIn7d.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-gray-500">Traders logged in recently</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Profile Complete</div>
          <div className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">
            {stats.profileCompletePct}%
          </div>
          <div className="mt-1 text-xs text-gray-500">{stats.profileComplete} completed profiles</div>
        </div>
      </div>

      {/* 30-Day Signups Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Signups (Last 30 Days)</h2>
            <p className="text-xs text-gray-500">Daily registered site users</p>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No signups recorded in the last 30 days.</div>
        ) : (
          <div className="h-48 w-full pt-4">
            <div className="flex h-40 items-end gap-1.5 overflow-x-auto pb-4">
              {chartData.map((d) => {
                const heightPct = Math.max(8, Math.round((d.count / maxSignups) * 100));
                return (
                  <div key={d._id} className="group relative flex-1 min-w-[12px] flex flex-col items-center">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full rounded-t bg-indigo-500 transition-all group-hover:bg-indigo-600 dark:bg-indigo-600 dark:group-hover:bg-indigo-500"
                    />
                    <div className="pointer-events-none absolute bottom-full mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block z-10">
                      {d._id}: {d.count} signups
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-1">
              <span>{chartData[0]?._id}</span>
              <span>{chartData[chartData.length - 1]?._id}</span>
            </div>
          </div>
        )}
      </div>

      {/* Two column split: Top Countries & Recent Signups */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Countries */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Top Countries</h2>
          {stats.topCountries.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">No country data available yet.</div>
          ) : (
            <div className="space-y-3">
              {stats.topCountries.map((c) => (
                <div key={c._id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    🌍 {c._id}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                    {c.count} users
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Signups */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Signups</h2>
            <Link
              href="/admin/users"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View all →
            </Link>
          </div>
          {stats.recentSignups.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">No users found.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.recentSignups.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0 pr-4">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {u.name || "Anonymous trader"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{u.email}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Audit Log Activity */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Admin Activity</h2>
          <Link
            href="/admin/audit"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Audit log →
          </Link>
        </div>
        {stats.recentAudit.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">No administrative actions logged yet.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {stats.recentAudit.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {a.action}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 font-mono">{a.target}</span>
                </div>
                <div className="text-gray-400">
                  {new Date(a.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
