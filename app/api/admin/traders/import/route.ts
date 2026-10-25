import { requireAdmin, adminClientIp } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { fail, json, sameOrigin } from "@/lib/http";
import { dbConnect } from "@/lib/db";
import { Trader } from "@/lib/models/Trader";
import { z } from "zod";

const RowSchema = z.object({
  name: z.string().min(1).max(60),
  countryCode: z.string().max(2).default("US"),
  city: z.string().max(60).default(""),
  netProfit: z.coerce.number(),
  returnPct: z.coerce.number().default(0),
  winRatePct: z.coerce.number().default(0),
  maxDrawdownPct: z.coerce.number().default(0),
  tradesCount: z.coerce.number().int().min(0).default(0),
  volumeLots: z.coerce.number().min(0).default(0),
  topInstrument: z.string().max(20).default("EURUSD"),
  period: z.enum(["today", "week", "overall"]).default("overall"),
});

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  const body = await req.text().catch(() => "");
  const rows = parseCsv(body);
  if (rows.length === 0) return fail(400, "empty_csv");
  
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "append"; // "replace" | "append"
  const dryRun = url.searchParams.get("dryRun") === "true";
  
  const valid: z.infer<typeof RowSchema>[] = [];
  const errors: { row: number; error: string }[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const parsed = RowSchema.safeParse(rows[i]);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      errors.push({ row: i + 2, error: parsed.error.errors.map((e) => e.message).join("; ") });
    }
  }
  
  if (dryRun) {
    return json({ ok: true, dryRun: true, valid: valid.length, errors });
  }
  
  if (errors.length > 0) {
    return fail(400, "validation_errors", { errors, validCount: valid.length });
  }
  
  await dbConnect();
  
  // Add placeholder trend arrays
  const traders = valid.map((t) => ({
    ...t,
    trend: Array.from({ length: 14 }, (_, i) => Math.round((t.netProfit * (i + 1)) / 14)),
  }));
  
  if (mode === "replace") {
    const period = valid[0]?.period ?? "overall";
    await Trader.deleteMany({ period });
  }
  
  await Trader.insertMany(traders);
  
  await logAudit({
    actor: admin.email,
    action: "import_traders",
    target: `traders:${valid.length}`,
    before: null,
    after: { mode, count: valid.length },
    ip: adminClientIp(req),
  });
  
  return json({ ok: true, imported: valid.length });
}
