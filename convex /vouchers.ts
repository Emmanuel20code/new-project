import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel.d.ts";

export const list = query({
  args: {
    status: v.optional(v.string()),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<(Doc<"vouchers"> & { packageName: string })[]> => {
    let vouchers: Doc<"vouchers">[];
    if (args.status) {
      vouchers = await ctx.db
        .query("vouchers")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      vouchers = await ctx.db.query("vouchers").collect();
    }
    if (args.batchId) {
      vouchers = vouchers.filter((v) => v.batchId === args.batchId);
    }
    return Promise.all(
      vouchers.map(async (voucher) => {
        const pkg = await ctx.db.get(voucher.packageId);
        return { ...voucher, packageName: pkg?.name ?? "Unknown" };
      })
    );
  },
});

export const generate = mutation({
  args: {
    packageId: v.id("packages"),
    quantity: v.number(),
    prefix: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ batchId: string; codes: string[] }> => {
    const batchId = `BATCH-${Date.now()}`;
    const prefix = args.prefix ?? "EM";
    const codes: string[] = [];
    const count = Math.min(args.quantity, 500);
    for (let i = 0; i < count; i++) {
      const code = `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await ctx.db.insert("vouchers", {
        code,
        packageId: args.packageId,
        batchId,
        status: "unused",
        expiresAt: args.expiresAt,
      });
      codes.push(code);
    }
    return { batchId, codes };
  },
});

export const voidVoucher = mutation({
  args: { id: v.id("vouchers") },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.id, { status: "expired" });
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args): Promise<Doc<"vouchers"> | null> =>
    ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first(),
});
