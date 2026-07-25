import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("packages")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("packages").withIndex("by_order").collect();
  },
});

export const getById = query({
  args: { id: v.id("packages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    duration: v.string(),
    downloadSpeed: v.number(),
    uploadSpeed: v.number(),
    deviceLimit: v.number(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    }
    return await ctx.db.insert("packages", {
      ...args,
      active: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("packages"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    duration: v.optional(v.string()),
    downloadSpeed: v.optional(v.number()),
    uploadSpeed: v.optional(v.number()),
    deviceLimit: v.optional(v.number()),
    displayOrder: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    }
    const { id, ...fields } = args;
    const pkg = await ctx.db.get(id);
    if (!pkg) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Package not found" });
    }
    await ctx.db.patch(id, fields);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("packages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    }
    const pkg = await ctx.db.get(args.id);
    if (!pkg) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Package not found" });
    }
    await ctx.db.patch(args.id, { active: !pkg.active });
  },
});
