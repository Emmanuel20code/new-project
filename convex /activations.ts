/**
 * Handles the full lifecycle of a hotspot activation:
 *   payment confirmed → create pendingActivation → router heartbeat picks it up
 *   → router adds hotspot user → router acks → session recorded
 */
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

// ─── Duration helpers ────────────────────────────────────────────────────────

/** Parse duration string into milliseconds */
export function parseDurationMs(duration: string): number {
  const n = parseInt(duration, 10);
  if (duration.endsWith("m")) return n * 60 * 1000;
  if (duration.endsWith("h")) return n * 60 * 60 * 1000;
  if (duration.endsWith("d")) return n * 24 * 60 * 60 * 1000;
  return 60 * 60 * 1000; // default 1h
}

/** Convert duration to RouterOS timelimit format "HH:MM:SS" */
export function durationToTimelimit(duration: string): string {
  const ms = parseDurationMs(duration);
  const totalSec = Math.floor(ms / 1000);
  const hh = Math.floor(totalSec / 3600).toString().padStart(2, "0");
  const mm = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
  const ss = (totalSec % 60).toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** Convert expiry timelimit to ISO date string */
export function calcExpiry(duration: string): string {
  return new Date(Date.now() + parseDurationMs(duration)).toISOString();
}

/** Convert phone to a safe hotspot username */
export function phoneToUsername(phone: string): string {
  return phone.replace(/\D/g, "");
}

// ─── Create a pending activation after payment confirmed ─────────────────────

export const createActivation = internalMutation({
  args: {
    paymentId: v.id("payments"),
    phone: v.string(),
    packageId: v.id("packages"),
    macAddress: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    routerId: v.optional(v.id("routers")),
  },
  handler: async (ctx, args): Promise<void> => {
    const pkg = await ctx.db.get(args.packageId);
    if (!pkg) return;

    // Find a router — prefer the one linked to the payment, else first online router
    let routerId = args.routerId;
    if (!routerId) {
      const onlineRouter = await ctx.db
        .query("routers")
        .withIndex("by_status", (q) => q.eq("status", "online"))
        .first();
      routerId = onlineRouter?._id;
    }
    if (!routerId) {
      // No router available — still record as queued, will deliver when one comes online
      const anyRouter = await ctx.db.query("routers").first();
      routerId = anyRouter?._id;
    }
    if (!routerId) return; // No routers at all

    const timelimit = durationToTimelimit(pkg.duration);
    const hotspotUsername = phoneToUsername(args.phone);
    const expiryTime = calcExpiry(pkg.duration);

    // Upsert customer
    let custRow = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
    if (!custRow) {
      const cid = await ctx.db.insert("customers", {
        phone: args.phone,
        status: "active",
      });
      custRow = await ctx.db.get(cid);
    }

    // Upsert device if MAC known
    if (args.macAddress && custRow) {
      const existing = await ctx.db
        .query("devices")
        .withIndex("by_mac", (q) => q.eq("macAddress", args.macAddress!))
        .first();
      if (!existing) {
        await ctx.db.insert("devices", {
          customerId: custRow._id,
          macAddress: args.macAddress,
          routerId,
          blocked: false,
          lastSeen: new Date().toISOString(),
        });
      } else {
        await ctx.db.patch(existing._id, {
          customerId: custRow._id,
          lastSeen: new Date().toISOString(),
        });
      }
    }

    // Create session record
    const sessionId = await ctx.db.insert("sessions", {
      customerId: custRow?._id,
      routerId,
      packageId: args.packageId,
      paymentId: args.paymentId,
      macAddress: args.macAddress,
      hotspotUsername,
      startTime: new Date().toISOString(),
      expiryTime,
      status: "active",
      bytesIn: 0,
      bytesOut: 0,
    });

    // Queue activation for router
    await ctx.db.insert("pendingActivations", {
      routerId,
      paymentId: args.paymentId,
      phone: args.phone,
      macAddress: args.macAddress,
      ipAddress: args.ipAddress,
      hotspotUsername,
      timelimit,
      downloadSpeed: pkg.downloadSpeed,
      uploadSpeed: pkg.uploadSpeed,
      packageName: pkg.name,
      status: "queued",
    });

    // Notification
    await ctx.db.insert("notifications", {
      type: "activation",
      title: "New Activation",
      message: `${args.phone} activated ${pkg.name} (${pkg.duration})`,
      read: false,
    });

    void sessionId;
  },
});

// ─── Router fetches its pending activations ──────────────────────────────────

export const getPendingForRouter = internalQuery({
  args: { routerId: v.id("routers") },
  handler: async (ctx, args): Promise<Doc<"pendingActivations">[]> => {
    return ctx.db
      .query("pendingActivations")
      .withIndex("by_router_status", (q) =>
        q.eq("routerId", args.routerId).eq("status", "queued"),
      )
      .collect();
  },
});

// ─── Router acks that it has delivered an activation ─────────────────────────

export const ackActivation = internalMutation({
  args: {
    activationId: v.id("pendingActivations"),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.activationId, {
      status: args.success ? "delivered" : "failed",
      deliveredAt: new Date().toISOString(),
    });
    if (args.success) {
      const act = await ctx.db.get(args.activationId);
      if (act) {
        await ctx.db.patch(act.paymentId, { activationError: undefined });
      }
    }
  },
});

