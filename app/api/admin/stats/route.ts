import { requireAdmin } from "@/lib/admin-auth";
import { fail, json } from "@/lib/http";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/User";
import { AuditLog } from "@/lib/models/AuditLog";
import { OtpCode } from "@/lib/models/OtpCode";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return fail(err.status ?? 401, err.message ?? "unauthorized");
  }
  
  await dbConnect();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const [totalUsers, newIn7d, activeIn7d, profileComplete, recentAudit] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ lastLoginAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ profileComplete: true }),
    AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  
  // Signups per day for last 30 days
  const signupsByDay = await User.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  
  // Top countries
  const topCountries = await User.aggregate([
    { $match: { country: { $ne: null } } },
    { $group: { _id: "$country", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  
  // Recent signups
  const recentSignups = await User.find().sort({ createdAt: -1 }).limit(10).select("name email country profileComplete createdAt").lean();
  
  const profileCompletePct = totalUsers > 0 ? Math.round((profileComplete / totalUsers) * 100) : 0;
  
  return json({
    totalUsers,
    newIn7d,
    activeIn7d,
    profileComplete,
    profileCompletePct,
    signupsByDay,
    topCountries,
    recentSignups: recentSignups.map((u) => ({ id: String(u._id), name: u.name, email: u.email, country: u.country, profileComplete: u.profileComplete, createdAt: u.createdAt })),
    recentAudit: recentAudit.map((a) => ({ id: String(a._id), action: a.action, target: a.target, ip: a.ip, createdAt: a.createdAt })),
  });
}
