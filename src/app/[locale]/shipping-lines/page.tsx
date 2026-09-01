"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Agency, ShippingLine, ShippingLineInput } from "@/lib/types";
import { usePermissions } from "@/lib/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Modal, ConfirmDialog } from "@/components/ui/dialog";
import { TablePagination } from "@/components/table-pagination";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const NONE = "__none__";
const isNotFound = (e: Error) => /not found|\(404\)/i.test(e.message);

export default function ShippingLinesPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { data: lines, isLoading } = useQuery({
    queryKey: ["shipping-lines"],
    queryFn: api.listShippingLines,
    refetchOnMount: "always",
  });
  const { data: agencies } = useQuery({
    queryKey: ["agencies"],
    queryFn: api.listAgencies,
  });

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [agencyId, setAgencyId] = useState(NONE);
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [address, setAddress] = useState("");
  const [editing, setEditing] = useState<ShippingLine | null>(null);
  const [deleting, setDeleting] = useState<ShippingLine | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const canEdit = can("shipping-lines:edit");
  const canDelete = can("shipping-lines:delete");
  const showActions = canEdit || canDelete;

  const total = lines?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const pageLines = (lines ?? []).slice(
    (current - 1) * pageSize,
    current * pageSize,
  );
  const agencyName = (id?: string | null) =>
    id ? agencies?.find((a) => a.id === id)?.name ?? "—" : "—";

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["shipping-lines"] });

  const create = useMutation({
    mutationFn: (input: ShippingLineInput) => api.createShippingLine(input),
    onSuccess: () => {
      toast.success("Shipping line added");
      setName("");
      setCode("");
      setAgencyId(NONE);
      setContactEmail("");
      setContactName("");
      setEmailCc("");
      setAddress("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ShippingLineInput> }) =>
      api.updateShippingLine(id, input),
    onSuccess: () => toast.success("Shipping line saved"),
    onError: (e: Error) =>
      isNotFound(e)
        ? toast.info("That line no longer exists — refreshing the list")
        : toast.error(e.message),
    onSettled: () => {
      setEditing(null);
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteShippingLine(id),
    onSuccess: () => toast.success("Shipping line deleted"),
    onError: (e: Error) =>
      isNotFound(e)
        ? toast.info("That line was already deleted — refreshing the list")
        : toast.error(e.message),
    onSettled: () => {
      setDeleting(null);
      invalidate();
    },
  });

  const submit = () => {
    if (!name.trim()) return toast.error("Enter a shipping line name");
    create.mutate({
      name: name.trim(),
      code: code.trim() || null,
      agencyId: agencyId === NONE ? null : agencyId,
      contactEmail: contactEmail.trim() || null,
      contactName: contactName.trim() || null,
      emailCc: emailCc.trim() || null,
      address: address.trim() || null,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shipping Lines</h1>
        <p className="text-sm text-muted-foreground">
          The carriers you handle containers for. Assign each line to its agency,
          and set line-specific repair rates to bill each carrier at their agreed
          price.
        </p>
      </div>

      {can("shipping-lines:create") && (
        <Card>
          <CardHeader>
            <CardTitle>Add a shipping line</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="line-name">Name</Label>
                <Input
                  id="line-name"
                  value={name}
                  placeholder="e.g. Maersk"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="line-code">Code</Label>
                <Input
                  id="line-code"
                  value={code}
                  placeholder="MAEU"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Agency</Label>
                <Select value={agencyId} onValueChange={setAgencyId}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Unassigned —</SelectItem>
                    {agencies?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="line-email">Contact email</Label>
                <Input
                  id="line-email"
                  type="email"
                  value={contactEmail}
                  placeholder="ops@carrier.com"
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="line-contact">Contact name</Label>
                <Input
                  id="line-contact"
                  value={contactName}
                  placeholder="e.g. Ahmed"
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="line-cc">CC (comma-separated)</Label>
                <Input
                  id="line-cc"
                  value={emailCc}
                  placeholder="a@x.com, b@y.com"
                  onChange={(e) => setEmailCc(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="line-address">Address / info</Label>
              <Textarea
                id="line-address"
                value={address}
                rows={2}
                placeholder="Postal address or standing info appended to emails"
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={submit} disabled={create.isPending}>
                <Plus /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-24">Code</TableHead>
                <TableHead>Agency</TableHead>
                {showActions && <TableHead className="w-24 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {lines?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No shipping lines yet.
                  </TableCell>
                </TableRow>
              )}
              {pageLines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{l.code || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{agencyName(l.agencyId)}</TableCell>
                  {showActions && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => setEditing(l)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(l)} title="Delete">
                            <Trash2 className="text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 0 && (
        <TablePagination
          page={current}
          pageSize={pageSize}
          total={total}
          label="line"
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      )}

      {editing && (
        <EditLineModal
          key={editing.id}
          line={editing}
          agencies={agencies}
          pending={update.isPending}
          onClose={() => setEditing(null)}
          onSave={(input) => update.mutate({ id: editing.id, input })}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        pending={remove.isPending}
        title="Delete shipping line?"
        description="Reports keep their record but lose the link to this line, and any repair rates scoped to it are removed. This cannot be undone."
      >
        {deleting && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm font-medium">
            {deleting.name}
            {deleting.code ? ` (${deleting.code})` : ""}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

function EditLineModal({
  line,
  agencies,
  pending,
  onClose,
  onSave,
}: {
  line: ShippingLine;
  agencies?: Agency[];
  pending: boolean;
  onClose: () => void;
  onSave: (input: ShippingLineInput) => void;
}) {
  const [name, setName] = useState(line.name);
  const [code, setCode] = useState(line.code ?? "");
  const [agencyId, setAgencyId] = useState(line.agencyId ?? NONE);
  const [contactEmail, setContactEmail] = useState(line.contactEmail ?? "");
  const [contactName, setContactName] = useState(line.contactName ?? "");
  const [emailCc, setEmailCc] = useState(line.emailCc ?? "");
  const [address, setAddress] = useState(line.address ?? "");

  const save = () => {
    if (!name.trim()) return toast.error("Enter a shipping line name");
    onSave({
      name: name.trim(),
      code: code.trim() || null,
      agencyId: agencyId === NONE ? null : agencyId,
      contactEmail: contactEmail.trim() || null,
      contactName: contactName.trim() || null,
      emailCc: emailCc.trim() || null,
      address: address.trim() || null,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit shipping line"
      className="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || !name.trim()}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-line-name">Name</Label>
          <Input id="edit-line-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-line-code">Code</Label>
          <Input
            id="edit-line-code"
            value={code}
            placeholder="e.g. MAEU"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Agency</Label>
          <Select value={agencyId} onValueChange={setAgencyId}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— Unassigned —</SelectItem>
              {agencies?.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-line-email">Contact email</Label>
            <Input
              id="edit-line-email"
              type="email"
              value={contactEmail}
              placeholder="ops@carrier.com"
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-line-contact">Contact name</Label>
            <Input
              id="edit-line-contact"
              value={contactName}
              placeholder="e.g. Ahmed"
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-line-cc">CC (comma-separated)</Label>
          <Input
            id="edit-line-cc"
            value={emailCc}
            placeholder="a@x.com, b@y.com"
            onChange={(e) => setEmailCc(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-line-address">Address / info</Label>
          <Textarea
            id="edit-line-address"
            value={address}
            rows={2}
            placeholder="Postal address or standing info appended to emails"
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
