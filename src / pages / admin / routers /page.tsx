import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Plus,
  Pencil,
  Trash2,
  Router,
  Copy,
  Check,
  Terminal,
  Wifi,
  Clock,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton.tsx";

type RouterDoc = Doc<"routers">;

function StatusBadge({ status }: { status: string }) {
  if (status === "online") {
    return (
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <Badge
          variant="secondary"
          className="text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 dark:text-green-400"
        >
          Online
        </Badge>
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
        </span>
        <Badge
          variant="secondary"
          className="text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-400"
        >
          Waiting…
        </Badge>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-flex rounded-full h-2 w-2 bg-muted-foreground/40" />
      <Badge variant="secondary" className="text-muted-foreground">
        Offline
      </Badge>
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-white/10 transition-colors"
      title="Copy"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

/** Build the MikroTik script the admin pastes into the terminal */
function buildMikrotikScript(token: string, serverUrl: string, appUrl: string): string {
  const checkinUrl = `${serverUrl}/router/checkin`;
  const portalUrl = `${appUrl}/portal`;
  return (
    `# Step 1: Set captive portal URL\n` +
    `/ip hotspot profile set [find] login-page="${portalUrl}"\n\n` +
    `# Step 2: Set up heartbeat (runs every 60 seconds)\n` +
    `/system scheduler add name="emmatech-hb" interval=1m on-event={\n` +
    `:local token "${token}"\n` +
    `:local cpu [/system resource get cpu-load]\n` +
    `:local mem [/system resource get free-memory]\n` +
    `:local uptime [/system resource get uptime]\n` +
    `:local users [/ip hotspot active print count-only]\n` +
    `/tool fetch url="${checkinUrl}" http-method=post http-content-type="application/json" ` +
    `http-data=("{\\\"token\\\":\\\"" . $token . "\\\",\\\"cpu\\\":" . $cpu . ",\\\"mem\\\":" . $mem . ",\\\"uptime\\\":\\\"" . $uptime . "\\\",\\\"users\\\":" . $users . "}") keep-result=no\n` +
    `}`
  );
}

export default function RoutersPage() {
  const routers = useQuery(api.routers.list);
  const generateToken = useMutation(api.routers.generateToken);
  const updateRouter = useMutation(api.routers.update);
  const removeRouter = useMutation(api.routers.remove);

  // Step 1: "Add Router" dialog — just name + location
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addLocation, setAddLocation] = useState("");
  const [adding, setAdding] = useState(false);

  // Step 2: Token / script dialog
  const [tokenDialog, setTokenDialog] = useState<{
    open: boolean;
    token: string;
    name: string;
  }>({ open: false, token: "", name: "" });

  // Edit dialog
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    router: RouterDoc | null;
  }>({ open: false, router: null });
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editHotspot, setEditHotspot] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<Id<"routers"> | null>(null);

  // Derive the Convex HTTP site URL from the API URL
  // api.js origin looks like https://xxx.convex.cloud → site is https://xxx.convex.site
  const convexSiteUrl = (() => {
    try {
      const raw = import.meta.env.VITE_CONVEX_URL as string;
      return raw.replace("convex.cloud", "convex.site");
    } catch {
      return "https://YOUR-DEPLOYMENT.convex.site";
    }
  })();

  const handleAdd = async () => {
    if (!addName.trim()) {
      toast.error("Router name is required");
      return;
    }
    setAdding(true);
    try {
      const { token } = await generateToken({
        name: addName.trim(),
        location: addLocation.trim() || undefined,
      });
      setAddOpen(false);
      setAddName("");
      setAddLocation("");
      setTokenDialog({ open: true, token, name: addName.trim() });
    } catch {
      toast.error("Failed to generate token");
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (router: RouterDoc) => {
    setEditName(router.name);
    setEditLocation(router.location ?? "");
    setEditHotspot(router.hotspotName);
    setEditDialog({ open: true, router });
  };

  const handleEdit = async () => {
    if (!editDialog.router) return;
    setEditSaving(true);
    try {
      await updateRouter({
        id: editDialog.router._id,
        name: editName,
        location: editLocation || undefined,
        hotspotName: editHotspot || "hotspot",
      });
      toast.success("Router updated");
      setEditDialog({ open: false, router: null });
    } catch {
      toast.error("Failed to update router");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await removeRouter({ id: deleteId });
      toast.success("Router removed");
    } catch {
      toast.error("Failed to remove router");
    } finally {
      setDeleteId(null);
    }
  };

  const appUrl = import.meta.env.VITE_APP_URL as string | undefined ?? window.location.origin;
  const script = buildMikrotikScript(tokenDialog.token, convexSiteUrl, appUrl);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Router size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Routers</h1>
            <p className="text-sm text-muted-foreground">
              MikroTik routers — auto-onboard with one terminal command
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
          <Plus size={16} />
          Add Router
        </Button>
      </div>

      {/* How it works banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex gap-3 items-start">
        <Terminal size={18} className="text-primary mt-0.5 shrink-0" />
        <div className="text-sm space-y-0.5">
          <p className="font-semibold text-foreground">Zero-touch onboarding</p>
          <p className="text-muted-foreground">
            Click <strong>Add Router</strong>, give it a name, then paste the generated
            one-line script into your MikroTik terminal. The router registers itself
            automatically and sends heartbeats every minute.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Users</TableHead>
              <TableHead>Uptime</TableHead>
              <TableHead>CPU</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routers === undefined ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_c, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : routers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-12 text-muted-foreground"
                >
                  No routers yet. Click &quot;Add Router&quot; to get started.
                </TableCell>
              </TableRow>
            ) : (
              routers.map((router) => (
                <TableRow key={router._id}>
                  <TableCell className="font-medium">{router.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {router.location ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {router.ipAddress ?? (
                      <span className="text-muted-foreground italic">pending</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={router.status} />
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {router.status === "pending" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      router.activeUsers
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {router.uptime ? (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {router.uptime}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {router.cpuLoad !== undefined ? (
                      <span className="flex items-center gap-1">
                        <Cpu size={12} />
                        {router.cpuLoad}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {router.lastHeartbeat
                      ? formatDistanceToNow(new Date(router.lastHeartbeat), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {router.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1 text-primary"
                          onClick={() =>
                            setTokenDialog({
                              open: true,
                              token: router.token,
                              name: router.name,
                            })
                          }
                        >
                          <Wifi size={13} />
                          View Script
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(router)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(router._id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Step 1: Name + Location dialog ───────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Router</DialogTitle>
            <DialogDescription>
              Give the router a name. We'll generate a unique token and a
              ready-to-paste MikroTik script.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Router Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Stage 1 Router"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location (optional)</Label>
              <Input
                placeholder="Building A, 2nd Floor"
                value={addLocation}
                onChange={(e) => setAddLocation(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? "Generating…" : "Generate Token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Step 2: Token + MikroTik script dialog ───────────────────────────── */}
      <Dialog
        open={tokenDialog.open}
        onOpenChange={(o) => setTokenDialog((s) => ({ ...s, open: o }))}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal size={18} className="text-primary" />
              Connect &quot;{tokenDialog.name}&quot; to EMMATECH
            </DialogTitle>
            <DialogDescription>
              Open a terminal (New Terminal) on your MikroTik router and paste
              the script below. The router will register itself automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Token badge */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2.5">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Your token</p>
                <p className="font-mono font-bold text-lg tracking-widest text-primary">
                  {tokenDialog.token}
                </p>
              </div>
              <CopyButton text={tokenDialog.token} />
            </div>

            {/* Script box */}
            <div className="rounded-lg border bg-zinc-950 text-zinc-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Terminal size={12} />
                  MikroTik Terminal — paste this entire block
                </div>
                <CopyButton text={script} />
              </div>
              <pre className="p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                {script}
              </pre>
            </div>

            {/* Steps */}
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>
                In Winbox or SSH: open{" "}
                <strong className="text-foreground">New Terminal</strong>
              </li>
              <li>Paste the script above and press Enter</li>
              <li>
                The router will appear as{" "}
                <strong className="text-foreground">Online</strong> within 60
                seconds
              </li>
            </ol>

            <p className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
              Keep this token private. Anyone with it can register a router to
              your account. You can always revoke by deleting the router.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setTokenDialog((s) => ({ ...s, open: false }))}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ──────────────────────────────────────────────────────── */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(o) => setEditDialog((s) => ({ ...s, open: o }))}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Router</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="Building A"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hotspot Name</Label>
              <Input
                value={editHotspot}
                onChange={(e) => setEditHotspot(e.target.value)}
                placeholder="hotspot"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditDialog({ open: false, router: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={editSaving}>
              {editSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Router</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? The router will stop sending heartbeats but the
              MikroTik script will remain on the device. You can always re-add it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
