import { query } from "./_generated/server";
import { v } from "convex/values";

export const revenueByDay = query({
  args: { days: v.number() },
  handler: async (ctx, args): Promise<{ date: string; revenue: number; count: number }[]> => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .collect();

    const now = new Date();
    const result: { date: string; revenue: number; count: number }[] = [];

    for (let i = args.days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayPayments = payments.filter((p) => (p.paidAt ?? "").startsWith(dateStr));
      result.push({
        date: dateStr,
        revenue: dayPayments.reduce((s, p) => s + p.amount, 0),
        count: dayPayments.length,
      });
    }

    return result;
  },
});

export const topPackages = query({
  args: {},
  handler: async (ctx): Promise<{ packageId: string; packageName: string; revenue: number; count: number }[]> => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .collect();

    const map = new Map<string, { revenue: number; count: number; name: string }>();

    await Promise.all(
      payments.map(async (p) => {
        const pkg = await ctx.db.get(p.packageId);
        const key = p.packageId;
        const existing = map.get(key) ?? { revenue: 0, count: 0, name: pkg?.name ?? "Unknown" };
        map.set(key, {
          revenue: existing.revenue + p.amount,
          count: existing.count + 1,
          name: pkg?.name ?? "Unknown",
        });
      })
    );

    return Array.from(map.entries())
      .map(([packageId, val]) => ({
        packageId,
        packageName: val.name,
        revenue: val.revenue,
        count: val.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  },
});
