"use client";

import { useState } from "react";
import {
  Button,
  Card,
  DateTimeField,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  UnsavedBar,
} from "@/components/admin/AdminPrimitives";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import type { ContestSettings, PartnerItem } from "@/lib/defaults";
import { useFetch } from "@/lib/use-async";

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming (Starting Soon)" },
  { value: "registration_open", label: "Registration Open" },
  { value: "active", label: "Active (Live Trading)" },
  { value: "ended", label: "Ended (Calculations Pending)" },
  { value: "winners_declared", label: "Winners Declared" },
];

export default function AdminContestPage() {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [declareConfirmOpen, setDeclareConfirmOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [contest, setContest] = useState<ContestSettings>({
    title: "",
    subtitle: "",
    status: "active",
    startsAt: "",
    endsAt: "",
    registrationClosesAt: "",
    winnersDeclaredAt: "",
    prizeFund: 50000,
    metricLabel: "Net Profit",
    metricHelp: "",
    currency: { code: "USD", locale: "en-US" },
  });
  const [partners, setPartners] = useState<PartnerItem[]>([]);

  const { data: initialData, loading, error, reload } = useFetch<{
    contest: ContestSettings;
    partners: PartnerItem[];
  }>(async () => {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) throw new Error("Failed to load settings");
    const json = await res.json();
    const data = {
      contest: json.contest ?? {
        title: "FOGM Trading Championship",
        subtitle: "Trade forex, gold and indices on live accounts. The best performers climb the board and win.",
        status: "active",
        startsAt: "",
        endsAt: "",
        registrationClosesAt: "",
        winnersDeclaredAt: "",
        prizeFund: 50000,
        metricLabel: "Net Profit",
        metricHelp: "Your realised profit in USD across all closed trades during the contest.",
        currency: { code: "USD", locale: "en-US" },
      },
      partners: Array.isArray(json.partners) ? json.partners : [],
    };
    setContest(data.contest);
    setPartners(data.partners);
    return data;
  });

  const updateContest = (patch: Partial<ContestSettings>) => {
    setContest((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        contest: {
          ...contest,
          startsAt: contest.startsAt || null,
          endsAt: contest.endsAt || null,
          registrationClosesAt: contest.registrationClosesAt || null,
          winnersDeclaredAt: contest.winnersDeclaredAt || null,
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
      setIsDirty(false);
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
        winnersDeclaredAt: nowIso,
      };
      setContest(updatedContest);

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contest: {
            ...updatedContest,
            startsAt: updatedContest.startsAt || null,
            endsAt: updatedContest.endsAt || null,
            registrationClosesAt: updatedContest.registrationClosesAt || null,
            winnersDeclaredAt: nowIso,
            prizeFund: Number(updatedContest.prizeFund) || 0,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to declare winners");
      showToast("Winners declared! Status updated to 'winners_declared'.", "success");
      setDeclareConfirmOpen(false);
      setIsDirty(false);
    } catch {
      showToast("Failed to declare winners", "error");
    } finally {
      setDeclaring(false);
    }
  };

  const addPartner = () => {
    setPartners([...partners, { name: "", role: "Trading Partner" }]);
    setIsDirty(true);
  };

  const updatePartner = (idx: number, field: keyof PartnerItem, val: string) => {
    setPartners((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
    setIsDirty(true);
  };

  const removePartner = (idx: number) => {
    setPartners((prev) => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-8 animate-[f-fadein_.2s_ease-out]">
        <PageHeader title="Contest Configuration" description="Configure championship timeline and rules." />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-down/30 bg-down/10 p-6 text-down">
        <p className="font-semibold">Failed to load contest configuration.</p>
        <p className="mt-1 text-meta">{error}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={reload}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 animate-[f-fadein_.3s_ease-out]">
      <PageHeader
        title="Contest Configuration"
        description="Configure championship timeline, prize fund, localized date pickers, and partners."
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDeclareConfirmOpen(true)}
          className="border-amber-500/30 text-amber-500 hover:border-amber-500"
        >
          🏆 Declare Winners
        </Button>
        <Button variant="primary" size="sm" loading={saving} disabled={saving} onClick={handleSave}>
          Save Changes
        </Button>
      </PageHeader>

      {/* 1. Identity & Status */}
      <Card wash spotlight>
        <div className="mb-6">
          <h2 className="text-ctitle font-semibold text-ink">1. Championship Identity</h2>
          <p className="text-meta text-mute">Core championship metadata and live status indicator</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Contest Title" required>
            <Input
              value={contest.title}
              onChange={(e) => updateContest({ title: e.target.value })}
              placeholder="FOGM Trading Championship"
            />
          </Field>

          <Field label="Contest Status" hint="Controls user entry and winners banner" required>
            <Select
              value={contest.status}
              options={STATUS_OPTIONS}
              onChange={(val) => updateContest({ status: val as ContestSettings["status"] })}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Subtitle / Tagline">
              <Textarea
                rows={2}
                value={contest.subtitle}
                onChange={(e) => updateContest({ subtitle: e.target.value })}
                placeholder="Trade forex, gold and indices on live accounts."
              />
            </Field>
          </div>

          <Field label="Total Prize Fund (USD)" hint="Shown on landing hero and cards" required>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-cell font-mono text-mute">$</span>
              <Input
                type="number"
                className="pl-8 font-mono"
                value={contest.prizeFund}
                onChange={(e) => updateContest({ prizeFund: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </Field>

          <Field label="Ranking Metric Label" hint="Default: 'Net Profit'">
            <Input
              value={contest.metricLabel}
              onChange={(e) => updateContest({ metricLabel: e.target.value })}
              placeholder="Net Profit"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Metric Help / Tooltip Copy">
              <Input
                value={contest.metricHelp}
                onChange={(e) => updateContest({ metricHelp: e.target.value })}
                placeholder="Realised profit across closed trades during the contest window."
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* 2. Timeline & Schedule with Localized DateTimeField (Fix D-001) */}
      <Card spotlight>
        <div className="mb-6">
          <h2 className="text-ctitle font-semibold text-ink">2. Timeline & Schedule</h2>
          <p className="text-meta text-mute">
            Localized inputs convert seamlessly to/from UTC without date shifting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Registration Closes At" hint="Entrants cannot join after this point">
            <DateTimeField
              value={contest.registrationClosesAt ?? ""}
              onChange={(iso) => updateContest({ registrationClosesAt: iso })}
            />
          </Field>

          <Field label="Contest Starts At" hint="Official trading period begins">
            <DateTimeField
              value={contest.startsAt ?? ""}
              onChange={(iso) => updateContest({ startsAt: iso })}
            />
          </Field>

          <Field label="Contest Ends At" hint="Trading period finishes; calculations begin">
            <DateTimeField
              value={contest.endsAt ?? ""}
              onChange={(iso) => updateContest({ endsAt: iso })}
            />
          </Field>

          <Field label="Winners Declared At" hint="Final verified ranking published">
            <DateTimeField
              value={contest.winnersDeclaredAt ?? ""}
              onChange={(iso) => updateContest({ winnersDeclaredAt: iso })}
            />
          </Field>
        </div>
      </Card>

      {/* 3. Partners */}
      <Card spotlight>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-ctitle font-semibold text-ink">3. Championship Partners</h2>
            <p className="text-meta text-mute">Affiliate brokers, liquidity providers, and fintech partners.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={addPartner}>
            + Add Partner
          </Button>
        </div>

        {partners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hairline-strong p-8 text-center text-meta text-mute">
            No partners listed. Click &quot;+ Add Partner&quot; to configure.
          </div>
        ) : (
          <div className="space-y-3">
            {partners.map((partner, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-xl border border-hairline bg-alt p-3">
                <div className="flex-1">
                  <Input
                    placeholder="Partner Name (e.g. Prime Liquidity)"
                    value={partner.name}
                    onChange={(e) => updatePartner(idx, "name", e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Partner Role (e.g. Liquidity Partner)"
                    value={partner.role}
                    onChange={(e) => updatePartner(idx, "role", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePartner(idx)}
                  className="grid size-10 place-items-center rounded-xl text-mute hover:bg-down/10 hover:text-down transition"
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
      </Card>

      <UnsavedBar
        show={isDirty}
        saving={saving}
        onSave={handleSave}
        onReset={() => {
          if (initialData) {
            setContest(initialData.contest);
            setPartners(initialData.partners);
            setIsDirty(false);
          }
        }}
      />

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
