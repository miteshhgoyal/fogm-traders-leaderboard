import { z } from "zod";
import { requireAdmin, adminClientIp } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { fail, json, readJson, sameOrigin } from "@/lib/http";
import { dbConnect } from "@/lib/db";
import { Trader } from "@/lib/models/Trader";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  await dbConnect();
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "overall";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get("pageSize") ?? "25")));
  const search = url.searchParams.get("search") ?? "";
  
  const filter: Record<string, unknown> = { period };
  if (search) filter.name = { $regex: search, $options: "i" };
  
  const [total, traders] = await Promise.all([
    Trader.countDocuments(filter),
    Trader.find(filter).sort({ netProfit: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
  ]);
  
  return json({
    total,
    page,
    pageSize,
    traders: traders.map((t) => ({ id: String(t._id), ...t })),
  });
}

const TraderSchema = z.object({
  name: z.string().min(1).max(60),
  countryCode: z.string().max(2),
  city: z.string().max(60),
  netProfit: z.number(),
  returnPct: z.number(),
  winRatePct: z.number(),
  maxDrawdownPct: z.number(),
  tradesCount: z.number().int().min(0),
  volumeLots: z.number().min(0),
  topInstrument: z.string().max(20),
  trend: z.array(z.number()).length(14),
  period: z.enum(["today", "week", "overall"]),
  previousRank: z.number().nullable().optional(),
  userId: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  const parsed = TraderSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(400, "invalid_input", { errors: parsed.error.errors });
  
  await dbConnect();
  const trader = await Trader.create(parsed.data);
  
  await logAudit({ actor: admin.email, action: "create_trader", target: `trader:${String(trader._id)}`, before: null, after: parsed.data, ip: adminClientIp(req) });
  
  return json({ ok: true, id: String(trader._id) });
}

export async function PATCH(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  const body = await readJson(req) as Record<string, unknown>;
  if (!body || typeof body.id !== "string") return fail(400, "missing_id");
  
  const { id, ...rest } = body;
  const parsed = TraderSchema.partial().safeParse(rest);
  if (!parsed.success) return fail(400, "invalid_input");
  
  await dbConnect();
  const before = await Trader.findById(id).lean();
  if (!before) return fail(404, "not_found");
  
  await Trader.findByIdAndUpdate(id, { $set: parsed.data });
  await logAudit({ actor: admin.email, action: "edit_trader", target: `trader:${id}`, before, after: parsed.data, ip: adminClientIp(req) });
  
  return json({ ok: true });
}

export async function DELETE(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return fail(400, "missing_id");
  
  await dbConnect();
  const before = await Trader.findById(id).lean();
  if (!before) return fail(404, "not_found");
  
  await Trader.findByIdAndDelete(id);
  await logAudit({ actor: admin.email, action: "delete_trader", target: `trader:${id}`, before, after: null, ip: adminClientIp(req) });
  
  return json({ ok: true });
}
