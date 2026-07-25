import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { Search, UserX, UserCheck, Pencil } from "lucide-react";
import { format } from "date-fns";

type EditForm = {
  fullName: string;
  email: string;
  notes: string;
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [selectedId, setSelectedId] = useState<Id<"customers"> | null>(null);
  const [editId, setEditId] = useState<Id<"customers"> | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ fullName: "", email: "", notes: "" });
  const [blockReason, setBlockReason] = useState("");

  const customers = useQuery(api.customers.list, { search: debouncedSearch || undefined });
  const detail = useQuery(api.customers.get, selectedId ? { id: selectedId } : "skip");
  const updateMutation = useMutation(api.customers.update);
  const setStatusMutation = useMutation(api.customers.setStatus);

  const openEdit = (id: Id<"customers">, fullName?: string, email?: string, notes?: string) => {
    setEditId(id);
    setEditForm({ fullName: fullName ?? "", email: email ?? "", notes: notes ?? "" });
  };

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await updateMutation({
        id: editId,
        fullName: editForm.fullName || undefined,
        email: editForm.email || undefined,
        notes: editForm.notes || undefined,
      });
      toast.success("Customer updated");
      setEditId(null);
    } catch {
      toast.error("Failed to update customer");
    }
  };

  const handleToggleStatus = async (id: Id<"customers">, current: string) => {
    const newStatus = current === "active" ? "blocked" : "active";
    try {
      await setStatusMutation({ id, status: newStatus });
      toast.success(`Customer ${newStatus === "blocked" ? "blocked" : "unblocked"}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">Manage registered hotspot customers</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by phone or name..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Registered</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers === undefined ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c._id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedId(c._id)}
                  >
                    <td className="px-4 py-3 font-mono font-medium">{c.phone}</td>
                    <td className="px-4 py-3">{c.fullName ?? <span className="text-muted-foreground italic">—</span>}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.status === "active" ? "default" : "destructive"} className={c.status === "active" ? "bg-green-500 hover:bg-green-600" : ""}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {format(new Date(c._creationTime), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 cursor-pointer"
                          title="Edit"
                          onClick={() => openEdit(c._id, c.fullName, c.email, c.notes)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 w-8 p-0 cursor-pointer ${c.status === "active" ? "text-destructive hover:text-destructive" : "text-green-600 hover:text-green-700"}`}
                          title={c.status === "active" ? "Block" : "Unblock"}
                          onClick={() => handleToggleStatus(c._id, c.status)}
                        >
                          {c.status === "active" ? <UserX size={14} /> : <UserCheck size={14} />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Side Panel */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detail === undefined ? (
            <div className="space-y-4 pt-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detail === null ? (
            <p className="text-muted-foreground pt-6">Customer not found.</p>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>{detail.customer.fullName ?? detail.customer.phone}</SheetTitle>
                <p className="text-muted-foreground text-sm">{detail.customer.phone}</p>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Info */}
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={detail.customer.status === "active" ? "default" : "destructive"} className={detail.customer.status === "active" ? "bg-green-500" : ""}>
                      {detail.customer.status}
                    </Badge>
                  </div>
                  {detail.customer.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span>{detail.customer.email}</span>
                    </div>
                  )}
                  {detail.customer.notes && (
                    <div className="pt-1 border-t">
                      <span className="text-muted-foreground block mb-1">Notes</span>
                      <p className="text-xs">{detail.customer.notes}</p>
                    </div>
                  )}
                </div>

                {/* Recent Payments */}
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Recent Payments</h3>
                  {detail.payments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No payments yet</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.payments.map((p) => (
                        <div key={p._id} className="flex justify-between items-center rounded border px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">KES {p.amount}</span>
                            <span className="text-muted-foreground ml-2">{p.mpesaReceipt ?? "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={p.status === "paid" ? "default" : "secondary"}
                              className={p.status === "paid" ? "bg-green-500" : ""}
                            >
                              {p.status}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {p.paidAt ? format(new Date(p.paidAt), "dd MMM") : format(new Date(p._creationTime), "dd MMM")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Sessions */}
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Sessions</h3>
                  {detail.sessions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No sessions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.sessions.map((s) => (
                        <div key={s._id} className="rounded border px-3 py-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-xs">{s.hotspotUsername}</span>
                            <Badge
                              variant={s.status === "active" ? "default" : "secondary"}
                              className={s.status === "active" ? "bg-green-500" : ""}
                            >
                              {s.status}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground text-xs mt-1">
                            {format(new Date(s.startTime), "dd MMM HH:mm")} → {format(new Date(s.expiryTime), "dd MMM HH:mm")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="example@gmail.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Internal notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditId(null)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleEdit} className="cursor-pointer">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Reason Dialog - unused state kept for future */}
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader><DialogTitle>Block Reason</DialogTitle></DialogHeader>
          <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason..." />
          <DialogFooter><Button className="cursor-pointer">Block</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
