import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { TrendingUp, Activity, CreditCard, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; class: string }> = {
  paid: { label: "Paid", icon: <CheckCircle2 size={14} />, class: "text-green-600" },
  pending: { label: "Pending", icon: <Loader2 size={14} className="animate-spin" />, class: "text-yellow-600" },
  failed: { label: "Failed", icon: <XCircle size={14} />, class: "text-destructive" },
  cancelled: { label: "Cancelled", icon: <XCircle size={14} />, class: "text-muted-foreground" },
};

export default function AdminDashboard() {
  const stats = useQuery(api.admin.getDashboardStats);
  const recentPayments = useQuery(api.payments.list, { limit: 5 });

  const statCards = [
    {
      title: "Today's Revenue",
      value: stats ? formatKES(stats.todayRevenue) : null,
      icon: <TrendingUp size={20} />,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Monthly Revenue",
      value: stats ? formatKES(stats.totalRevenue) : null,
      icon: <CreditCard size={20} />,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Active Sessions",
      value: stats ? String(stats.activeSessions) : null,
      icon: <Activity size={20} />,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Pending Payments",
      value: stats ? String(stats.pendingPayments) : null,
      icon: <Clock size={20} />,
      color: "text-yellow-600",
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Welcome back. Here{"'"}s what{"'"}s happening today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{card.title}</p>
                  {card.value !== null ? (
                    <p className="text-xl font-bold text-foreground mt-1">{card.value}</p>
                  ) : (
                    <Skeleton className="h-7 w-24 mt-1" />
                  )}
                </div>
                <div className={cn("p-2 rounded-lg", card.bg)}>
                  <span className={card.color}>{card.icon}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">No payments yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentPayments.map((payment) => {
                const sc = statusConfig[payment.status] ?? statusConfig["cancelled"];
                return (
                  <div key={payment._id} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{payment.phone}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {payment.mpesaReceipt ?? payment.checkoutRequestId ?? payment._id.slice(-8)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{formatKES(payment.amount)}</p>
                      <div className={cn("flex items-center gap-1 justify-end text-xs mt-0.5", sc.class)}>
                        {sc.icon}
                        <span>{sc.label}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      {timeAgo(payment._creationTime)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
