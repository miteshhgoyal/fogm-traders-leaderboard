"use client";

import { useState, useMemo } from "react";
import {
  PageHeader,
  Card,
  Button,
  Field,
  Input,
  Textarea,
  UnsavedBar,
  Skeleton,
} from "@/components/admin/AdminPrimitives";
import { useToast } from "@/components/admin/Toast";
import { DEFAULT_COPY, type StepItem, type FaqItem } from "@/lib/defaults";
import { useFetch } from "@/lib/use-async";

const CATEGORIES = [
  { id: "all", label: "All Strings" },
  { id: "hero", label: "Hero & Badges", prefix: "hero." },
  { id: "nav", label: "Navigation & Footer", prefixes: ["nav.", "footer."] },
  { id: "leaderboard", label: "Leaderboard & Rank", prefixes: ["leaderboard.", "rankCta.", "card.", "contest."] },
  { id: "modal", label: "Modal & Email", prefixes: ["modal.", "email."] },
  { id: "custom", label: "Other / Custom" },
] as const;

export default function AdminContentPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"copy" | "steps" | "rules" | "faqs" | "disclosure">("copy");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copySearch, setCopySearch] = useState("");

  const [copy, setCopy] = useState<Record<string, string>>({ ...DEFAULT_COPY });
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [rules, setRules] = useState<string[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [disclosure, setDisclosure] = useState("");

  const [initialState, setInitialState] = useState<{
    copy: Record<string, string>;
    steps: StepItem[];
    rules: string[];
    faqs: FaqItem[];
    disclosure: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  const { loading, error, refetch } = useFetch(async () => {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) throw new Error("Failed to load settings");
    const data = await res.json();

    const loadedCopy = data.copy && typeof data.copy === "object" ? { ...DEFAULT_COPY, ...data.copy } : { ...DEFAULT_COPY };
    const loadedSteps = Array.isArray(data.steps) ? data.steps : [];
    const loadedRules = Array.isArray(data.rules) ? data.rules : [];
    const loadedFaqs = Array.isArray(data.faqs) ? data.faqs : [];
    const loadedDisclosure = typeof data.disclosure === "string" ? data.disclosure : "";

    setCopy(loadedCopy);
    setSteps(loadedSteps);
    setRules(loadedRules);
    setFaqs(loadedFaqs);
    setDisclosure(loadedDisclosure);

    setInitialState({
      copy: loadedCopy,
      steps: loadedSteps,
      rules: loadedRules,
      faqs: loadedFaqs,
      disclosure: loadedDisclosure,
    });

    return data;
  }, []);

  const isDirty = useMemo(() => {
    if (!initialState) return false;
    return (
      JSON.stringify(copy) !== JSON.stringify(initialState.copy) ||
      JSON.stringify(steps) !== JSON.stringify(initialState.steps) ||
      JSON.stringify(rules) !== JSON.stringify(initialState.rules) ||
      JSON.stringify(faqs) !== JSON.stringify(initialState.faqs) ||
      disclosure !== initialState.disclosure
    );
  }, [copy, steps, rules, faqs, disclosure, initialState]);

  const handleDiscard = () => {
    if (!initialState) return;
    setCopy(initialState.copy);
    setSteps(initialState.steps);
    setRules(initialState.rules);
    setFaqs(initialState.faqs);
    setDisclosure(initialState.disclosure);
    showToast("Changes discarded", "info");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copy,
          steps,
          rules,
          faqs,
          disclosure,
        }),
      });
      if (!res.ok) throw new Error("Failed to save content");
      setInitialState({
        copy,
        steps,
        rules,
        faqs,
        disclosure,
      });
      showToast("Content & copy updated successfully", "success");
    } catch {
      showToast("Failed to save content", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredCopyKeys = useMemo(() => {
    const q = copySearch.toLowerCase().trim();
    const allKeys = Array.from(new Set([...Object.keys(DEFAULT_COPY), ...Object.keys(copy)])).sort();

    return allKeys.filter((k) => {
      // Category filter
      if (selectedCategory !== "all") {
        const cat = CATEGORIES.find((c) => c.id === selectedCategory);
        if (cat) {
          if ("prefix" in cat && cat.prefix && !k.startsWith(cat.prefix)) return false;
          if ("prefixes" in cat && cat.prefixes && !cat.prefixes.some((p) => k.startsWith(p))) return false;
          if (cat.id === "custom") {
            const isStandard =
              k.startsWith("hero.") ||
              k.startsWith("nav.") ||
              k.startsWith("footer.") ||
              k.startsWith("leaderboard.") ||
              k.startsWith("rankCta.") ||
              k.startsWith("card.") ||
              k.startsWith("contest.") ||
              k.startsWith("modal.") ||
              k.startsWith("email.");
            if (isStandard) return false;
          }
        }
      }

      // Search query filter
      if (!q) return true;
      const val = (copy[k] ?? "").toLowerCase();
      const def = (DEFAULT_COPY[k] ?? "").toLowerCase();
      return k.toLowerCase().includes(q) || val.includes(q) || def.includes(q);
    });
  }, [copySearch, copy, selectedCategory]);

  // Steps helpers
  const addStep = () => setSteps([...steps, { title: "New Step", body: "Description of the step" }]);
  const updateStep = (idx: number, field: keyof StepItem, val: string) => {
    setSteps((prev) => {
      const c = [...prev];
      c[idx] = { ...c[idx], [field]: val };
      return c;
    });
  };
  const removeStep = (idx: number) => setSteps((prev) => prev.filter((_, i) => i !== idx));

  // Rules helpers
  const addRule = () => setRules([...rules, "New rule or eligibility condition"]);
  const updateRule = (idx: number, val: string) => {
    setRules((prev) => {
      const c = [...prev];
      c[idx] = val;
      return c;
    });
  };
  const removeRule = (idx: number) => setRules((prev) => prev.filter((_, i) => i !== idx));

  // FAQ helpers
  const addFaq = () => setFaqs([...faqs, { q: "New Question?", a: "Detailed answer." }]);
  const updateFaq = (idx: number, field: keyof FaqItem, val: string) => {
    setFaqs((prev) => {
      const c = [...prev];
      c[idx] = { ...c[idx], [field]: val };
      return c;
    });
  };
  const removeFaq = (idx: number) => setFaqs((prev) => prev.filter((_, i) => i !== idx));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <p className="text-down font-medium">Failed to load content settings</p>
        <Button variant="secondary" size="sm" onClick={refetch} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content & Copy"
        description="Customize website copy strings, how-it-works steps, competition rules, FAQs, and regulatory disclosure."
      >
        <Button onClick={handleSave} loading={saving} disabled={!isDirty}>
          Save Changes
        </Button>
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-hairline pb-2 overflow-x-auto">
        {(
          [
            { id: "copy", label: "UI Copy Strings" },
            { id: "steps", label: "How to Enter" },
            { id: "rules", label: "Rules" },
            { id: "faqs", label: "FAQs" },
            { id: "disclosure", label: "Risk Disclosure" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`rounded-lg px-3.5 py-1.5 text-cell font-medium transition ${
              activeTab === t.id
                ? "bg-accent/15 text-accent font-semibold"
                : "text-mute hover:bg-alt hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* UI COPY STRINGS */}
      {activeTab === "copy" && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      selectedCategory === cat.id
                        ? "bg-accent text-accent-ink font-semibold"
                        : "border border-hairline bg-bg text-mute hover:text-ink hover:border-hairline-strong"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Input
                  type="text"
                  placeholder="Search copy or key..."
                  value={copySearch}
                  onChange={(e) => setCopySearch(e.target.value)}
                  className="h-9 text-meta"
                />
                {copySearch && (
                  <button
                    type="button"
                    onClick={() => setCopySearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <p className="text-meta text-mute">
              Showing <span className="font-semibold text-ink">{filteredCopyKeys.length}</span> strings
            </p>
          </Card>

          <div className="space-y-4">
            {filteredCopyKeys.map((key) => {
              const currentVal = copy[key] ?? "";
              const defaultVal = DEFAULT_COPY[key] ?? "";
              const isModified = currentVal !== defaultVal;
              const isMultiLine = currentVal.length > 80 || currentVal.includes("\n");

              return (
                <Card key={key} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-accent">{key}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-faint font-mono">
                        {currentVal.length} chars
                      </span>
                      {isModified && (
                        <button
                          type="button"
                          onClick={() => setCopy((prev) => ({ ...prev, [key]: defaultVal }))}
                          className="text-xs text-accent hover:underline font-medium"
                        >
                          Reset to default
                        </button>
                      )}
                    </div>
                  </div>

                  {isMultiLine ? (
                    <Textarea
                      rows={3}
                      value={currentVal}
                      onChange={(e) => setCopy((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="text-cell"
                    />
                  ) : (
                    <Input
                      type="text"
                      value={currentVal}
                      onChange={(e) => setCopy((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="text-cell"
                    />
                  )}

                  {isModified && defaultVal && (
                    <p className="text-meta text-mute italic">
                      Default: &quot;{defaultVal}&quot;
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* HOW TO ENTER (STEPS) */}
      {activeTab === "steps" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-cell text-mute">
              Shown in the &quot;How to Enter&quot; step-by-step section on the public site.
            </p>
            <Button size="sm" variant="secondary" onClick={addStep}>
              + Add Step
            </Button>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <Card key={idx} className="space-y-4">
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <span className="text-label font-bold text-ink uppercase tracking-wider">
                    Step {idx + 1}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeStep(idx)}
                    className="text-down hover:bg-down/10 h-7 px-2 text-xs"
                  >
                    Delete Step
                  </Button>
                </div>
                <Field label="Step Title">
                  <Input
                    value={step.title}
                    onChange={(e) => updateStep(idx, "title", e.target.value)}
                  />
                </Field>
                <Field label="Step Description">
                  <Textarea
                    rows={2}
                    value={step.body}
                    onChange={(e) => updateStep(idx, "body", e.target.value)}
                  />
                </Field>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* RULES */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-cell text-mute">
              Rules and fair-play competition terms displayed in the expandable rules section.
            </p>
            <Button size="sm" variant="secondary" onClick={addRule}>
              + Add Rule
            </Button>
          </div>

          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <Card key={idx} className="flex items-start gap-3 p-4">
                <span className="mt-2 text-label font-bold text-mute">{idx + 1}.</span>
                <div className="flex-1">
                  <Textarea
                    rows={2}
                    value={rule}
                    onChange={(e) => updateRule(idx, e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeRule(idx)}
                  className="text-down hover:bg-down/10 h-9 px-2.5"
                >
                  ✕
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* FAQS */}
      {activeTab === "faqs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-cell text-mute">
              Frequently asked questions displayed in the FAQ accordion on the public landing page.
            </p>
            <Button size="sm" variant="secondary" onClick={addFaq}>
              + Add FAQ
            </Button>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="space-y-4">
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <span className="text-label font-bold text-ink uppercase tracking-wider">
                    FAQ #{idx + 1}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFaq(idx)}
                    className="text-down hover:bg-down/10 h-7 px-2 text-xs"
                  >
                    Delete FAQ
                  </Button>
                </div>
                <Field label="Question">
                  <Input
                    value={faq.q}
                    onChange={(e) => updateFaq(idx, "q", e.target.value)}
                  />
                </Field>
                <Field label="Answer">
                  <Textarea
                    rows={3}
                    value={faq.a}
                    onChange={(e) => updateFaq(idx, "a", e.target.value)}
                  />
                </Field>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* DISCLOSURE */}
      {activeTab === "disclosure" && (
        <Card className="space-y-4">
          <div>
            <h3 className="text-sub font-semibold text-ink">Risk Disclosure & Legal Disclaimer</h3>
            <p className="text-cell text-mute mt-1">
              Displayed in the footer of every page. Essential regulatory risk warnings for Forex and CFD trading.
            </p>
          </div>
          <Textarea
            rows={8}
            value={disclosure}
            onChange={(e) => setDisclosure(e.target.value)}
            className="font-mono text-cell"
          />
        </Card>
      )}

      {/* Sticky Unsaved Changes Bar */}
      <UnsavedBar
        visible={isDirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
