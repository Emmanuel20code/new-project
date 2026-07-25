import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { callback } from "./mpesa";

const http = httpRouter();

// M-PESA payment callback
http.route({
  path: "/mpesa/callback",
  method: "POST",
  handler: callback,
});

// MikroTik router check-in / heartbeat
// Router POSTs every 60s; response contains any pending hotspot activations
http.route({
  path: "/router/checkin",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = (await request.json()) as {
        token?: string;
        ip?: string;
        hotspot?: string;
        model?: string;
        firmware?: string;
        uptime?: string;
        cpu?: number;
        mem?: number;
        users?: number;
        devices?: Array<{ mac: string; ip?: string; hostname?: string }>;
        acks?: Array<{ activationId: string; success: boolean }>;
      };

      if (!body.token) {
        return new Response(JSON.stringify({ ok: false, error: "token required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const ip =
        body.ip ??
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown";

      const result = await ctx.runMutation(internal.routers.handleCheckin, {
        token: body.token,
        ipAddress: ip,
        hotspotName: body.hotspot,
        model: body.model,
        firmware: body.firmware,
        uptime: body.uptime,
        cpuLoad: body.cpu,
        freeMemory: body.mem,
        activeUsers: body.users,
        devices: body.devices,
        acks: body.acks,
      });

      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 404,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
