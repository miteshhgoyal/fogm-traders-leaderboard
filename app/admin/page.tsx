"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, PageHeader, Skeleton, StatTile } from "@/components/admin/AdminPrimitives";
import { useFetch } from "@/lib/use-async";

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

function countryFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  const upper = code.toUpperCase();
  const c1 = 127397 + upper.charCodeAt(0);
  const c2 = 127397 + upper.charCodeAt(1);
  return String.fromCodePoint(c1, c2);
}

function getCountryName(code: string): string {
  try {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export default function AdminDashboardPage() {
  const { data: stats, loading, error, reload } = useFetch<DashboardStats>(async () => {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) throw new Error("Failed to load dashboard metrics");
    return (await res.json()) as DashboardStats;
  });

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-[f-fadein_.2s_ease-out]">
        <PageHeader title="Overview" description="Championship participation and CRM overview." />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-down/30 bg-down/10 p-6 text-cell text-down">
        <p className="font-semibold">Failed to load dashboard metrics.</p>
        <p className="mt-1 text-meta">{error ?? "Unknown error"}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-4 rounded-xl border border-down/40 px-4 py-1.5 text-meta font-medium hover:bg-down/20 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const chartData = stats.signupsByDay;
  const maxCount = Math.max(...chartData.map((d) => d.count), 4);
  const chartWidth = 900;
  const chartHeight = 180;
  const paddingX = 20;
  const paddingY = 20;
  const availableWidth = chartWidth - paddingX * 2;
  const availableHeight = chartHeight - paddingY * 2;

  const points = chartData.map((d, i) => {
    const x = paddingX + (i / Math.max(chartData.length - 1, 1)) * availableWidth;
    const y = chartHeight - paddingY - (d.count / maxCount) * availableHeight;
    return { x, y, count: d.count, date: d._id };
  });

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`), "");
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x},${chartHeight - paddingY} L ${points[0].x},${chartHeight - paddingY} Z`
    : "";

  return (
    <div className="space-y-8 animate-[f-fadein_.3s_ease-out]">
      <PageHeader
        title="Overview"
        description="Championship enrollment, participant activity, and continuous 30-day timeline."
      >
        <Badge variant="accent">Live Synchronized</Badge>
      </PageHeader>

      {/* Top Stat Tiles with Spotlight and Tooltip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          subtext="All registered accounts"
          tooltip="Cumulative total of all verified emails in the database."
          icon={
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatTile
          label="New in 7 Days"
          value={`+${stats.newIn7d.toLocaleString()}`}
          subtext="Signups this week"
          delta={{ value: "Recent", positive: true }}
          tooltip="Accounts created in the last 7 calendar days."
          icon={
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        />
        <StatTile
          label="Active (7 Days)"
          value={stats.activeIn7d.toLocaleString()}
          subtext="Traders logged in"
          tooltip="Traders who authenticated or refreshed a session within the last 7 days."
          icon={
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
        <StatTile
          label="Profile Complete"
          value={`${stats.profileCompletePct}%`}
          subtext={`${stats.profileComplete} of ${stats.totalUsers}`}
          tooltip="Percentage of users who completed display name and onboarding."
          icon={
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
      </div>

      {/* 30-Day Signups Continuous Timeline Chart (Fix D-002) */}
      <Card wash spotlight>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-ctitle font-semibold text-ink">Signups (Last 30 Days)</h2>
            <p className="text-meta text-mute">Continuous zero-filled daily registration timeline</p>
          </div>
          <div className="flex items-center gap-4 text-meta">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-accent" />
              <span className="text-mute">Daily signups</span>
            </span>
            <span className="text-faint">Peak: {maxCount} / day</span>
          </div>
        </div>

        <div className="relative w-full pt-2">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-44 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="signupAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal gridlines */}
            {[0, 0.5, 1].map((pct, idx) => {
              const y = chartHeight - paddingY - pct * availableHeight;
              return (
                <line
                  key={idx}
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="var(--hairline)"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Area Fill */}
            {areaD && (
              <path d={areaD} fill="url(#signupAreaGrad)" className="fg-fade" data-in="true" />
            )}

            {/* Stroke Line with Draw animation */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="f-draw"
                data-in="true"
              />
            )}

            {/* Points & Interactive Tooltip Anchors */}
            {points.map((p, i) => {
              const isHovered = hoveredIndex === i;
              return (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 5.5 : p.count > 0 ? 3 : 0}
                    className="cursor-pointer transition-all duration-150"
                    fill={isHovered ? "var(--accent)" : "var(--card)"}
                    stroke="var(--accent)"
                    strokeWidth={isHovered ? "2.5" : "1.5"}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {/* Invisible larger hover zone */}
                  <rect
                    x={p.x - availableWidth / (chartData.length * 2)}
                    y={0}
                    width={availableWidth / chartData.length}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip card */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-xl border border-hairline bg-card/95 px-3 py-1.5 shadow-xl backdrop-blur-sm text-center animate-[f-fadein_.15s_ease-out]"
              style={{
                left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
                top: `${Math.max(0, points[hoveredIndex].y - 48)}px`,
              }}
            >
              <div className="text-[11px] font-medium text-mute">{points[hoveredIndex].date}</div>
              <div className="text-cell font-bold text-accent tabular-nums">
                {points[hoveredIndex].count} {points[hoveredIndex].count === 1 ? "signup" : "signups"}
              </div>
            </div>
          )}

          <div className="flex justify-between border-t border-hairline pt-2 text-[11px] text-faint">
            <span>{chartData[0]?._id}</span>
            <span>{chartData[14]?._id}</span>
            <span>{chartData[chartData.length - 1]?._id}</span>
          </div>
        </div>
      </Card>

      {/* Two column split: Top Countries & Recent Signups (Fix D-003) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Countries with flag, real country name, count and percentage bar */}
        <Card spotlight>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-ctitle font-semibold text-ink">Top Countries</h2>
              <p className="text-meta text-mute">Participant geolocation distribution</p>
            </div>
            <span className="text-meta text-faint">{stats.topCountries.length} active</span>
          </div>

          {stats.topCountries.length === 0 ? (
            <div className="py-12 text-center text-cell text-mute">No country data recorded yet.</div>
          ) : (
            <div className="space-y-3.5">
              {stats.topCountries.map((c) => {
                const countryName = regionNames ? (regionNames.of(c._id.toUpperCase()) ?? c._id) : getCountryName(c._id);
                const pct = stats.totalUsers > 0 ? Math.round((c.count / stats.totalUsers) * 100) : 0;
                return (
                  <div key={c._id} className="space-y-1">
                    <div className="flex items-center justify-between text-cell">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base select-none">{countryFlagEmoji(c._id)}</span>
                        <span className="font-medium text-ink truncate">{countryName}</span>
                        <span className="text-meta text-faint font-mono">({c._id.toUpperCase()})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-ink tabular-nums">{c.count}</span>
                        <span className="text-meta text-mute tabular-nums">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-alt">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-accent to-accent-2 transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent Signups (Admin sees real name or email, profile incomplete badge) (Fix D-003) */}
        <Card spotlight>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-ctitle font-semibold text-ink">Recent Signups</h2>
              <p className="text-meta text-mute">Latest registered traders in the CRM</p>
            </div>
            <Link
              href="/admin/users"
              className="text-cell font-semibold text-accent hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <span>→</span>
            </Link>
          </div>

          {stats.recentSignups.length === 0 ? (
            <div className="py-12 text-center text-cell text-mute">No user signups found.</div>
          ) : (
            <div className="divide-y divide-hairline">
              {stats.recentSignups.map((u) => {
                const displayName = u.name ? u.name : u.email;
                return (
                  <div key={u.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-cell text-ink truncate">{displayName}</span>
                        {!u.profileComplete && (
                          <Badge variant="down">Incomplete</Badge>
                        )}
                        {u.country && (
                          <span className="text-xs" title={u.country}>
                            {countryFlagEmoji(u.country)}
                          </span>
                        )}
                      </div>
                      <div className="text-meta text-mute truncate mt-0.5">{u.email}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-meta text-faint tabular-nums">
                        {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Admin Audit Activity */}
      <Card spotlight>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-ctitle font-semibold text-ink">Recent Admin Activity</h2>
            <p className="text-meta text-mute">Administrative change events (retained for 180 days)</p>
          </div>
          <Link
            href="/admin/audit"
            className="text-cell font-semibold text-accent hover:underline flex items-center gap-1"
          >
            <span>Full audit log</span>
            <span>→</span>
          </Link>
        </div>

        {stats.recentAudit.length === 0 ? (
          <div className="py-8 text-center text-cell text-mute">No audit entries recorded yet.</div>
        ) : (
          <div className="divide-y divide-hairline">
            {stats.recentAudit.map((a) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-cell">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-meta bg-alt border border-hairline px-2.5 py-1 rounded-lg text-ink font-semibold">
                    {a.action}
                  </span>
                  <span className="text-meta text-mute font-mono truncate">{a.target}</span>
                </div>
                <div className="flex items-center gap-4 text-meta text-faint shrink-0">
                  <span className="font-mono">{a.ip}</span>
                  <span>{new Date(a.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
