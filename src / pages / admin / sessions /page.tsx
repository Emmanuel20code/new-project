import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Activity, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

type SessionWithPackage = Doc<"sessions"> & { packageName: string };

type StatusFilter = "all" | "active" | "expired" | "disconnected";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-200 dark:text-green-400 dark:border-green-800">
        Active
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge variant="secondary" className="text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400">
        Expired
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      Disconnected
    </Badge>
  );
}

const filterTabs: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Disconnected", value: "disconnected" },
];

export default function SessionsPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const sessions = useQuery(api.sessions.list, {
    status: filter === "all" ? undefined : filter,
  });
  const disconnectSession = useMutation(api.sessions.disconnect);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const handleDisconnect = async (session: SessionWithPackage) => {
    setDisconnecting(session._id);
    try {
      await disconnectSession({ id: session._id });
      toast.success("Session disconnected");
    } catch {
      toast.error("Failed to disconnect session");
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Sessions</h1>
          <p className="text-sm text-muted-foreground">Monitor hotspot user sessions</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
              filter === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>User</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Data In</TableHead>
              <TableHead className="text-right">Data Out</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions === undefined ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No sessions found.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session._id}>
                  <TableCell>
                    <div className="font-medium text-sm">{session.hotspotUsername}</div>
                    {session.macAddress && (
                      <div className="text-xs text-muted-foreground font-mono">{session.macAddress}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">
                      {session.packageName}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(session.startTime), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    <span
                      className={cn(
                        session.status === "active" &&
                          new Date(session.expiryTime) > new Date()
                          ? "text-foreground"
                          : "text-muted-foreground line-through"
                      )}
                    >
                      {formatDistanceToNow(new Date(session.expiryTime), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge status={session.status} /></TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {formatBytes(session.bytesIn)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {formatBytes(session.bytesOut)}
                  </TableCell>
                  <TableCell className="text-right">
                    {session.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDisconnect(session)}
                        disabled={disconnecting === session._id}
                      >
                        <WifiOff size={13} />
                        {disconnecting === session._id ? "..." : "Disconnect"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
