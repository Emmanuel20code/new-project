import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated } from "convex/react";
import { toast } from "sonner";
import { Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

type StatusFilter = "all" | "pending" | "paid" | "failed";

function statusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>;
    case "failed":
      return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400">Failed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDuration(duration: string): string {
  const map: Record<string, string> = {
    "1h": "1 Hour",
    "3h": "3 Hours",
    "24h": "24 Hours",
    "3d": "3 Days",
    "7d": "1 Week",
    "30d": "1 Month",
  };
  return map[duration] ?? duration;
}

const PAGE_SIZE = 20;

function PaymentsTable() {
  const payments = useQuery(api.payments.list, { limit: 200 });
  const packages = useQuery(api.packages.list);
  const retryActivation = useMutation(api.payments.retryActivation);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [retrying, setRetrying] = useState<string | null>(null);

  const packageMap = useMemo(() => {
    if (!packages) return {} as Record<string, Doc<"packages">>;
    return Object.fromEntries(packages.map((p) => [p._id, p])) as Record<string, Doc<"packages">>;
  }, [packages]);

  const filtered = useMemo(() => {
    if (!payments) return [];
    return payments.filter((p) => {
      const matchSearch =
        !search ||
        p.phone.toLowerCase().includes(search.toLowerCase()) ||
        (p.mpesaReceipt ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, search, statusFilter]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const handleRetry = async (id: Doc<"payments">["_id"]) => {
    setRetrying(id);
    try {
      await retryActivation({ id });
      toast.success("Activation retry queued");
    } catch {
      toast.error("Failed to retry activation");
    } finally {
      setRetrying(null);
    }
  };

  const stats = useMemo(() => {
    if (!payments) return null;
    return {
      pending: payments.filter((p) => p.status === "pending").length,
      paid: payments.filter((p) => p.status === "paid").length,
      failed: payments.filter((p) => p.status === "failed").length,
    };
  }, [payments]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">Track M-PESA transactions</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by phone or receipt..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Amount (KES)</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>M-PESA Receipt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments === undefined ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  {filtered.length === 0 && payments.length > 0
                    ? "No payments match your filters."
                    : "No payments found."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((payment) => {
                const pkg = packageMap[payment.packageId];
                const hasActivationError =
                  payment.status === "paid" && !!payment.activationError;
                return (
                  <TableRow key={payment._id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(payment._creationTime), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">{payment.phone}</TableCell>
                    <TableCell>{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {pkg ? (
                        <div>
                          <p className="text-sm font-medium">{pkg.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(pkg.duration)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {payment.mpesaReceipt ? (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {payment.mpesaReceipt}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {statusBadge(payment.status)}
                        {hasActivationError && (
                          <p className="text-xs text-destructive max-w-[160px] truncate" title={payment.activationError}>
                            {payment.activationError}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {hasActivationError && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="cursor-pointer gap-1"
                                disabled={retrying === payment._id}
                                onClick={() => handleRetry(payment._id)}
                              >
                                <RefreshCw
                                  size={14}
                                  className={retrying === payment._id ? "animate-spin" : ""}
                                />
                                <span className="hidden sm:inline">Retry</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Retry Activation</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setPage((p) => p + 1)} className="cursor-pointer">
            Load More ({filtered.length - paginated.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Authenticated>
      <PaymentsTable />
    </Authenticated>
  );
}
