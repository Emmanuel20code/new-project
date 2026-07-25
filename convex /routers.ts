import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel.d.ts";

/** Generate a cryptographically random token */
function makeToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let t = "";
  for (let i = 0; i < 24; i++) {
    t += chars[Math.floor(Math.random() * chars.length)];
    if ((i + 1) % 6 === 0 && i < 23) t += "-";
  }
  return t;
}

/** List all routers */
export const list = query({
  args: {},
  handler: async (ctx): Promise<Doc<"routers">[]> => ctx.db.query("routers").collect(),
});

/** Get router by token (used by portal to resolve routerId) */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<Doc<"routers"> | null> => {
    return ctx.db
      .query("routers")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
  },
});

/** Generate a pending router slot — admin pastes the returned token into MikroTik */
export const generateToken = mutation({
  args: {
    name: v.string(),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ token: string; routerId: string }> => {
    const token = makeToken();
    const routerId = await ctx.db.insert("routers", {
      name: args.name,
      location: args.location,
      hotspotName: "hotspot",
      token,
      status: "pending",
      activeUsers: 0,
    });
    return { token, routerId };
  },
});

/** Update router name/location after it has been registered */
export const update = mutation({
  args: {
    id: v.id("routers"),
    name: v.string(),
    location: v.optional(v.string()),
    hotspotName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

/** Remove a router */
export const remove = mutation({
  args: { id: v.id("routers") },
  handler: async (ctx, args) => ctx.db.delete(args.id),
});

/** Called by the HTTP action when a router sends a heartbeat / first registration */
export const handleCheckin = internalMutation({
  args: {
    token: v.string(),
    ipAddress: v.string(),
    hotspotName: v.optional(v.string()),
    model: v.optional(v.string()),
    firmware: v.optional(v.string()),
    uptime: v.optional(v.string()),
    cpuLoad: v.optional(v.number()),
    freeMemory: v.optional(v.number()),
    activeUsers: v.optional(v.number()),
    // Discovered devices on the network
    devices: v.optional(v.array(v.object({
      mac: v.string(),
      ip: v.optional(v.string()),
      hostname: v.optional(v.string()),
    }))),
    // ACKs from the router for activations it has processed
    acks: v.optional(v.array(v.object({
      activationId: v.string(),
      success: v.boolean(),
    }))),
  },
  handler: async (ctx, args): Promise<{
    ok: boolean;
    name?: string;
    activations?: Array<{
      id: string;
      username: string;
      timelimit: string;
      mac?: string;
      ip?: string;
      downloadMbps: number;
      uploadMbps: number;
    }>;
  }> => {
    const router = await ctx.db
      .query("routers")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!router) return { ok: false };

    await ctx.db.patch(router._id, {
      status: "online",
      ipAddress: args.ipAddress,
      hotspotName: args.hotspotName ?? router.hotspotName,
      model: args.model,
      firmware: args.firmware,
      uptime: args.uptime,
      cpuLoad: args.cpuLoad,
      freeMemory: args.freeMemory,
      activeUsers: args.activeUsers ?? 0,
      lastHeartbeat: new Date().toISOString(),
    });

    // Upsert discovered devices
    if (args.devices?.length) {
      for (const d of args.devices) {
        const existing = await ctx.db
          .query("discoveredDevices")
          .withIndex("by_mac", (q) => q.eq("macAddress", d.mac))
          .first();
        const now = new Date().toISOString();
        if (existing) {
          await ctx.db.patch(existing._id, {
            ipAddress: d.ip,
            hostname: d.hostname,
            lastSeen: now,
          });
        } else {
          await ctx.db.insert("discoveredDevices", {
            routerId: router._id,
            macAddress: d.mac,
            ipAddress: d.ip,
            hostname: d.hostname,
            lastSeen: now,
          });
        }
      }
    }

    // Process ACKs
    if (args.acks?.length) {
      for (const ack of args.acks) {
        try {
          const activation = await ctx.db
            .query("pendingActivations")
            .filter((q) => q.eq(q.field("_id"), ack.activationId))
            .first();
          if (activation) {
            await ctx.db.patch(activation._id, {
              status: ack.success ? "delivered" : "failed",
              deliveredAt: new Date().toISOString(),
            });
          }
        } catch {
          // ignore invalid ids
        }
      }
    }

    // Return queued activations for this router
    const pending = await ctx.db
      .query("pendingActivations")
      .withIndex("by_router_status", (q) =>
        q.eq("routerId", router._id).eq("status", "queued"),
      )
      .collect();

    return {
      ok: true,
      name: router.name,
      activations: pending.map((a) => ({
        id: a._id,
        username: a.hotspotUsername,
        timelimit: a.timelimit,
        mac: a.macAddress,
        ip: a.ipAddress,
        downloadMbps: a.downloadSpeed,
        uploadMbps: a.uploadSpeed,
      })),
    };
  },
});

/** Mark routers that haven't heartbeated in >5 minutes as offline */
export const markStaleOffline = internalMutation({
  args: {},
  handler: async (ctx) => {
    const routers = await ctx.db
      .query("routers")
      .withIndex("by_status", (q) => q.eq("status", "online"))
      .collect();
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    for (const r of routers) {
      if (!r.lastHeartbeat || r.lastHeartbeat < cutoff) {
        await ctx.db.patch(r._id, { status: "offline" });
      }
    }
  },
});
