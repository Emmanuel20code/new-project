import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: {},
  handler: async (ctx): Promise<Record<string, string>> => {
    const settings = await ctx.db.query("settings").collect();
    const map: Record<string, string> = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    return map;
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("settings", { key: args.key, value: args.value });
    }
  },
});

export const setMany = mutation({
  args: { settings: v.array(v.object({ key: v.string(), value: v.string() })) },
  handler: async (ctx, args): Promise<void> => {
    for (const item of args.settings) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", item.key))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { value: item.value });
      } else {
        await ctx.db.insert("settings", { key: item.key, value: item.value });
      }
    }
  },
});
