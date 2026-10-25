"use client";

import { useEffect, useState, useRef } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
  UnsavedBar,
} from "@/components/admin/AdminPrimitives";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import type { PrizeItem } from "@/lib/defaults";
import { useFetch } from "@/lib/use-async";

export default function AdminPrizesPage() {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [prizes, setPrizes] = useState<PrizeItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const nextId = useRef(1);

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

  const { data: initialData, loading, error, reload } = useFetch<{ prizes: PrizeItem[] }>(async () => {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) throw new Error("Failed to load prize settings");
    const json = await res.json();
    const loadedPrizes = Array.isArray(json.prizes) ? json.prizes : [];
    setPrizes(loadedPrizes);
    return {
      prizes: loadedPrizes,
    };
  });

  const openAdd = () => {
    setEditingIndex(null);
    const nextRank = prizes.reduce((acc, p) => Math.max(acc, p.ranksTo), 0) + 1;
    nextId.current += 1;
    setFormId(`tier_${nextId.current}`);
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

    const updatedItem: PrizeItem = {
      id: formId,
      label: formLabel.trim(),
      ranksFrom: formRanksFrom,
      ranksTo: formRanksTo,
      reward: formReward.trim(),
      perks: perksArray,
      winnersCount: formWinnersCount,
    };

    if (editingIndex !== null) {
      const copy = [...prizes];
      copy[editingIndex] = updatedItem;
      // Sort by ranksFrom
      copy.sort((a, b) => a.ranksFrom - b.ranksFrom);
      setPrizes(copy);
    } else {
      const copy = [...prizes, updatedItem];
      copy.sort((a, b) => a.ranksFrom - b.ranksFrom);
      setPrizes(copy);
    }

    setIsDirty(true);
    setDrawerOpen(false);
  };

  const handleDelete = () => {
    if (deleteIndex === null) return;
    const copy = prizes.filter((_, i) => i !== deleteIndex);
    setPrizes(copy);
    setIsDirty(true);
    setDeleteIndex(null);
    showToast("Prize tier removed");
  };

  const handleSaveAll = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizes }),
      });
      if (!res.ok) throw new Error("Failed to save prizes");
      showToast("Prize tiers published successfully", "success");
      setIsDirty(false);
    } catch {
      showToast("Error saving prizes", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-[f-fadein_.2s_ease-out]">
        <PageHeader title="Prizes Management" description="Prize pool allocation and reward tiers." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-down/30 bg-down/10 p-6 text-down">
        <p className="font-semibold">Failed to load prize configuration.</p>
        <p className="mt-1 text-meta">{error}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={reload}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[f-fadein_.3s_ease-out]">
      <PageHeader
        title="Prizes Management"
        description="Configure reward tiers, rank range distributions, and perks. Validated against overlaps."
      >
        <Button variant="secondary" size="sm" onClick={openAdd}>
          + Add Prize Tier
        </Button>
        <Button variant="primary" size="sm" loading={saving} disabled={saving || !isDirty} onClick={handleSaveAll}>
          Publish Changes
        </Button>
      </PageHeader>

      {prizes.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-cell text-mute">
            No prize tiers configured. Click &quot;+ Add Prize Tier&quot; to configure.
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {prizes.map((p, idx) => {
            const isGrand = idx === 0 || p.ranksFrom === 1;
            const rankLabel = p.ranksFrom === p.ranksTo ? `Rank #${p.ranksFrom}` : `Ranks #${p.ranksFrom} – #${p.ranksTo}`;
            return (
              <Card
                key={p.id}
                wash={isGrand}
                spotlight
                className="flex flex-col justify-between hover:border-hairline-strong"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-meta font-bold text-accent">{rankLabel}</span>
                    {isGrand ? (
                      <Badge variant="gold">Grand Prize</Badge>
                    ) : (
                      <Badge variant="mute">{p.winnersCount} Winner{p.winnersCount > 1 ? "s" : ""}</Badge>
                    )}
                  </div>
                  <h3 className="text-ctitle font-bold text-ink">{p.label}</h3>
                  <div className="mt-2 text-stat font-extrabold text-up tabular-nums">{p.reward}</div>
                  {p.perks && p.perks.length > 0 && (
                    <ul className="mt-4 space-y-1.5 border-t border-hairline pt-3 text-meta text-mute">
                      {p.perks.map((perk, pi) => (
                        <li key={pi} className="flex items-start gap-2">
                          <span className="text-accent font-bold">✓</span>
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 border-t border-hairline pt-3">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(idx)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-down hover:bg-down/10"
                    onClick={() => setDeleteIndex(idx)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit / Add Drawer */}
      <Drawer
        isOpen={drawerOpen}
        title={editingIndex !== null ? "Edit Prize Tier" : "Add Prize Tier"}
        description="Configure rank brackets and rewards"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleDrawerSave}>
              Save Tier
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Tier Label" required hint="e.g. 1st Place Trophy, Top 10 Finisher">
            <Input
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              placeholder="e.g. 1st Place"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ranks From" required hint="Starting rank">
              <Input
                type="number"
                min={1}
                value={formRanksFrom}
                onChange={(e) => setFormRanksFrom(parseInt(e.target.value) || 1)}
                className="font-mono"
              />
            </Field>

            <Field label="Ranks To" required hint="Ending rank">
              <Input
                type="number"
                min={1}
                value={formRanksTo}
                onChange={(e) => setFormRanksTo(parseInt(e.target.value) || 1)}
                className="font-mono"
              />
            </Field>
          </div>

          <Field label="Reward Text" required hint="e.g. $25,000 Cash + Trophy">
            <Input
              value={formReward}
              onChange={(e) => setFormReward(e.target.value)}
              placeholder="e.g. $25,000"
            />
          </Field>

          <Field label="Winners Count" hint="Total qualifying slots">
            <Input
              type="number"
              min={1}
              value={formWinnersCount}
              onChange={(e) => setFormWinnersCount(parseInt(e.target.value) || 1)}
              className="font-mono"
            />
          </Field>

          <Field label="Perks List (One per line)">
            <Textarea
              rows={4}
              value={formPerks}
              onChange={(e) => setFormPerks(e.target.value)}
              placeholder={"VIP Gala invitation\nCustom crystal award\nBrokerage fee exemption"}
            />
          </Field>
        </div>
      </Drawer>

      <UnsavedBar
        show={isDirty}
        saving={saving}
        onSave={handleSaveAll}
        onReset={() => {
          if (initialData) {
            setPrizes(initialData.prizes);
            setIsDirty(false);
          }
        }}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteIndex !== null}
        title="Delete Prize Tier?"
        description="This tier will be removed from the prize distribution pool."
        confirmText="Yes, Delete Tier"
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleteIndex(null)}
      />
    </div>
  );
}
