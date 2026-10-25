"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { FormField } from "@/components/admin/FormField";
import { useToast } from "@/components/admin/Toast";
import { DEFAULT_COPY, type StepItem, type FaqItem } from "@/lib/defaults";

export default function AdminContentPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<"copy" | "steps" | "rules" | "faqs" | "disclosure">("copy");
  const [copySearch, setCopySearch] = useState("");
  const [copy, setCopy] = useState<Record<string, string>>({ ...DEFAULT_COPY });
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [rules, setRules] = useState<string[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [disclosure, setDisclosure] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      if (data.copy && typeof data.copy === "object") {
        setCopy({ ...DEFAULT_COPY, ...data.copy });
      }
      if (Array.isArray(data.steps)) setSteps(data.steps);
      if (Array.isArray(data.rules)) setRules(data.rules);
      if (Array.isArray(data.faqs)) setFaqs(data.faqs);
      if (typeof data.disclosure === "string") setDisclosure(data.disclosure);
    } catch {
      showToast("Could not load content settings", "error");
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
      showToast("Content & copy updated successfully", "success");
    } catch {
      showToast("Failed to save content", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredCopyKeys = useMemo(() => {
    const q = copySearch.toLowerCase().trim();
    const allKeys = Array.from(new Set([...Object.keys(DEFAULT_COPY), ...Object.keys(copy)]));
    if (!q) return allKeys;
    return allKeys.filter(
      (k) => k.toLowerCase().includes(q) || (copy[k] ?? "").toLowerCase().includes(q)
    );
  }, [copySearch, copy]);

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
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        <svg className="animate-spin size-5 mr-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading content...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Content & Copy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize website copy strings, how-it-works steps, competition rules, FAQs, and regulatory disclosure.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {(["copy", "steps", "rules", "faqs", "disclosure"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-semibold capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "copy" ? "UI Copy Strings" : tab === "faqs" ? "FAQs" : tab}
          </button>
        ))}
      </div>

      {/* UI COPY TAB */}
      {activeTab === "copy" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <input
              type="text"
              placeholder="Search copy keys or values..."
              value={copySearch}
              onChange={(e) => setCopySearch(e.target.value)}
              className="max-w-xs w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-xs text-muted-foreground">
              Showing {filteredCopyKeys.length} keys
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredCopyKeys.map((key) => {
              const currentVal = copy[key] ?? "";
              const defaultVal = DEFAULT_COPY[key] ?? "";
              const isModified = currentVal !== defaultVal;

              return (
                <div
                  key={key}
                  className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-primary">{key}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {currentVal.length} chars
                      </span>
                      {isModified && (
                        <button
                          type="button"
                          onClick={() => setCopy((prev) => ({ ...prev, [key]: defaultVal }))}
                          className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline"
                        >
                          Reset to default
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={currentVal}
                    onChange={(e) => setCopy((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {isModified && (
                    <p className="text-[11px] text-muted-foreground italic">
                      Default: &quot;{defaultVal}&quot;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEPS TAB */}
      {activeTab === "steps" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Shown in the &quot;How to Enter&quot; section on the landing page.
            </p>
            <button
              type="button"
              onClick={addStep}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              + Add Step
            </button>
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={idx} className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Step #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <FormField label="Title">
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => updateStep(idx, "title", e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </FormField>
                <FormField label="Body Description">
                  <textarea
                    rows={2}
                    value={step.body}
                    onChange={(e) => updateStep(idx, "body", e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </FormField>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RULES TAB */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Rules & fair-play terms displayed in the rules accordion.
            </p>
            <button
              type="button"
              onClick={addRule}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              + Add Rule
            </button>
          </div>

          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-card border border-border rounded-xl p-3 shadow-xs">
                <span className="text-xs font-bold text-muted-foreground mt-2">{idx + 1}.</span>
                <textarea
                  rows={2}
                  value={rule}
                  onChange={(e) => updateRule(idx, e.target.value)}
                  className="flex-1 p-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => removeRule(idx)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQS TAB */}
      {activeTab === "faqs" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Frequently asked questions displayed in the FAQ accordion.
            </p>
            <button
              type="button"
              onClick={addFaq}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              + Add FAQ
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">FAQ #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFaq(idx)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <FormField label="Question">
                  <input
                    type="text"
                    value={faq.q}
                    onChange={(e) => updateFaq(idx, "q", e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </FormField>
                <FormField label="Answer">
                  <textarea
                    rows={3}
                    value={faq.a}
                    onChange={(e) => updateFaq(idx, "a", e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </FormField>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DISCLOSURE TAB */}
      {activeTab === "disclosure" && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-foreground">Risk Disclosure & Legal Disclaimer</h2>
          <p className="text-xs text-muted-foreground">
            Appears at the very bottom of every page in the footer. Forex and CFD trading risk warnings.
          </p>
          <textarea
            rows={6}
            value={disclosure}
            onChange={(e) => setDisclosure(e.target.value)}
            className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}
    </div>
  );
}
