import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion, AnimatePresence } from "motion/react";
import { Wifi, Phone, Clock, Zap, Smartphone, X, CheckCircle, AlertCircle, Loader2, Tag, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Package = {
  _id: Id<"packages">;
  name: string;
  description?: string;
  price: number;
  duration: string;
  downloadSpeed: number;
  uploadSpeed: number;
  deviceLimit: number;
  active: boolean;
  displayOrder: number;
};

type PaymentStatus = "idle" | "initiating" | "pending" | "paid" | "failed";

function formatDuration(d: string): string {
  const map: Record<string, string> = {
    "1h": "1 Hour",
    "3h": "3 Hours",
    "6h": "6 Hours",
    "12h": "12 Hours",
    "24h": "24 Hours",
    "3d": "3 Days",
    "7d": "7 Days",
    "30d": "30 Days",
  };
  return map[d] ?? d;
}

function formatSpeed(mbps: number): string {
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(0)} Gbps`;
  return `${mbps} Mbps`;
}

// Payment Modal
function PaymentModal({
  pkg,
  onClose,
}: {
  pkg: Package;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const initiatePayment = useAction(api.portal.initiatePayment);

  // Poll payment status
  const paymentStatus = useQuery(
    api.portal.checkPaymentStatus,
    checkoutRequestId ? { checkoutRequestId } : "skip",
  );

  // React to polling updates
  if (
    checkoutRequestId &&
    paymentStatus &&
    status === "pending"
  ) {
    if (paymentStatus.status === "paid") {
      setStatus("paid");
      setReceipt(paymentStatus.receipt ?? null);
      setCheckoutRequestId(null);
    } else if (paymentStatus.status === "failed") {
      setStatus("failed");
      setErrorMsg("Payment was cancelled or failed. Please try again.");
      setCheckoutRequestId(null);
    }
  }

  const handlePay = async () => {
    const trimmed = phone.trim();
    if (!/^0[0-9]{9}$/.test(trimmed) && !/^254[0-9]{9}$/.test(trimmed)) {
      toast.error("Enter a valid Kenyan phone number e.g. 0712345678");
      return;
    }
    setStatus("initiating");
    setErrorMsg("");
    try {
      const result = await initiatePayment({
        phone: trimmed,
        packageId: pkg._id,
      });
      if (result.success && result.checkoutRequestId) {
        setCheckoutRequestId(result.checkoutRequestId);
        setStatus("pending");
      } else {
        setStatus("failed");
        setErrorMsg(result.message ?? "Payment initiation failed.");
      }
    } catch {
      setStatus("failed");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={status === "pending" ? undefined : onClose}
      />

      <motion.div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, #0f1629 0%, #1a2540 100%)" }}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Buy {pkg.name}</h2>
              <p className="text-orange-400 font-semibold text-lg">KES {pkg.price}</p>
            </div>
            {status !== "pending" && (
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          {/* Package details */}
          <div className="flex gap-4 mt-3 text-sm text-white/60">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {formatDuration(pkg.duration)}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> {formatSpeed(pkg.downloadSpeed)}
            </span>
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" /> {pkg.deviceLimit} {pkg.deviceLimit === 1 ? "device" : "devices"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Idle / Initiating */}
            {(status === "idle" || status === "initiating") && (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-white/70 text-sm mb-1.5 block">
                    M-PESA Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 text-base"
                    disabled={status === "initiating"}
                  />
                  <p className="text-white/40 text-xs mt-1.5">
                    You will receive an M-PESA prompt on this number
                  </p>
                </div>
                <Button
                  onClick={handlePay}
                  disabled={status === "initiating"}
                  className="w-full h-12 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white border-0 cursor-pointer"
                >
                  {status === "initiating" ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending prompt...</>
                  ) : (
                    <>Pay KES {pkg.price} <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
                <div className="flex items-center justify-center gap-2 text-white/30 text-xs">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Secured by Safaricom M-PESA</span>
                </div>
              </motion.div>
            )}

            {/* Pending */}
            {status === "pending" && (
              <motion.div
                key="pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6 space-y-4"
              >
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/30">
                    <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
                  </div>
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Waiting for payment...</p>
                  <p className="text-white/50 text-sm mt-1">
                    Check your phone for the M-PESA STK Push prompt
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 p-4 text-left space-y-1">
                  <p className="text-white/60 text-sm">
                    1. Check your phone for an M-PESA prompt
                  </p>
                  <p className="text-white/60 text-sm">
                    2. Enter your M-PESA PIN to confirm
                  </p>
                  <p className="text-white/60 text-sm">
                    3. Connect to EMMATECH WiFi and browse!
                  </p>
                </div>
              </motion.div>
            )}

            {/* Paid */}
            {status === "paid" && (
              <motion.div
                key="paid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6 space-y-4"
              >
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mx-auto">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-xl">Payment Successful!</p>
                  <p className="text-white/60 text-sm mt-1">
                    {formatDuration(pkg.duration)} of internet access activated
                  </p>
                  {receipt && (
                    <p className="text-orange-400 text-sm mt-2 font-mono">
                      Receipt: {receipt}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                  <p className="text-green-300 text-sm font-medium">
                    Connect to EMMATECH WiFi to start browsing!
                  </p>
                </div>
                <Button
                  onClick={onClose}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0 cursor-pointer"
                >
                  Done
                </Button>
              </motion.div>
            )}

            {/* Failed */}
            {status === "failed" && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6 space-y-4"
              >
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mx-auto">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-xl">Payment Failed</p>
                  <p className="text-white/60 text-sm mt-1">{errorMsg}</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setStatus("idle")}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-0 cursor-pointer"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    className="flex-1 text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Voucher Section
function VoucherSection() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<{ message: string; packageName?: string; duration?: string } | null>(null);

  const redeemVoucher = useAction(api.portal.redeemVoucher);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast.error("Please enter a voucher code");
      return;
    }
    setStatus("loading");
    setResult(null);
    try {
      const res = await redeemVoucher({ code: code.trim(), phone: phone.trim() || undefined });
      setResult(res);
      setStatus(res.success ? "success" : "error");
      if (res.success) setCode("");
    } catch {
      setStatus("error");
      setResult({ message: "Something went wrong. Try again." });
    }
  };

  return (
    <motion.div
      className="rounded-2xl p-6 border border-white/10"
      style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <Tag className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Redeem Voucher</h3>
          <p className="text-white/50 text-sm">Have a voucher code? Enter it below</p>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Enter voucher code (e.g. EMMA-XXXX)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 font-mono tracking-widest h-12"
        />
        <Input
          type="tel"
          placeholder="Phone number (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12"
        />
        <Button
          onClick={handleRedeem}
          disabled={status === "loading"}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white border-0 font-semibold cursor-pointer"
        >
          {status === "loading" ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redeeming...</>
          ) : (
            "Redeem Voucher"
          )}
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-xl p-4 border ${
                status === "success"
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <div className="flex items-start gap-2">
                {status === "success" ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-medium ${status === "success" ? "text-green-300" : "text-red-300"}`}>
                    {result.message}
                  </p>
                  {result.packageName && (
                    <p className="text-white/50 text-xs mt-1">
                      Package: {result.packageName} • {formatDuration(result.duration ?? "")}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Package Card
function PackageCard({
  pkg,
  index,
  onSelect,
}: {
  pkg: Package;
  index: number;
  onSelect: (pkg: Package) => void;
}) {
  const isPopular = pkg.displayOrder === 1;

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={() => onSelect(pkg)}
    >
      {isPopular && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400" />
      )}
      <div
        className="p-5 h-full border border-white/10 rounded-2xl transition-colors group-hover:border-orange-500/40"
        style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}
      >
        {isPopular && (
          <span className="inline-block bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-3">
            POPULAR
          </span>
        )}
        <h3 className="text-white font-bold text-lg">{pkg.name}</h3>
        {pkg.description && (
          <p className="text-white/50 text-sm mt-1 mb-3">{pkg.description}</p>
        )}

        <div className="text-3xl font-black text-white mt-2">
          <span className="text-orange-400">KES</span> {pkg.price}
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Clock className="w-4 h-4 text-orange-400 shrink-0" />
            <span>{formatDuration(pkg.duration)}</span>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Zap className="w-4 h-4 text-orange-400 shrink-0" />
            <span>{formatSpeed(pkg.downloadSpeed)} Download / {formatSpeed(pkg.uploadSpeed)} Upload</span>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Smartphone className="w-4 h-4 text-orange-400 shrink-0" />
            <span>Up to {pkg.deviceLimit} {pkg.deviceLimit === 1 ? "device" : "devices"}</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="w-full py-2.5 rounded-xl bg-orange-500 group-hover:bg-orange-400 transition-colors flex items-center justify-center gap-2 text-white font-semibold text-sm">
            Buy Now <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Main Portal
export default function Index() {
  const packages = useQuery(api.packages.listActive);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(160deg, #060d1f 0%, #0d1a35 40%, #0a1628 100%)",
      }}
    >
      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-14">
        {/* Hero */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Wifi className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                EMMA<span className="text-orange-400">TECH</span>
              </h1>
              <p className="text-white/40 text-sm font-medium tracking-widest uppercase">
                WiFi Hotspot
              </p>
            </div>
          </div>

          <motion.p
            className="text-white/80 text-lg md:text-xl font-medium mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Fast • Reliable • Affordable Internet
          </motion.p>

          <motion.div
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 text-sm text-white/70"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
          >
            <Phone className="w-4 h-4 text-orange-400" />
            <span>Support: <a href="tel:0768926965" className="text-orange-400 font-semibold hover:underline">0768926965</a></span>
          </motion.div>
        </motion.div>

        {/* Packages */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-white/60 text-sm font-bold tracking-widest uppercase text-center mb-6">
            Choose Your Package
          </h2>

          {packages === undefined ? (
            // Loading skeleton
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl h-56 animate-pulse"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <Wifi className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No packages available at the moment.</p>
              <p className="text-sm mt-1">Please contact support: 0768926965</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...packages]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((pkg, i) => (
                  <PackageCard
                    key={pkg._id}
                    pkg={pkg}
                    index={i}
                    onSelect={setSelectedPkg}
                  />
                ))}
            </div>
          )}
        </motion.div>

        {/* Voucher Section */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-white/60 text-sm font-bold tracking-widest uppercase text-center mb-6">
            Already Have a Voucher?
          </h2>
          <div className="max-w-md mx-auto">
            <VoucherSection />
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="mt-12 text-center text-white/25 text-xs space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <p>© {new Date().getFullYear()} EMMATECH WiFi. All rights reserved.</p>
          <p>Payments secured by Safaricom M-PESA</p>
        </motion.div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedPkg && (
          <PaymentModal pkg={selectedPkg} onClose={() => setSelectedPkg(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
