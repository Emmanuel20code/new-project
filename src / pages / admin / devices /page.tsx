import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { toast } from "sonner";
import {
  ShieldOff,
  ShieldCheck,
  Smartphone,
  Tv,
  Laptop,
  Monitor,
  HardDrive,
  Link,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils.ts";

// ─── Device type helpers ────────────────────────────────────────────────────

type DeviceType = "mobile" | "tv" | "laptop" | "desktop" | "other";

const DEVICE_TYPES: { value: DeviceType; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { value: "mobile", label: "Phone", Icon: Smartphone },
  { value: "tv", label: "Smart TV", Icon: Tv },
  { value: "laptop", label: "Laptop", Icon: Laptop },
  { value: "desktop", label: "Desktop", Icon: Monitor },
  { value: "other", label: "Other", Icon: HardDrive },
];

function DeviceTypeIcon({ type, size = 16 }: { type?: string; size?: number }) {
  const found = DEVICE_TYPES.find((d) => d.value === type);
  if (!found) return <HardDrive size={size} className="text-muted-foreground" />;
  return <found.Icon size={size} className="text-muted-foreground" />;
}

// ─── Bind Device Dialog ──────────────────────────────────────────────────────

function BindDeviceDialog({
  macAddress,
  routerId,
  open,
  onClose,
}: {
  macAddress: string;
  routerId?: Id<"routers">;
  open: boolean;
  onClose: () => void;
}) {
  const bindDevice = useMutation(api.activations.bindDevice);
  const [deviceType, setDeviceType] = useState<DeviceType>("mobile");
  const [phone, setPhone] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!phone.trim()) {
      toast.error("Customer phone is required");
      return;
    }
    setSaving(true);
    try {
      await bindDevice({
        macAddress,
        phone: phone.trim(),
        deviceName: deviceName.trim() || undefined,
        deviceType,
        routerId,
      });
      toast.success("Device bound successfully");
      onClose();
    } catch {
      toast.error("Failed to bind device");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Bind Device</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>MAC Address</Label>
            <p className="font-mono text-sm text-muted-foreground">{macAddress}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Device Type</Label>
            <div className="flex gap-2 flex-wrap">
              {DEVICE_TYPES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDeviceType(value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs cursor-pointer transition-colors w-[60px]",
                    deviceType === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Icon size={20} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Customer Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Device Name (optional)</Label>
            <Input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. John's iPhone"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="cursor-pointer">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
            {saving ? "Binding…" : "Bind Device"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Discovered Devices Tab ──────────────────────────────────────────────────

function DiscoveredDevicesTab() {
  const discovered = useQuery(api.activations.listDiscovered, {});
  const [bindTarget, setBindTarget] = useState<{ macAddress: string; routerId?: Id<"routers"> } | null>(null);

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">MAC Address</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">IP</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Hostname</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Router</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Last Seen</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bound</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {discovered === undefined ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : discovered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No discovered devices yet
                  </td>
                </tr>
              ) : (
                discovered.map((d) => (
                  <tr key={d._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{d.macAddress}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                      {d.ipAddress ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {d.hostname ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {d.routerId}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                      {(() => {
                        try {
                          return formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true });
                        } catch {
                          return "—";
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {d.bound ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!d.bound && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 cursor-pointer gap-1.5"
                          onClick={() => setBindTarget({ macAddress: d.macAddress, routerId: d.routerId })}
                        >
                          <Link size={14} />
                          <span className="hidden sm:inline">Bind</span>
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

      {bindTarget && (
        <BindDeviceDialog
          macAddress={bindTarget.macAddress}
          routerId={bindTarget.routerId}
          open
          onClose={() => setBindTarget(null)}
        />
      )}
    </>
  );
}

// ─── Bound Devices Tab ───────────────────────────────────────────────────────

function BoundDevicesTab() {
  const devices = useQuery(api.devices.list);
  const setBlocked = useMutation(api.devices.setBlocked);

  const [blockTarget, setBlockTarget] = useState<Id<"devices"> | null>(null);
  const [blockReason, setBlockReason] = useState("");

  const handleUnblock = async (id: Id<"devices">) => {
    try {
      await setBlocked({ id, blocked: false });
      toast.success("Device unblocked");
    } catch {
      toast.error("Failed to unblock device");
    }
  };

  const handleBlock = async () => {
    if (!blockTarget) return;
    try {
      await setBlocked({ id: blockTarget, blocked: true, reason: blockReason || undefined });
      toast.success("Device blocked");
      setBlockTarget(null);
      setBlockReason("");
    } catch {
      toast.error("Failed to block device");
    }
  };

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">MAC Address</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Device Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Last Seen</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {devices === undefined ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No devices found
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr key={d._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <DeviceTypeIcon type={d.deviceType} size={16} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{d.macAddress}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {d.customerPhone ?? <span className="italic">Unknown</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {d.deviceName ?? <span className="text-muted-foreground italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {d.blocked ? (
                        <Badge variant="destructive" title={d.blockReason}>Blocked</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                      {(() => {
                        try {
                          return formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true });
                        } catch {
                          return format(new Date(d._creationTime), "dd MMM HH:mm");
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.blocked ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-green-600 hover:text-green-700 cursor-pointer gap-1.5"
                          onClick={() => handleUnblock(d._id)}
                        >
                          <ShieldCheck size={14} />
                          <span className="hidden sm:inline">Unblock</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-destructive hover:text-destructive cursor-pointer gap-1.5"
                          onClick={() => { setBlockTarget(d._id); setBlockReason(""); }}
                        >
                          <ShieldOff size={14} />
                          <span className="hidden sm:inline">Block</span>
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

      {/* Block Dialog */}
      <Dialog open={!!blockTarget} onOpenChange={(open) => !open && setBlockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Device</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">Optionally provide a reason for blocking this device.</p>
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Suspicious activity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBlockTarget(null)} className="cursor-pointer">Cancel</Button>
            <Button variant="destructive" onClick={handleBlock} className="cursor-pointer">Block Device</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DevicesPage() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
        <p className="text-muted-foreground text-sm">Manage connected hotspot devices</p>
      </div>

      <Tabs defaultValue="bound">
        <TabsList>
          <TabsTrigger value="bound" className="cursor-pointer">Bound Devices</TabsTrigger>
          <TabsTrigger value="discovered" className="cursor-pointer">Discovered Devices</TabsTrigger>
        </TabsList>
        <TabsContent value="bound" className="mt-4">
          <BoundDevicesTab />
        </TabsContent>
        <TabsContent value="discovered" className="mt-4">
          <DiscoveredDevicesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
