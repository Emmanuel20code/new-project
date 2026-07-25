import { v } from "convex/values";
import { httpAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const callback = httpAction(async (ctx, request) => {
  const body = (await request.json()) as {
    Body?: {
      stkCallback?: {
        CheckoutRequestID: string;
        ResultCode: number;
        ResultDesc: string;
        CallbackMetadata?: {
          Item?: Array<{ Name: string; Value?: string | number }>;
        };
      };
    };
  };

  const stkCallback = body?.Body?.stkCallback;
  if (!stkCallback) {
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
  const items = CallbackMetadata?.Item ?? [];
  const receiptItem = items.find((i) => i.Name === "MpesaReceiptNumber");
  const receipt = receiptItem?.Value ? String(receiptItem.Value) : undefined;

  await ctx.runMutation(internal.mpesa.processCallback, {
    checkoutRequestId: CheckoutRequestID,
    resultCode: ResultCode,
    resultDescription: ResultDesc,
    mpesaReceipt: receipt,
  });

  return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
    headers: { "Content-Type": "application/json" },
  });
});

export const processCallback = internalMutation({
  args: {
    checkoutRequestId: v.string(),
    resultCode: v.number(),
    resultDescription: v.string(),
    mpesaReceipt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_checkout", (q) => q.eq("checkoutRequestId", args.checkoutRequestId))
      .first();

    if (!payment) return;

    if (args.resultCode === 0) {
      await ctx.db.patch(payment._id, {
        status: "paid",
        resultCode: args.resultCode,
        resultDescription: args.resultDescription,
        mpesaReceipt: args.mpesaReceipt,
        paidAt: new Date().toISOString(),
      });

      await ctx.db.insert("notifications", {
        type: "payment",
        title: "New Payment",
        message: `${payment.phone} paid KES ${payment.amount}`,
        read: false,
      });

      // ── AUTO ACTIVATE: queue hotspot access for the customer ──────────────
      await ctx.runMutation(internal.activations.createActivation, {
        paymentId: payment._id,
        phone: payment.phone,
        packageId: payment.packageId,
        macAddress: payment.deviceMac,
        ipAddress: payment.deviceIp,
        routerId: payment.routerId,
      });
    } else {
      await ctx.db.patch(payment._id, {
        status: "failed",
        resultCode: args.resultCode,
        resultDescription: args.resultDescription,
      });
    }
  },
});
