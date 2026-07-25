import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion, AnimatePresence } from "motion/react";
import {
  Wifi,
  Clock,
  Zap,
  Smartphone,
  ArrowRight,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle,
  Phone,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(d: string): string {
  if (d.endsWith("m")) return `${parseInt(d)} Min${parseInt(d) > 1 ? "s" : ""}`;
  if (d.endsWith("h")) return `${parseInt(d)} Hour${parseInt(d) > 1 ? "s" : ""}`;
  if (d.endsWith("d")) return `${parseInt(d)} Day${parseInt(d) > 1 ? "s" : ""}`;
  return d;
}

function formatSpeed(mbps: number): string {
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(0)} Gbps`;
  return `${mbps} Mbps`;
}

function formatExpiry(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

function maskMac(mac: string): string {
  const parts = mac.split(":");
  if (parts.length < 4) return mac;
  return `**:**:${parts.slice(-2).join(":")}`;
}

// ─── Package Card ─────────────────────────────────────────────────────────────

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 } as const}
      whileHover={{ y: -3, transition: { duration: 0.18 } as const }}
      onClick={() => onSelect(pkg)}
    >
      {isPopular && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400" />
      )}
      <div
        className="p-4 h-full border border-white/10 rounded-2xl transition-colors group-hover:border-orange-500/50"
        style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }}
      >
        {isPopular && (
          <span className="inline-block bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full mb-2">
            POPULAR
          </span>
        )}
        <h3 className="text-white font-bold text-base">{pkg.name}</h3>
        {pkg.description && (
          <p className="text-white/50 text-xs mt-0.5 mb-2">{pkg.description}</p>
        )}

        <div className="text-2xl font-black text-white mt-1">
          <span className="text-orange-400 text-lg">KES</span> {pkg.price}
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-white/65 text-xs">
            <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>{formatDuration(pkg.duration)}</span>
          </div>
          <div className="flex items-center gap-2 text-white/65 text-xs">
            <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>{formatSpeed(pkg.downloadSpeed)} / {formatSpeed(pkg.uploadSpeed)}</span>
          </div>
          <div className="flex items-center gap-2 text-white/65 text-xs">
            <Smartphone className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>Up to {pkg.deviceLimit} {pkg.deviceLimit === 1 ? "device" : "devices"}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="w-full py-2 rounded-xl bg-orange-500 group-hover:bg-orange-400 transition-colors flex items-center justify-center gap-1.5 text-white font-semibold text-sm">
            Buy Now <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Connected Screen ─────────────────────────────────────────────────────────

function ConnectedScreen({
  expiryTime,
  packageName,
  dst,
}: {
  expiryTime?: string;
  packageName?: string;
  dst: string;
}) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = dst;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, dst]);

  return (
    <motion.div
      className="text-center py-6 space-y-5"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 } as const}
    >
      {/* Animated checkmark */}
      <div className="relative mx-auto w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" style={{ animationDuration: "2s" }} />
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-green-500/20 border border-green-500/30">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>
      </div>

      <div>
        <p className="text-white font-black text-2xl">You're Connected!</p>
        {packageName && (
          <p className="text-orange-400 font-semibold mt-1">{packageName}</p>
        )}
        {expiryTime && (
          <p className="text-white/50 text-sm mt-1">{formatExpiry(expiryTime)}</p>
        )}
      </div>

      <div
        className="rounded-2xl p-4 border border-green-500/20 text-center"
        style={{ background: "rgba(34,197,94,0.07)" }}
      >
        <p className="text-green-300 text-sm font-medium">Connecting you to the internet...</p>
        <p className="text-white/40 text-xs mt-1">Redirecting in {countdown}s</p>
      </div>

      <Button
        onClick={() => { window.location.href = dst; }}
        className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white border-0 font-semibold cursor-pointer text-base"
      >
        Browse Now <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}

// ─── Payment Flow ─────────────────────────────────────────────────────────────

function PaymentFlow({
  pkg,
  mac,
  ip,
  routerToken,
  dst,
  onBack,
}: {
  pkg: Package;
  mac: string;
  ip: string;
  routerToken: string;
  dst: string;
  onBack: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Poll for active session after payment confirmed (for redirect)
  const [pollSession, setPollSession] = useState(false);
  const [sessionPollStart, setSessionPollStart] = useState<number>(0);

  const initiatePayment = useAction(api.portal.initiatePayment);

  const paymentStatus = useQuery(
    api.portal.checkPaymentStatus,
    checkoutRequestId ? { checkoutRequestId } : "skip",
  );

  const activeSession = useQuery(
    api.activations.getActiveSessionForMac,
    pollSession && mac ? { macAddress: mac } : "skip",
  );

  // React to payment polling updates
  if (checkoutRequestId && paymentStatus && status === "pending") {
    if (paymentStatus.status === "paid") {
      setStatus("paid");
      setReceipt(paymentStatus.receipt ?? null);
      setCheckoutRequestId(null);
      setPollSession(true);
      setSessionPollStart(Date.now());
    } else if (paymentStatus.status === "failed") {
      setStatus("failed");
      setErrorMsg("Payment was cancelled or failed. Please try again.");
      setCheckoutRequestId(null);
    }
  }

  // Stop session polling after 30s
  useEffect(() => {
    if (!pollSession) return;
    const t = setTimeout(() => setPollSession(false), 30000);
    return () => clearTimeout(t);
  }, [pollSession]);

  void sessionPollStart; // used for future reference

  // If session becomes active, redirect
  if (pollSession && activeSession?.active) {
    return (
      <ConnectedScreen
        expiryTime={activeSession.expiryTime}
        packageName={activeSession.packageName}
        dst={dst}
      />
    );
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
        deviceMac: mac || undefined,
        deviceIp: ip || undefined,
        routerToken: routerToken || undefined,
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
    <div>
      {/* Package header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-white/10">
        <button
          onClick={onBack}
          className="text-white/40 hover:text-white/80 transition-colors cursor-pointer text-sm"
        >
          ← Back
        </button>
        <div className="flex-1">
          <p className="text-white font-bold">{pkg.name}</p>
          <p className="text-orange-400 font-semibold text-lg">KES {pkg.price}</p>
        </div>
        <div className="flex gap-3 text-white/50 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatDuration(pkg.duration)}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" /> {formatSpeed(pkg.downloadSpeed)}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Form */}
        {(status === "idle" || status === "initiating") && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="text-white/70 text-sm mb-1.5 block font-medium">
                M-PESA Phone Number
              </label>
              <Input
                type="tel"
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePay()}
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
            className="text-center py-4 space-y-4"
          >
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/20">
                <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Waiting for payment...</p>
              <p className="text-white/50 text-sm mt-1">Check your phone for the M-PESA prompt</p>
            </div>
            <div className="rounded-xl bg-white/5 p-4 text-left space-y-1.5">
              <p className="text-white/60 text-sm">1. Check your phone for an M-PESA prompt</p>
              <p className="text-white/60 text-sm">2. Enter your M-PESA PIN to confirm</p>
              <p className="text-white/60 text-sm">3. Your internet access activates automatically</p>
            </div>
          </motion.div>
        )}

        {/* Paid — waiting for session activation */}
        {status === "paid" && (
          <motion.div
            key="paid"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4 space-y-4"
          >
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mx-auto">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <div>
              <p className="text-white font-bold text-xl">Payment Successful!</p>
              <p className="text-white/60 text-sm mt-1">
                {formatDuration(pkg.duration)} of internet access paid
              </p>
              {receipt && (
                <p className="text-orange-400 text-sm mt-1.5 font-mono">Receipt: {receipt}</p>
              )}
            </div>
            <div
              className="rounded-xl p-4 border border-green-500/20"
              style={{ background: "rgba(34,197,94,0.07)" }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                <p className="text-green-300 text-sm font-medium">Activating your session...</p>
              </div>
              <p className="text-white/40 text-xs">
                Your access is being configured. This may take up to 60 seconds.
              </p>
            </div>
          </motion.div>
        )}

        {/* Failed */}
        {status === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4 space-y-4"
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
                onClick={onBack}
                variant="ghost"
                className="flex-1 text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                Back
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Portal ───────────────────────────────────────────────────────────────

export default function PortalPage() {
  const [searchParams] = useSearchParams();
  const mac = searchParams.get("mac") ?? "";
  const ip = searchParams.get("ip") ?? "";
  const routerToken = searchParams.get("token") ?? "";
  const dst = searchParams.get("dst") ?? "http://google.com";

  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);

  const packages = useQuery(api.packages.listActive);

  // Fetch router info by token (to show location name)
  const router = useQuery(
    api.routers.getByToken,
    routerToken ? { token: routerToken } : "skip",
  );

  // Check if device already has an active session
  const activeSession = useQuery(
    api.activations.getActiveSessionForMac,
    mac ? { macAddress: mac } : "skip",
  );

  // If already connected, show connected screen
  if (mac && activeSession?.active) {
    return (
      <PortalShell mac={mac} router={router ?? null}>
        <ConnectedScreen
          expiryTime={activeSession.expiryTime}
          packageName={activeSession.packageName}
          dst={dst}
        />
      </PortalShell>
    );
  }

  return (
    <PortalShell mac={mac} router={router ?? null}>
      <AnimatePresence mode="wait">
        {selectedPkg ? (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 } as const}
          >
            <PaymentFlow
              pkg={selectedPkg}
              mac={mac}
              ip={ip}
              routerToken={routerToken}
              dst={dst}
              onBack={() => setSelectedPkg(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="packages"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 } as const}
          >
            <PackageList packages={packages} onSelect={setSelectedPkg} />
          </motion.div>
        )}
      </AnimatePresence>
    </PortalShell>
  );
}

// ─── Package List ─────────────────────────────────────────────────────────────

function PackageList({
  packages,
  onSelect,
}: {
  packages: Package[] | undefined;
  onSelect: (pkg: Package) => void;
}) {
  if (packages === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl h-36 animate-pulse"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
        ))}
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-12 text-white/40">
        <Wifi className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No packages available.</p>
        <p className="text-xs mt-1">Contact support: <a href="tel:0768926965" className="text-orange-400">0768926965</a></p>
      </div>
    );
  }

  const sorted = [...packages].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-3">
      <p className="text-white/50 text-xs font-bold tracking-widest uppercase text-center mb-4">
        Select a Package
      </p>
      {sorted.map((pkg, i) => (
        <PackageCard key={pkg._id} pkg={pkg} index={i} onSelect={onSelect} />
      ))}
    </div>
  );
}

// ─── Shell (shared layout wrapper) ───────────────────────────────────────────

type RouterInfo = {
  name: string;
  location?: string;
} | null;

function PortalShell({
  mac,
  router,
  children,
}: {
  mac: string;
  router: RouterInfo;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #060d1f 0%, #0d1a35 50%, #0a1628 100%)" }}
    >
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-sm mx-auto w-full px-4 py-6">
        {/* Header */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 } as const}
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40">
              <Wifi className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">
                EMMA<span className="text-orange-400">TECH</span>
              </h1>
              <p className="text-white/40 text-xs font-medium tracking-widest uppercase">
                WiFi Hotspot
              </p>
            </div>
          </div>

          {/* Location */}
          {router && (
            <motion.div
              className="inline-flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-full px-3 py-1 text-xs text-white/60 mb-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 } as const}
            >
              <MapPin className="w-3 h-3 text-orange-400" />
              <span>{router.location ?? router.name}</span>
            </motion.div>
          )}

          {/* Status badge */}
          <motion.div
            className="inline-flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-3 py-1.5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 } as const}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
            <span className="text-white/70 text-xs">Connected to EMMATECH WiFi</span>
            {mac && (
              <span className="text-white/30 text-xs font-mono">
                Device: {maskMac(mac)}
              </span>
            )}
          </motion.div>
        </motion.div>

        {/* Card */}
        <motion.div
          className="flex-1 rounded-3xl border border-white/10 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 } as const}
        >
          <div className="p-5">
            {children}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="mt-5 text-center space-y-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 } as const}
        >
          <div className="flex items-center justify-center gap-1.5 text-white/30 text-xs">
            <Phone className="w-3 h-3 text-orange-400/60" />
            <span>Support: <a href="tel:0768926965" className="text-orange-400/80 hover:text-orange-400">0768926965</a></span>
          </div>
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} EMMATECH WiFi</p>
        </motion.div>
      </div>
    </div>
  );
}
