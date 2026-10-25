"use client";

import { useState, useMemo } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Input,
  Select,
} from "@/components/admin/AdminPrimitives";
import { useToast } from "@/components/admin/Toast";
import {
  API_REGISTRY,
  type ApiEndpoint,
  type ApiTag,
  type HttpMethod,
} from "@/lib/api-registry";

const TAG_OPTIONS: { value: ApiTag | "all"; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "public", label: "Public" },
  { value: "auth", label: "Authentication" },
  { value: "user", label: "User & Profile" },
  { value: "admin", label: "Administration" },
  { value: "diagnostics", label: "Diagnostics & Ops" },
];

const METHOD_OPTIONS: { value: HttpMethod | "all"; label: string }[] = [
  { value: "all", label: "All Methods" },
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
];

function MethodBadge({ method }: { method: HttpMethod }) {
  const styles: Record<HttpMethod, string> = {
    GET: "bg-up/15 text-up border border-up/25",
    POST: "bg-accent/15 text-accent border border-accent/25",
    PATCH: "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/25",
    DELETE: "bg-down/15 text-down border border-down/25",
  };
  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-bold text-[11px] px-2.5 py-1 rounded-lg w-16 uppercase tracking-wider text-center ${styles[method]}`}
    >
      {method}
    </span>
  );
}

function AuthBadge({ auth }: { auth: ApiEndpoint["auth"] }) {
  if (auth === "public") {
    return <Badge variant="mute">Public</Badge>;
  }
  if (auth === "user-cookie") {
    return <Badge variant="accent">User Cookie</Badge>;
  }
  return <Badge variant="gold">Admin Cookie</Badge>;
}

const getTimestamp = () => {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return 0;
};

export default function AdminApiDocsPage() {
  const { showToast } = useToast();
  const [selectedTag, setSelectedTag] = useState<ApiTag | "all">("all");
  const [selectedMethod, setSelectedMethod] = useState<HttpMethod | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(API_REGISTRY[0]?.id ?? null);

  // Try it state
  const [tryEndpoint, setTryEndpoint] = useState<ApiEndpoint | null>(null);
  const [tryLoading, setTryLoading] = useState(false);
  const [tryResult, setTryResult] = useState<{
    status: number;
    latencyMs: number;
    data: unknown;
  } | null>(null);

  const filteredEndpoints = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return API_REGISTRY.filter((ep) => {
      if (selectedTag !== "all" && ep.tag !== selectedTag) return false;
      if (selectedMethod !== "all" && ep.method !== selectedMethod) return false;
      if (!q) return true;
      return (
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.description.toLowerCase().includes(q)
      );
    });
  }, [selectedTag, selectedMethod, searchQuery]);

  const handleCopyCurl = (template: string) => {
    void navigator.clipboard.writeText(template);
    showToast("Curl command copied to clipboard", "success");
  };

  const handleExecuteTryIt = async (ep: ApiEndpoint) => {
    setTryEndpoint(ep);
    setTryLoading(true);
    setTryResult(null);

    // Resolve parameter placeholders (e.g., [userId] -> preview)
    const testPath = ep.path.replace(/\[([^\]]+)\]/g, "preview");

    const start = getTimestamp();
    try {
      const res = await fetch(testPath, { method: "GET" });
      const elapsed = Math.round(getTimestamp() - start);

      const contentType = res.headers.get("content-type") ?? "";
      let data: unknown;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
        data = await res.text();
      } else {
        data = `[Binary stream: ${contentType}]`;
      }

      setTryResult({
        status: res.status,
        latencyMs: elapsed,
        data,
      });
    } catch (e) {
      const elapsed = Math.round(getTimestamp() - start);
      setTryResult({
        status: 0,
        latencyMs: elapsed,
        data: { error: e instanceof Error ? e.message : "Fetch execution failed" },
      });
    } finally {
      setTryLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="API Reference & Explorer"
        description="Comprehensive interactive documentation for all 27 public, user, and administrative REST endpoints."
      >
        <Badge variant="accent">27 Verified Endpoints</Badge>
      </PageHeader>

      {/* Filter and Search Bar */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-full sm:w-56">
            <Select
              value={selectedTag}
              onChange={(v) => setSelectedTag(v as ApiTag | "all")}
              options={TAG_OPTIONS}
            />
          </div>

          <div className="w-full sm:w-44">
            <Select
              value={selectedMethod}
              onChange={(v) => setSelectedMethod(v as HttpMethod | "all")}
              options={METHOD_OPTIONS}
            />
          </div>

          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search by path or keyword (e.g. /api/admin/users, otp)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 text-meta"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-meta text-mute border-t border-hairline pt-3">
          <span>
            Showing <strong className="text-ink font-semibold">{filteredEndpoints.length}</strong> of{" "}
            {API_REGISTRY.length} endpoints
          </span>
          {(selectedTag !== "all" || selectedMethod !== "all" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTag("all");
                setSelectedMethod("all");
                setSearchQuery("");
              }}
              className="text-accent hover:underline text-xs font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Endpoint List */}
      <div className="space-y-4">
        {filteredEndpoints.map((ep) => {
          const isExpanded = expandedId === ep.id;
          return (
            <Card
              key={ep.id}
              className={`p-0 overflow-hidden transition ${
                isExpanded ? "ring-1 ring-accent/30 shadow-md" : "hover:border-hairline-strong"
              }`}
            >
              {/* Header / Click to Toggle */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : ep.id)}
                className="w-full p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left hover:bg-alt/40 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MethodBadge method={ep.method} />
                  <span className="font-mono text-sm font-semibold text-ink truncate">
                    {ep.path}
                  </span>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                  <span className="text-cell text-mute hidden md:inline truncate max-w-xs">
                    {ep.summary}
                  </span>
                  <AuthBadge auth={ep.auth} />
                  <span className="text-mute text-xs">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {/* Expanded Details Panel */}
              {isExpanded && (
                <div className="border-t border-hairline bg-alt/20 p-6 space-y-6">
                  <div>
                    <h4 className="text-meta font-semibold uppercase tracking-wider text-mute mb-1">
                      Description
                    </h4>
                    <p className="text-cell text-ink leading-relaxed">
                      {ep.description}
                    </p>
                  </div>

                  {/* Attributes metadata grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-meta">
                    <div className="p-3 rounded-xl bg-card border border-hairline">
                      <span className="text-faint block text-[11px] uppercase">Auth Requirement</span>
                      <span className="font-semibold text-ink capitalize">{ep.auth}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-hairline">
                      <span className="text-faint block text-[11px] uppercase">Rate Limited</span>
                      <span className={`font-semibold ${ep.rateLimited ? "text-accent" : "text-mute"}`}>
                        {ep.rateLimited ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-hairline">
                      <span className="text-faint block text-[11px] uppercase">Same-Origin Check</span>
                      <span className={`font-semibold ${ep.sameOrigin ? "text-accent" : "text-mute"}`}>
                        {ep.sameOrigin ? "Strict" : "None"}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-hairline">
                      <span className="text-faint block text-[11px] uppercase">Category Tag</span>
                      <span className="font-semibold text-ink capitalize">{ep.tag}</span>
                    </div>
                  </div>

                  {/* Query Parameters */}
                  {ep.queryParams && ep.queryParams.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-meta font-semibold uppercase tracking-wider text-mute">
                        Query Parameters
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-hairline bg-card">
                        <table className="w-full text-left text-meta">
                          <thead>
                            <tr className="border-b border-hairline bg-alt/50 text-mute">
                              <th className="py-2.5 px-3 font-semibold">Parameter</th>
                              <th className="py-2.5 px-3 font-semibold">Type</th>
                              <th className="py-2.5 px-3 font-semibold">Required</th>
                              <th className="py-2.5 px-3 font-semibold">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-hairline">
                            {ep.queryParams.map((param) => (
                              <tr key={param.name}>
                                <td className="py-2 px-3 font-mono text-accent font-semibold">
                                  {param.name}
                                </td>
                                <td className="py-2 px-3 font-mono text-faint">{param.type}</td>
                                <td className="py-2 px-3">
                                  {param.required ? (
                                    <span className="text-down font-bold">Yes</span>
                                  ) : (
                                    <span className="text-faint">No</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-ink">{param.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Request Body */}
                  {ep.requestBody && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-meta font-semibold uppercase tracking-wider text-mute">
                          Request Body ({ep.requestBody.contentType})
                        </h4>
                      </div>
                      <pre className="p-4 rounded-xl bg-[#0b0b1a] text-[#38bdf8] font-mono text-xs overflow-x-auto border border-zinc-800">
                        {ep.requestBody.example ?? ep.requestBody.schema}
                      </pre>
                    </div>
                  )}

                  {/* Responses */}
                  <div className="space-y-2">
                    <h4 className="text-meta font-semibold uppercase tracking-wider text-mute">
                      Responses & Error Codes
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ep.responses.map((resp) => (
                        <div
                          key={resp.status}
                          className="p-3.5 rounded-xl border border-hairline bg-card space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                                resp.status >= 200 && resp.status < 300
                                  ? "bg-up/10 text-up"
                                  : resp.status >= 400 && resp.status < 500
                                  ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                                  : "bg-down/10 text-down"
                              }`}
                            >
                              HTTP {resp.status}
                            </span>
                            <span className="text-[11px] text-mute">{resp.description}</span>
                          </div>
                          {resp.schema && (
                            <pre className="p-2.5 rounded-lg bg-[#0b0b1a] text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-36">
                              {resp.schema}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Working Curl Example */}
                  <div className="space-y-2 pt-2 border-t border-hairline">
                    <div className="flex items-center justify-between">
                      <h4 className="text-meta font-semibold uppercase tracking-wider text-mute">
                        cURL Command
                      </h4>
                      <div className="flex items-center gap-2">
                        {ep.method === "GET" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleExecuteTryIt(ep)}
                            loading={tryLoading && tryEndpoint?.id === ep.id}
                            className="h-8 text-xs font-semibold"
                          >
                            ▶ Try It
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCurl(ep.curlTemplate)}
                          className="h-8 text-xs font-medium"
                        >
                          Copy cURL
                        </Button>
                      </div>
                    </div>
                    <pre className="p-4 rounded-xl bg-[#0b0b1a] text-emerald-400 font-mono text-xs overflow-x-auto border border-zinc-800">
                      {ep.curlTemplate}
                    </pre>
                  </div>

                  {/* Try It Live Result Panel */}
                  {tryEndpoint?.id === ep.id && tryResult && (
                    <div className="space-y-2 pt-2 border-t border-hairline">
                      <div className="flex items-center justify-between">
                        <span className="text-meta font-semibold uppercase tracking-wider text-accent">
                          Live Response Output
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              tryResult.status >= 200 && tryResult.status < 300
                                ? "bg-up/10 text-up"
                                : "bg-down/10 text-down"
                            }`}
                          >
                            Status: {tryResult.status}
                          </span>
                          <Badge variant="accent">{tryResult.latencyMs} ms</Badge>
                        </div>
                      </div>
                      <pre className="p-4 rounded-xl bg-[#0b0b1a] text-cyan-300 font-mono text-xs overflow-x-auto max-h-72 border border-zinc-800">
                        {typeof tryResult.data === "string"
                          ? tryResult.data
                          : JSON.stringify(tryResult.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
