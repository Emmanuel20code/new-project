import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated } from "convex/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
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

// ─── Duration helpers ────────────────────────────────────────────────────────

type DurationUnit = "m" | "h" | "d";

function formatDuration(d: string): string {
  const n = parseInt(d);
  if (d.endsWith("m")) return `${n} Min${n !== 1 ? "s" : ""}`;
  if (d.endsWith("h")) return `${n} Hour${n !== 1 ? "s" : ""}`;
  if (d.endsWith("d")) return `${n} Day${n !== 1 ? "s" : ""}`;
  return d;
}

/** Parse a duration string like "24h" into { value: 24, unit: "h" } */
function parseDuration(d: string): { value: number; unit: DurationUnit } {
  const n = parseInt(d);
  if (d.endsWith("m")) return { value: n, unit: "m" };
  if (d.endsWith("h")) return { value: n, unit: "h" };
  if (d.endsWith("d")) return { value: n, unit: "d" };
  return { value: 1, unit: "h" };
}

function buildDurationString(value: number, unit: DurationUnit): string {
  return `${value}${unit}`;
}

function validateDurationMinutes(value: number, unit: DurationUnit): boolean {
  const totalMin =
    unit === "m" ? value : unit === "h" ? value * 60 : value * 60 * 24;
  return totalMin >= 5 && totalMin <= 30 * 24 * 60; // 5 min – 30 days
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const packageSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    price: z.coerce.number().min(1, "Price must be at least 1"),
    durationValue: z.coerce.number().int().min(1, "Duration must be at least 1"),
    durationUnit: z.enum(["m", "h", "d"]),
    downloadSpeed: z.coerce.number().min(0.1, "Download speed required"),
    uploadSpeed: z.coerce.number().min(0.1, "Upload speed required"),
    deviceLimit: z.coerce.number().int().min(1, "Device limit must be at least 1"),
    displayOrder: z.coerce.number().int().min(0),
  })
  .refine(
    (v) => validateDurationMinutes(v.durationValue, v.durationUnit as DurationUnit),
    { message: "Duration must be between 5 minutes and 30 days", path: ["durationValue"] }
  );

type PackageFormValues = z.infer<typeof packageSchema>;

// ─── Form Dialog ─────────────────────────────────────────────────────────────

function PackageFormDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Doc<"packages"> | null;
}) {
  const createPackage = useMutation(api.packages.create);
  const updatePackage = useMutation(api.packages.update);

  const parsed = editing ? parseDuration(editing.duration) : null;

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: editing
      ? {
          name: editing.name,
          description: editing.description ?? "",
          price: editing.price,
          durationValue: parsed?.value ?? 1,
          durationUnit: parsed?.unit ?? "h",
          downloadSpeed: editing.downloadSpeed,
          uploadSpeed: editing.uploadSpeed,
          deviceLimit: editing.deviceLimit,
          displayOrder: editing.displayOrder,
        }
      : {
          name: "",
          description: "",
          price: 0,
          durationValue: 24,
          durationUnit: "h",
          downloadSpeed: 5,
          uploadSpeed: 2,
          deviceLimit: 1,
          displayOrder: 0,
        },
  });

  const onSubmit = async (values: PackageFormValues) => {
    const duration = buildDurationString(values.durationValue, values.durationUnit as DurationUnit);
    const payload = {
      name: values.name,
      description: values.description,
      price: values.price,
      duration,
      downloadSpeed: values.downloadSpeed,
      uploadSpeed: values.uploadSpeed,
      deviceLimit: values.deviceLimit,
      displayOrder: values.displayOrder,
    };
    try {
      if (editing) {
        await updatePackage({ id: editing._id, ...payload });
        toast.success("Package updated");
      } else {
        await createPackage(payload);
        toast.success("Package created");
      }
      onClose();
    } catch {
      toast.error("Failed to save package");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Package" : "New Package"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Basic Plan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration: number + unit */}
              <FormItem>
                <FormLabel>Duration</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="durationValue"
                    render={({ field }) => (
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          className="w-20"
                          {...field}
                        />
                      </FormControl>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="durationUnit"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="m">Minutes</SelectItem>
                          <SelectItem value="h">Hours</SelectItem>
                          <SelectItem value="d">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <FormMessage>{form.formState.errors.durationValue?.message}</FormMessage>
              </FormItem>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="downloadSpeed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Download (Mbps)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="uploadSpeed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload (Mbps)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deviceLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Limit</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editing ? "Save Changes" : "Create Package"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  pkg,
  onClose,
}: {
  pkg: Doc<"packages"> | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!pkg} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Package</DialogTitle>
          <DialogDescription>
            Deleting packages is not yet supported to protect payment history. Deactivate the
            package instead to hide it from customers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackagesTable() {
  const packages = useQuery(api.packages.list);
  const toggleActive = useMutation(api.packages.toggleActive);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"packages"> | null>(null);
  const [deleting, setDeleting] = useState<Doc<"packages"> | null>(null);

  const handleToggle = async (id: Id<"packages">) => {
    try {
      await toggleActive({ id });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (pkg: Doc<"packages">) => {
    setEditing(pkg);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Packages</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage WiFi plans and pricing</p>
        </div>
        <Button onClick={openCreate} className="gap-2 cursor-pointer">
          <Plus size={16} />
          New Package
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price (KES)</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Speed</TableHead>
              <TableHead>Devices</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages === undefined ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : packages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  No packages yet. Create your first package.
                </TableCell>
              </TableRow>
            ) : (
              packages.map((pkg) => (
                <TableRow key={pkg._id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{pkg.name}</p>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {pkg.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {pkg.price.toLocaleString()}
                  </TableCell>
                  <TableCell>{formatDuration(pkg.duration)}</TableCell>
                  <TableCell>
                    <span className="text-xs">
                      ↓{pkg.downloadSpeed}Mbps / ↑{pkg.uploadSpeed}Mbps
                    </span>
                  </TableCell>
                  <TableCell>{pkg.deviceLimit}</TableCell>
                  <TableCell>
                    <Badge variant={pkg.active ? "default" : "secondary"}>
                      {pkg.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer"
                        title={pkg.active ? "Deactivate" : "Activate"}
                        onClick={() => handleToggle(pkg._id)}
                      >
                        <Power size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() => openEdit(pkg)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer text-destructive hover:text-destructive"
                        onClick={() => setDeleting(pkg)}
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

      <PackageFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
      />
      <DeleteDialog pkg={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

export default function PackagesPage() {
  return (
    <Authenticated>
      <PackagesTable />
    </Authenticated>
  );
}
