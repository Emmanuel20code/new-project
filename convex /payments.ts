import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel.d.ts";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Doc<"payments">[]> => {
    const q = ctx.db.query("payments");
    if (args.status !== undefined) {
      return await q
        .withIndex("by_status", (idx) => idx.eq("status", args.status!))
        .order("desc")
        .take(args.limit ?? 50);
    }
    return await q.order("desc").take(args.limit ?? 50);
  },
});

export const retryActivation = mutation({
  args: { id: v.id("payments") },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    }
    const payment = await ctx.db.get(args.id);
    if (!payment) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Payment not found" });
    }
    await ctx.db.patch(args.id, { activationError: undefined });
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx): Promise<{ pending: number; paid: number; failed: number }> => {
    const [pending, paid, failed] = await Promise.all([
      ctx.db
        .query("payments")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect(),
      ctx.db
        .query("payments")
        .withIndex("by_status", (q) => q.eq("status", "paid"))
        .collect(),
      ctx.db
        .query("payments")
        .withIndex("by_status", (q) => q.eq("status", "failed"))
        .collect(),
    ]);
    return { pending: pending.length, paid: paid.length, failed: failed.length };
  },
});
