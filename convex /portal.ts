import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

// Format phone number to 254XXXXXXXXX
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+254")) return cleaned.slice(1);
  if (cleaned.startsWith("254")) return cleaned;
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1);
  return "254" + cleaned;
}

export const initiatePayment = action({
  args: {
    phone: v.string(),
    packageId: v.id("packages"),
    deviceMac: v.optional(v.string()),
    deviceIp: v.optional(v.string()),
    routerToken: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; checkoutRequestId?: string; message?: string }> => {
    const pkg = await ctx.runQuery(api.packages.getById, { id: args.packageId });
    if (!pkg) {
      return { success: false, message: "Package not found" };
    }

    // Resolve routerId from token if provided
    let routerId: Id<"routers"> | undefined;
    if (args.routerToken) {
      const router = await ctx.runQuery(api.routers.getByToken, { token: args.routerToken });
      routerId = router?._id;
    }

    const consumerKey = process.env.CONSUMER_KEY ?? "";
    const consumerSecret = process.env.CONSUMER_SECRET ?? "";
    const shortcode = process.env.SHORTCODE ?? "";
    const passkey = process.env.PASSKEY ?? "";
    const callbackUrl = process.env.CALLBACK_URL ?? "";

    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
      return { success: false, message: "M-PESA not configured. Contact support." };
    }

    // Get OAuth token
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: { Authorization: `Basic ${credentials}` },
      },
    );

    if (!tokenRes.ok) {
      return { success: false, message: "Failed to connect to M-PESA. Try again." };
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return { success: false, message: "M-PESA authentication failed." };
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
    const formattedPhone = formatPhone(args.phone);

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(pkg.price),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `EMMATECH-${formattedPhone}`,
      TransactionDesc: `${pkg.name} - Internet Package`,
    };

    const stkRes = await fetch(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      },
    );

    if (!stkRes.ok) {
      return { success: false, message: "Failed to initiate payment. Try again." };
    }

    const stkData = (await stkRes.json()) as {
      ResponseCode?: string;
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
      CustomerMessage?: string;
    };

    if (stkData.ResponseCode !== "0") {
      return { success: false, message: stkData.CustomerMessage ?? "Payment initiation failed." };
    }

    const checkoutRequestId = stkData.CheckoutRequestID ?? "";
    const merchantRequestId = stkData.MerchantRequestID ?? "";

    await ctx.runMutation(internal.portal.createPayment, {
      phone: formattedPhone,
      amount: pkg.price,
      packageId: args.packageId,
      deviceMac: args.deviceMac,
      deviceIp: args.deviceIp,
      routerId,
      checkoutRequestId,
      merchantRequestId,
    });

    return { success: true, checkoutRequestId };
  },
});

export const checkPaymentStatus = query({
  args: { checkoutRequestId: v.string() },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_checkout", (q) => q.eq("checkoutRequestId", args.checkoutRequestId))
      .first();
    return payment
      ? { status: payment.status, receipt: payment.mpesaReceipt }
      : { status: "pending", receipt: undefined };
  },
});

export const redeemVoucher = action({
  args: {
    code: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; message: string; packageName?: string; duration?: string }> => {
    const voucher = await ctx.runQuery(internal.portal.getVoucherByCode, { code: args.code.trim().toUpperCase() });

    if (!voucher) {
      return { success: false, message: "Voucher not found. Check the code and try again." };
    }

    if (voucher.status === "used") {
      return { success: false, message: "This voucher has already been used." };
    }

    if (voucher.status === "expired") {
      return { success: false, message: "This voucher has expired." };
    }

    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      return { success: false, message: "This voucher has expired." };
    }

    const pkg = await ctx.runQuery(api.packages.getById, { id: voucher.packageId });

    await ctx.runMutation(internal.portal.markVoucherUsed, {
      voucherId: voucher._id,
      phone: args.phone,
    });

    return {
      success: true,
      message: "Voucher redeemed successfully! Connect to EMMATECH WiFi to enjoy your session.",
      packageName: pkg?.name ?? "Internet Package",
      duration: pkg?.duration ?? "",
    };
  },
});

// Internal queries and mutations
export const getVoucherByCode = internalQuery({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vouchers")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

export const createPayment = internalMutation({
  args: {
    phone: v.string(),
    amount: v.number(),
    packageId: v.id("packages"),
    deviceMac: v.optional(v.string()),
    deviceIp: v.optional(v.string()),
    routerId: v.optional(v.id("routers")),
    checkoutRequestId: v.string(),
    merchantRequestId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"payments">> => {
    return await ctx.db.insert("payments", {
      phone: args.phone,
      amount: args.amount,
      packageId: args.packageId,
      deviceMac: args.deviceMac,
      deviceIp: args.deviceIp,
      routerId: args.routerId,
      checkoutRequestId: args.checkoutRequestId,
      merchantRequestId: args.merchantRequestId,
      status: "pending",
    });
  },
});

export const markVoucherUsed = internalMutation({
  args: {
    voucherId: v.id("vouchers"),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.voucherId, {
      status: "used",
      usedAt: new Date().toISOString(),
    });
    await ctx.db.insert("notifications", {
      type: "voucher",
      title: "Voucher Redeemed",
      message: `Voucher redeemed${args.phone ? ` by ${args.phone}` : ""}`,
      read: false,
    });
  },
});
