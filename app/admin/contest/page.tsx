"use client";

import { useEffect, useState, useCallback } from "react";
import { FormField } from "@/components/admin/FormField";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import type { ContestSettings, PartnerItem } from "@/lib/defaults";

export default function AdminContestPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [contest, setContest] = useState<ContestSettings>({
    title: "FOGM Trading Championship",
    subtitle: "Trade forex, gold and indices on live accounts. The best performers climb the board and win.",
    status: "active",
    startsAt: "",
    endsAt: "",
    registrationClosesAt: "",
    winnersDeclaredAt: "",
    prizeFund: 50000,
    metricLabel: "Net Profit",
    metricHelp: "Your realised profit in USD across all closed trades during the contest. Higher profit = higher rank.",
    currency: { code: "USD", locale: "en-US" },
  });

  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [declareConfirmOpen, setDeclareConfirmOpen] = useState(false);
  const [declaring, setDeclaring] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      if (data.contest) {
        setContest({
          ...data.contest,
          startsAt: data.contest.startsAt ? data.contest.startsAt.slice(0, 16) : "",
          endsAt: data.contest.endsAt ? data.contest.endsAt.slice(0, 16) : "",
          registrationClosesAt: data.contest.registrationClosesAt ? data.contest.registrationClosesAt.slice(0, 16) : "",
          winnersDeclaredAt: data.contest.winnersDeclaredAt ? data.contest.winnersDeclaredAt.slice(0, 16) : "",
        });
      }
      if (Array.isArray(data.partners)) {
        setPartners(data.partners);
      }
    } catch {
      showToast("Could not load contest settings", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        contest: {
          ...contest,
          startsAt: contest.startsAt ? new Date(contest.startsAt).toISOString() : null,
          endsAt: contest.endsAt ? new Date(contest.endsAt).toISOString() : null,
          registrationClosesAt: contest.registrationClosesAt ? new Date(contest.registrationClosesAt).toISOString() : null,
          winnersDeclaredAt: contest.winnersDeclaredAt ? new Date(contest.winnersDeclaredAt).toISOString() : null,
          prizeFund: Number(contest.prizeFund) || 0,
        },
        partners,
      };

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      showToast("Contest settings updated successfully", "success");
    } catch {
      showToast("Error saving contest settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeclareWinners = async () => {
    setDeclaring(true);
    try {
      const nowIso = new Date().toISOString();
      const updatedContest: ContestSettings = {
        ...contest,
        status: "winners_declared",
        winnersDeclaredAt: nowIso.slice(0, 16),
      };
      setContest(updatedContest);

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contest: {
            ...updatedContest,
            startsAt: updatedContest.startsAt ? new Date(updatedContest.startsAt).toISOString() : null,
            endsAt: updatedContest.endsAt ? new Date(updatedContest.endsAt).toISOString() : null,
            registrationClosesAt: updatedContest.registrationClosesAt ? new Date(updatedContest.registrationClosesAt).toISOString() : null,
            winnersDeclaredAt: nowIso,
            prizeFund: Number(updatedContest.prizeFund) || 0,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to declare winners");
      showToast("Winners declared! Status updated to 'winners_declared'.", "success");
      setDeclareConfirmOpen(false);
    } catch {
      showToast("Failed to declare winners", "error");
    } finally {
      setDeclaring(false);
    }
  };

  const addPartner = () => {
    setPartners([...partners, { name: "", role: "Trading Partner" }]);
  };

  const updatePartner = (idx: number, field: keyof PartnerItem, val: string) => {
    setPartners((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const removePartner = (idx: number) => {
    setPartners((prev) => prev.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        <svg className="animate-spin size-5 mr-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading contest settings...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contest Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure championship details, timeline stages, prize fund, and partners.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDeclareConfirmOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
          >
            Declare Winners
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border rounded-xl p-6 shadow-xs">
        <div className="md:col-span-2">
          <h2 className="text-base font-semibold text-foreground mb-4">Core Championship Info</h2>
        </div>

        <FormField label="Contest Title" required>
          <input
            type="text"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={contest.title}
            onChange={(e) => setContest({ ...contest, title: e.target.value })}
          />
        </FormField>

        <FormField label="Contest Status" hint="Current stage of the championship" required>
          <select
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={contest.status}
            onChange={(e) => setContest({ ...contest, status: e.target.value as ContestSettings["status"] })}
          >
            <option value="upcoming">Upcoming (Starting Soon)</option>
            <option value="registration_open">Registration Open</option>
            <option value="active">Active (Live Trading)</option>
            <option value="ended">Ended (Calculations Pending)</option>
            <option value="winners_declared">Winners Declared</option>
          </select>
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Subtitle / Description">
            <textarea
              rows={2}
              className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={contest.subtitle}
              onChange={(e) => setContest({ ...contest, subtitle: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="Prize Fund (USD)" hint="Total prize pool value displayed" required>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-mono">$</span>
            <input
              type="number"
              className="w-full h-10 pl-7 pr-3 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={contest.prizeFund}
              onChange={(e) => setContest({ ...contest, prizeFund: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </FormField>

        <FormField label="Ranking Metric Label" hint="Default: 'Net Profit'">
          <input
            type="text"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={contest.metricLabel}
            onChange={(e) => setContest({ ...contest, metricLabel: e.target.value })}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Metric Help / Tooltip Copy">
            <input
              type="text"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={contest.metricHelp}
              onChange={(e) => setContest({ ...contest, metricHelp: e.target.value })}
            />
          </FormField>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border rounded-xl p-6 shadow-xs">
        <div className="md:col-span-2">
          <h2 className="text-base font-semibold text-foreground mb-1">Contest Timeline & Schedule</h2>
          <p className="text-xs text-muted-foreground mb-4">Dates and timestamps (local timezone)</p>
        </div>

        <FormField label="Registration Closes At">
          <input
            type="datetime-local"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={contest.registrationClosesAt ?? ""}
            onChange={(e) => setContest({ ...contest, registrationClosesAt: e.target.value })}
          />
        </FormField>

        <FormField label="Contest Starts At">
          <input
            type="datetime-local"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={contest.startsAt ?? ""}
            onChange={(e) => setContest({ ...contest, startsAt: e.target.value })}
          />
        </FormField>

        <FormField label="Contest Ends At">
          <input
            type="datetime-local"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={contest.endsAt ?? ""}
            onChange={(e) => setContest({ ...contest, endsAt: e.target.value })}
          />
        </FormField>

        <FormField label="Winners Declared At">
          <input
            type="datetime-local"
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={contest.winnersDeclaredAt ?? ""}
            onChange={(e) => setContest({ ...contest, winnersDeclaredAt: e.target.value })}
          />
        </FormField>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Championship Partners</h2>
            <p className="text-xs text-muted-foreground">Brokers, liquidity providers, and analytics partners.</p>
          </div>
          <button
            type="button"
            onClick={addPartner}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            + Add Partner
          </button>
        </div>

        {partners.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed border-border rounded-lg">
            No partners listed. Click &quot;+ Add Partner&quot; to configure.
          </p>
        ) : (
          <div className="space-y-3">
            {partners.map((partner, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-border/60">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Partner Name (e.g. Prime Brokerage)"
                    value={partner.name}
                    onChange={(e) => updatePartner(idx, "name", e.target.value)}
                    className="w-full h-9 px-3 rounded border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Partner Role (e.g. Liquidity Partner)"
                    value={partner.role}
                    onChange={(e) => updatePartner(idx, "role", e.target.value)}
                    className="w-full h-9 px-3 rounded border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePartner(idx)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove partner"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={declareConfirmOpen}
        title="Declare Contest Winners?"
        description="This will set the championship status to 'winners_declared' and record the declaration timestamp. The public leaderboard and winners banner will immediately display final winning results."
        confirmText="Yes, Declare Winners"
        confirmPhrase="DECLARE"
        danger
        loading={declaring}
        onConfirm={handleDeclareWinners}
        onClose={() => setDeclareConfirmOpen(false)}
      />
    </div>
  );
}