// ─── Public: check if a MAC has an active session ────────────────────────────

export const getActiveSessionForMac = query({
  args: { macAddress: v.string() },
  handler: async (ctx, args): Promise<{
    active: boolean;
    expiryTime?: string;
    packageName?: string;
  }> => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.eq(q.field("macAddress"), args.macAddress))
      .first();
    if (!session) return { active: false };
    const pkg = await ctx.db.get(session.packageId);
    // Check expiry — can't patch in a query, just return inactive
    if (new Date(session.expiryTime) < new Date()) {
      return { active: false };
    }
    return { active: true, expiryTime: session.expiryTime, packageName: pkg?.name };
  },
});

// ─── Admin: list pending activations ─────────────────────────────────────────

export const listPending = query({
  args: {},
  handler: async (ctx): Promise<Doc<"pendingActivations">[]> => {
    return ctx.db
      .query("pendingActivations")
      .filter((q) => q.eq(q.field("status"), "queued"))
      .collect();
  },
});

// ─── Discovered devices: upsert from router heartbeat ────────────────────────

export const upsertDiscoveredDevice = internalMutation({
  args: {
    routerId: v.id("routers"),
    macAddress: v.string(),
    ipAddress: v.optional(v.string()),
    hostname: v.optional(v.string()),
    vendor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("discoveredDevices")
      .withIndex("by_mac", (q) => q.eq("macAddress", args.macAddress))
      .first();
    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ipAddress: args.ipAddress,
        hostname: args.hostname,
        vendor: args.vendor,
        lastSeen: now,
      });
    } else {
      await ctx.db.insert("discoveredDevices", {
        routerId: args.routerId,
        macAddress: args.macAddress,
        ipAddress: args.ipAddress,
        hostname: args.hostname,
        vendor: args.vendor,
        lastSeen: now,
      });
    }
  },
});

// ─── Admin: list discovered devices ──────────────────────────────────────────

export const listDiscovered = query({
  args: { routerId: v.optional(v.id("routers")) },
  handler: async (ctx, args): Promise<(Doc<"discoveredDevices"> & {
    bound: boolean;
    customerPhone?: string;
    deviceType?: string;
    blocked?: boolean;
  })[]> => {
    const discovered = args.routerId
      ? await ctx.db
          .query("discoveredDevices")
          .withIndex("by_router", (q) => q.eq("routerId", args.routerId!))
          .collect()
      : await ctx.db.query("discoveredDevices").collect();

    return Promise.all(
      discovered.map(async (d) => {
        const boundDevice = await ctx.db
          .query("devices")
          .withIndex("by_mac", (q) => q.eq("macAddress", d.macAddress))
          .first();
        let customerPhone: string | undefined;
        if (boundDevice?.customerId) {
          const cust = await ctx.db.get(boundDevice.customerId);
          customerPhone = cust?.phone;
        }
        return {
          ...d,
          bound: !!boundDevice,
          customerPhone,
          deviceType: boundDevice?.deviceType,
          blocked: boundDevice?.blocked,
        };
      }),
    );
  },
});

// ─── Admin: bind a discovered device to a customer ───────────────────────────

export const bindDevice = mutation({
  args: {
    macAddress: v.string(),
    customerId: v.optional(v.id("customers")),
    phone: v.optional(v.string()),      // create customer if no customerId
    deviceName: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    routerId: v.optional(v.id("routers")),
  },
  handler: async (ctx, args): Promise<Id<"devices">> => {
    let customerId = args.customerId;

    // Create customer from phone if needed
    if (!customerId && args.phone) {
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone!))
        .first();
      if (existing) {
        customerId = existing._id;
      } else {
        customerId = await ctx.db.insert("customers", {
          phone: args.phone,
          status: "active",
        });
      }
    }

    const existing = await ctx.db
      .query("devices")
      .withIndex("by_mac", (q) => q.eq("macAddress", args.macAddress))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        customerId,
        deviceName: args.deviceName ?? existing.deviceName,
        deviceType: args.deviceType ?? existing.deviceType,
        routerId: args.routerId ?? existing.routerId,
        lastSeen: new Date().toISOString(),
      });
      return existing._id;
    }

    return ctx.db.insert("devices", {
      macAddress: args.macAddress,
      customerId,
      deviceName: args.deviceName,
      deviceType: args.deviceType,
      routerId: args.routerId,
      blocked: false,
      lastSeen: new Date().toISOString(),
    });
  },
});
