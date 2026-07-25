import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()), // "administrator" | "manager" | "support"
  }).index("by_token", ["tokenIdentifier"]),

  packages: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // KES
    duration: v.string(), // "1h", "3h", "24h", "3d", "7d", "30d"
    downloadSpeed: v.number(), // Mbps
    uploadSpeed: v.number(), // Mbps
    deviceLimit: v.number(),
    active: v.boolean(),
    displayOrder: v.number(),
  }).index("by_active", ["active"]).index("by_order", ["displayOrder"]),

  routers: defineTable({
    name: v.string(),
    location: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    apiPort: v.optional(v.number()),
    apiUsername: v.optional(v.string()),
    apiPassword: v.optional(v.string()),
    hotspotName: v.string(),
    token: v.string(), // registration + heartbeat token
    status: v.string(), // "pending" | "online" | "offline"
    lastHeartbeat: v.optional(v.string()),
    activeUsers: v.number(),
    model: v.optional(v.string()),
    firmware: v.optional(v.string()),
    uptime: v.optional(v.string()),
    cpuLoad: v.optional(v.number()),
    freeMemory: v.optional(v.number()),
  }).index("by_status", ["status"])
    .index("by_token", ["token"]),

  customers: defineTable({
    phone: v.string(),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.string(), // "active" | "blocked"
  }).index("by_phone", ["phone"]).index("by_status", ["status"]),

  devices: defineTable({
    customerId: v.optional(v.id("customers")),
    macAddress: v.string(),
    deviceName: v.optional(v.string()),
    deviceType: v.optional(v.string()), // "mobile" | "tv" | "laptop" | "desktop" | "other"
    routerId: v.optional(v.id("routers")),
    blocked: v.boolean(),
    blockReason: v.optional(v.string()),
    lastSeen: v.string(),
  }).index("by_mac", ["macAddress"]).index("by_customer", ["customerId"]),

  payments: defineTable({
    phone: v.string(),
    amount: v.number(),
    packageId: v.id("packages"),
    customerId: v.optional(v.id("customers")),
    deviceMac: v.optional(v.string()),
    deviceIp: v.optional(v.string()),
    routerId: v.optional(v.id("routers")),
    merchantRequestId: v.optional(v.string()),
    checkoutRequestId: v.optional(v.string()),
    mpesaReceipt: v.optional(v.string()),
    status: v.string(), // "pending" | "paid" | "failed" | "cancelled"
    resultCode: v.optional(v.number()),
    resultDescription: v.optional(v.string()),
    paidAt: v.optional(v.string()),
    activationError: v.optional(v.string()),
  }).index("by_status", ["status"])
    .index("by_phone", ["phone"])
    .index("by_checkout", ["checkoutRequestId"]),

  sessions: defineTable({
    customerId: v.optional(v.id("customers")),
    routerId: v.optional(v.id("routers")),
    packageId: v.id("packages"),
    paymentId: v.optional(v.id("payments")),
    macAddress: v.optional(v.string()),
    hotspotUsername: v.string(),
    startTime: v.string(),
    expiryTime: v.string(),
    disconnectTime: v.optional(v.string()),
    status: v.string(), // "active" | "expired" | "disconnected"
    bytesIn: v.number(),
    bytesOut: v.number(),
  }).index("by_status", ["status"])
    .index("by_customer", ["customerId"])
    .index("by_expiry", ["expiryTime"]),

  vouchers: defineTable({
    code: v.string(),
    packageId: v.id("packages"),
    batchId: v.string(),
    status: v.string(), // "unused" | "used" | "expired"
    customerId: v.optional(v.id("customers")),
    usedAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
  }).index("by_code", ["code"])
    .index("by_batch", ["batchId"])
    .index("by_status", ["status"]),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
  }).index("by_key", ["key"]),

  notifications: defineTable({
    type: v.string(),
    title: v.string(),
    message: v.optional(v.string()),
    read: v.boolean(),
    metadata: v.optional(v.string()), // JSON string
  }).index("by_read", ["read"]),

  // Queued hotspot activations waiting to be picked up by the router heartbeat
  pendingActivations: defineTable({
    routerId: v.id("routers"),
    paymentId: v.id("payments"),
    phone: v.string(),
    macAddress: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    hotspotUsername: v.string(),  // phone-derived e.g. 254712345678
    timelimit: v.string(),        // RouterOS format e.g. "01:00:00"
    downloadSpeed: v.number(),    // Mbps
    uploadSpeed: v.number(),      // Mbps
    packageName: v.string(),
    status: v.string(),           // "queued" | "delivered" | "failed"
    deliveredAt: v.optional(v.string()),
  }).index("by_router_status", ["routerId", "status"])
    .index("by_payment", ["paymentId"]),

  // Devices discovered on the network by the router heartbeat
  discoveredDevices: defineTable({
    routerId: v.id("routers"),
    macAddress: v.string(),
    ipAddress: v.optional(v.string()),
    hostname: v.optional(v.string()),
    vendor: v.optional(v.string()),
    lastSeen: v.string(),
  }).index("by_router", ["routerId"])
    .index("by_mac", ["macAddress"]),
});
