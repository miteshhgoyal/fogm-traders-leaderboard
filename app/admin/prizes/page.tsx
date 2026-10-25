"use client";

import { useEffect, useState, useCallback } from "react";
import { FormField } from "@/components/admin/FormField";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import type { PrizeItem } from "@/lib/defaults";

export default function AdminPrizesPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prizes, setPrizes] = useState<PrizeItem[]>([]);

  // Drawer edit / add state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formId, setFormId] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formRanksFrom, setFormRanksFrom] = useState(1);
  const [formRanksTo, setFormRanksTo] = useState(1);
  const [formReward, setFormReward] = useState("");
  const [formPerks, setFormPerks] = useState("");
  const [formWinnersCount, setFormWinnersCount] = useState(1);

  // Delete confirm
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      if (Array.isArray(data.prizes)) {
        setPrizes(data.prizes);
      }
    } catch {
      showToast("Could not load prize tiers", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditingIndex(null);
    const nextRank = prizes.reduce((acc, p) => Math.max(acc, p.ranksTo), 0) + 1;
    setFormId(`tier-${Date.now().toString(36)}`);
    setFormLabel("");
    setFormRanksFrom(nextRank);
    setFormRanksTo(nextRank);
    setFormReward("");
    setFormPerks("");
    setFormWinnersCount(1);
    setDrawerOpen(true);
  };

  const openEdit = (idx: number) => {
    const item = prizes[idx];
    if (!item) return;
    setEditingIndex(idx);
    setFormId(item.id);
    setFormLabel(item.label);
    setFormRanksFrom(item.ranksFrom);
    setFormRanksTo(item.ranksTo);
    setFormReward(item.reward);
    setFormPerks(item.perks ? item.perks.join("\n") : "");
    setFormWinnersCount(item.winnersCount || item.ranksTo - item.ranksFrom + 1);
    setDrawerOpen(true);
  };

  const handleDrawerSave = () => {
    if (!formLabel.trim()) {
      showToast("Tier label is required", "error");
      return;
    }
    if (!formReward.trim()) {
      showToast("Reward description is required", "error");
      return;
    }
    if (formRanksFrom < 1 || formRanksTo < 1 || formRanksFrom > formRanksTo) {
      showToast("Invalid rank range. Ensure Ranks From ≤ Ranks To.", "error");
      return;
    }

    // Overlap validation
    const overlap = prizes.some((p, i) => {
      if (editingIndex !== null && i === editingIndex) return false;
      return !(formRanksTo < p.ranksFrom || formRanksFrom > p.ranksTo);
    });

    if (overlap) {
      showToast("Rank range overlaps with an existing prize tier", "error");
      return;
    }

    const perksArray = formPerks
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const newItem: PrizeItem = {
      id: formId || `tier-${Date.now().toString(36)}`,
      label: formLabel.trim(),
      ranksFrom: Number(formRanksFrom),
      ranksTo: Number(formRanksTo),
      reward: formReward.trim(),
      perks: perksArray,
      winnersCount: Number(formWinnersCount) || formRanksTo - formRanksFrom + 1,
    };

    let nextPrizes: PrizeItem[];
    if (editingIndex !== null) {
      nextPrizes = [...prizes];
      nextPrizes[editingIndex] = newItem;
    } else {
      nextPrizes = [...prizes, newItem];
    }

    // Sort by ranksFrom asc
    nextPrizes.sort((a, b) => a.ranksFrom - b.ranksFrom);
    setPrizes(nextPrizes);
    setDrawerOpen(false);
  };

  const handleDelete = () => {
    if (deleteIndex === null) return;
    setPrizes((prev) => prev.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null);
    showToast("Prize tier removed locally. Remember to click 'Save Changes'.", "info");
  };

  const handleSaveToBackend = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizes }),
      });
      if (!res.ok) throw new Error("Failed to save prizes");
      showToast("Prize tiers successfully updated", "success");
    } catch {
      showToast("Failed to save prize tiers", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        <svg className="animate-spin size-5 mr-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading prize tiers...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Prize Structure & Tiers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure rank tiers, rewards, perks, and prize distribution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openAdd}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            + Add Prize Tier
          </button>
          <button
            type="button"
            onClick={handleSaveToBackend}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {prizes.map((tier, idx) => (
          <div
            key={tier.id || idx}
            className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {tier.ranksFrom === tier.ranksTo ? `Rank #${tier.ranksFrom}` : `Ranks #${tier.ranksFrom} – #${tier.ranksTo}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tier.winnersCount} {tier.winnersCount === 1 ? "winner" : "winners"}
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground">{tier.label}</h3>
              <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {tier.reward}
              </p>

              {tier.perks && tier.perks.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-3">
                  {tier.perks.map((perk, pIdx) => (
                    <li key={pIdx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="text-primary font-bold">✓</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => openEdit(idx)}
                className="px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted rounded transition-colors"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteIndex(idx)}
                className="px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Drawer
        isOpen={drawerOpen}
        title={editingIndex !== null ? "Edit Prize Tier" : "Add Prize Tier"}
        description="Set rank boundaries and reward details."
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="px-4 py-2 text-sm text-foreground hover:bg-muted rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDrawerSave}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90"
            >
              Apply Tier
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Tier Label" hint="e.g. '1st Place', 'Podium (2nd-3rd)', 'Top 20'" required>
            <input
              type="text"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Rank From" required>
              <input
                type="number"
                min={1}
                value={formRanksFrom}
                onChange={(e) => setFormRanksFrom(parseInt(e.target.value) || 1)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
            <FormField label="Rank To" required>
              <input
                type="number"
                min={1}
                value={formRanksTo}
                onChange={(e) => setFormRanksTo(parseInt(e.target.value) || 1)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
          </div>

          <FormField label="Reward Headline" hint="e.g. '$15,000 cash' or '$1,000 cash'" required>
            <input
              type="text"
              value={formReward}
              onChange={(e) => setFormReward(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>

          <FormField label="Number of Winners">
            <input
              type="number"
              min={1}
              value={formWinnersCount}
              onChange={(e) => setFormWinnersCount(parseInt(e.target.value) || 1)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>

          <FormField label="Perks (one per line)">
            <textarea
              rows={4}
              value={formPerks}
              onChange={(e) => setFormPerks(e.target.value)}
              placeholder="$15,000 Cash Prize&#10;Championship Trophy&#10;Featured on winners wall"
              className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={deleteIndex !== null}
        title="Delete Prize Tier?"
        description="Are you sure you want to remove this prize tier?"
        confirmText="Delete Tier"
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleteIndex(null)}
      />
    </div>
  );
}
