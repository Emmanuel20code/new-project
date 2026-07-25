import { query } from "./_generated/server";
import { ConvexError } from "convex/values";

type DashboardStats = {
  totalRevenue: number;
  totalPayments: number;
  activePackages: number;
  activeSessions: number;
  pendingPayments: number;
  todayRevenue: number;
};

export const getDashboardStats = query({
  args: {},
  handler: async (ctx): Promise<DashboardStats> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Get all paid payments
    const paidPayments = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .collect();

    const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPayments = paidPayments.length;

    // Today's revenue
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const todayRevenue = paidPayments
      .filter((p) => p.paidAt !== undefined && p.paidAt.startsWith(todayStr))
      .reduce((sum, p) => sum + p.amount, 0);

    // Active packages
    const activePackages = await ctx.db
      .query("packages")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Active sessions
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Pending payments
    const pendingPayments = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return {
      totalRevenue,
      totalPayments,
      activePackages: activePackages.length,
      activeSessions: activeSessions.length,
      pendingPayments: pendingPayments.length,
      todayRevenue,
    };
  },
});
