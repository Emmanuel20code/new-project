import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel.d.ts";

type SessionWithPackage = Doc<"sessions"> & { packageName: string };

export const listActive = query({
  args: {},
  handler: async (ctx): Promise<SessionWithPackage[]> => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    return Promise.all(
      sessions.map(async (s) => {
        const pkg = await ctx.db.get(s.packageId);
        return { ...s, packageName: pkg?.name ?? "Unknown" };
      })
    );
  },
});

export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args): Promise<SessionWithPackage[]> => {
    const sessions = args.status
      ? await ctx.db
          .query("sessions")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("sessions").order("desc").take(100);
    return Promise.all(
      sessions.map(async (s) => {
        const pkg = await ctx.db.get(s.packageId);
        return { ...s, packageName: pkg?.name ?? "Unknown" };
      })
    );
  },
});

export const disconnect = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "disconnected",
      disconnectTime: new Date().toISOString(),
    });
  },
});
