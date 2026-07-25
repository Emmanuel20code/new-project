import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import {
  Ticket,
  Plus,
  Copy,
  Download,
  Ban,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";

type VoucherWithPackage = Doc<"vouchers"> & { packageName: string };

const STATUS_OPTIONS = ["all", "unused", "used", "expired"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

function statusBadge(status: string) {
  if (status === "unused")
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Unused</Badge>;
  if (status === "used")
    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Used</Badge>;
  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expired</Badge>;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function downloadCsv(codes: string[], batchId: string) {
  const csv = ["code", ...codes].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${batchId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function VouchersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ batchId: string; codes: string[] } | null>(null);
  const [generatedOpen, setGeneratedOpen] = useState(false);

  const vouchers = useQuery(
    api.vouchers.list,
    statusFilter === "all" ? {} : { status: statusFilter }
  );
  const packages = useQuery(api.packages.list);
  const generateVouchers = useMutation(api.vouchers.generate);
  const voidVoucher = useMutation(api.vouchers.voidVoucher);

  // Stats
  const allVouchers = useQuery(api.vouchers.list, {});
  const unusedCount = allVouchers?.filter((v) => v.status === "unused").length ?? 0;
  const usedCount = allVouchers?.filter((v) => v.status === "used").length ?? 0;
  const expiredCount = allVouchers?.filter((v) => v.status === "expired").length ?? 0;

  // Generate form state
  const [pkgId, setPkgId] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [prefix, setPrefix] = useState("EM");
  const [expiresAt, setExpiresAt] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!pkgId) { toast.error("Select a package"); return; }
    if (quantity < 1 || quantity > 500) { toast.error("Quantity must be 1–500"); return; }
    setGenerating(true);
    try {
      const result = await generateVouchers({
        packageId: pkgId as Id<"packages">,
        quantity,
        prefix: prefix || undefined,
        expiresAt: expiresAt || undefined,
      });
      setGeneratedResult(result);
      setGenerateOpen(false);
      setGeneratedOpen(true);
      toast.success(`Generated ${result.codes.length} vouchers`);
    } catch {
      toast.error("Failed to generate vouchers");
    } finally {
      setGenerating(false);
    }
  };

  const handleVoid = async (id: Id<"vouchers">, code: string) => {
    try {
      await voidVoucher({ id });
      toast.success(`Voucher ${code} voided`);
    } catch {
      toast.error("Failed to void voucher");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Ticket size={20} className="text-primary" />
            Vouchers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage prepaid WiFi voucher codes</p>
        </div>
        <Button size="sm" className="gap-1.5 cursor-pointer" onClick={() => setGenerateOpen(true)}>
          <Plus size={15} />
          Generate
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Unused", value: unusedCount, icon: <Ticket size={16} />, color: "text-emerald-400" },
          { label: "Used", value: usedCount, icon: <CheckCircle size={16} />, color: "text-blue-400" },
          { label: "Expired", value: expiredCount, icon: <Clock size={16} />, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-card border rounded-lg p-3 space-y-1">
            <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${s.color}`}>
              {s.icon}
              {s.label}
            </div>
            {allVouchers === undefined ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "secondary"}
            className="capitalize cursor-pointer"
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Package</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Batch</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Created</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Used At</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {vouchers === undefined ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No vouchers found
                  </td>
                </tr>
              ) : (
                vouchers.map((v: VoucherWithPackage) => (
                  <tr key={v._id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{v.code}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{v.packageName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell truncate max-w-[140px]">{v.batchId}</td>
                    <td className="px-4 py-3">{statusBadge(v.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {formatDate(new Date(v._creationTime).toISOString())}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{formatDate(v.expiresAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden xl:table-cell">{formatDate(v.usedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {v.status === "unused" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive cursor-pointer h-7 px-2 text-xs"
                          onClick={() => handleVoid(v._id, v.code)}
                        >
                          <Ban size={13} className="mr-1" />
                          Void
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket size={18} />
              Generate Vouchers
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Package</Label>
              <Select value={pkgId} onValueChange={setPkgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {packages?.filter((p) => p.active).map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} — KES {p.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity (1–500)</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prefix</Label>
                <Input
                  placeholder="EM"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date (optional)</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setGenerateOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating} className="cursor-pointer gap-1.5">
              {generating && <Loader2 size={14} className="animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Codes Dialog */}
      <Dialog open={generatedOpen} onOpenChange={setGeneratedOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-400" />
              Vouchers Generated
            </DialogTitle>
          </DialogHeader>
          {generatedResult && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Batch: <span className="font-mono text-xs font-semibold text-foreground">{generatedResult.batchId}</span>
                {" · "}{generatedResult.codes.length} codes
              </p>
              <div className="max-h-64 overflow-y-auto bg-muted/40 rounded-md p-3 font-mono text-xs space-y-1">
                {generatedResult.codes.map((c) => (
                  <div key={c} className="text-foreground">{c}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5 cursor-pointer"
                  onClick={() => {
                    void navigator.clipboard.writeText(generatedResult.codes.join("\n"));
                    toast.success("Codes copied!");
                  }}
                >
                  <Copy size={13} />
                  Copy All
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5 cursor-pointer"
                  onClick={() => downloadCsv(generatedResult.codes, generatedResult.batchId)}
                >
                  <Download size={13} />
                  Download CSV
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setGeneratedOpen(false)} className="cursor-pointer">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
