import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Doc<"customers">[]> => {
    const all = await ctx.db.query("customers").take(50);
    if (!args.search) return all;
    const q = args.search.toLowerCase();
    return all.filter(
      (c) =>
        c.phone.toLowerCase().includes(q) ||
        (c.fullName ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
    );
  },
});

type CustomerDetail = {
  customer: Doc<"customers">;
  payments: Doc<"payments">[];
  sessions: Doc<"sessions">[];
};

export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args): Promise<CustomerDetail | null> => {
    const customer = await ctx.db.get(args.id);
    if (!customer) return null;

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_phone", (q) => q.eq("phone", customer.phone))
      .order("desc")
      .take(20);

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_customer", (q) => q.eq("customerId", args.id))
      .order("desc")
      .take(20);

    return { customer, payments, sessions };
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const { id, ...fields } = args;
    const customer = await ctx.db.get(id);
    if (!customer) throw new ConvexError({ message: "Customer not found", code: "NOT_FOUND" });
    await ctx.db.patch(id, fields);
  },
});

export const setStatus = mutation({
  args: { id: v.id("customers"), status: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const customer = await ctx.db.get(args.id);
    if (!customer) throw new ConvexError({ message: "Customer not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.id, { status: args.status });
  },
});
