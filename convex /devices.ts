import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel.d.ts";

type DeviceWithCustomer = Doc<"devices"> & { customerPhone?: string };

export const list = query({
  args: {},
  handler: async (ctx): Promise<DeviceWithCustomer[]> => {
    const devices = await ctx.db.query("devices").take(200);
    return await Promise.all(
      devices.map(async (device) => {
        if (!device.customerId) return device;
        const customer = await ctx.db.get(device.customerId);
        return { ...device, customerPhone: customer?.phone };
      })
    );
  },
});

export const setBlocked = mutation({
  args: {
    id: v.id("devices"),
    blocked: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const device = await ctx.db.get(args.id);
    if (!device) throw new ConvexError({ message: "Device not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.id, {
      blocked: args.blocked,
      blockReason: args.blocked ? args.reason : undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("devices"),
    deviceName: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args): Promise<void> => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
