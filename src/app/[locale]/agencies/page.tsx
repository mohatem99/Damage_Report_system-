"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Agency } from "@/lib/types";
import { usePermissions } from "@/lib/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const isNotFound = (e: Error) => /not found|\(404\)/i.test(e.message);

export default function AgenciesPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { data: agencies, isLoading } = useQuery({
    queryKey: ["agencies"],
    queryFn: api.listAgencies,
    refetchOnMount: "always",
  });
  const { data: lines } = useQuery({
    queryKey: ["shipping-lines"],
    queryFn: api.listShippingLines,
  });

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState<Agency | null>(null);
  const [deleting, setDeleting] = useState<Agency | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const canEdit = can("shipping-lines:edit");
  const canDelete = can("shipping-lines:delete");
  const showActions = canEdit || canDelete;

  const total = agencies?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const pageAgencies = (agencies ?? []).slice(
    (current - 1) * pageSize,
    current * pageSize,
  );

  // How many lines each agency represents (for the "N lines" column).
  const lineCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines ?? []) {
      if (l.agencyId) m.set(l.agencyId, (m.get(l.agencyId) ?? 0) + 1);
    }
    return m;
  }, [lines]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["agencies"] });

  const create = useMutation({
    mutationFn: () => api.createAgency({ name: name.trim(), code: code.trim() || null }),
    onSuccess: () => {
      toast.success("Agency added");
      setName("");
      setCode("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; code?: string | null } }) =>
      api.updateAgency(id, input),
    onSuccess: () => toast.success("Agency saved"),
    onError: (e: Error) =>
      isNotFound(e)
        ? toast.info("That agency no longer exists — refreshing")
        : toast.error(e.message),
    onSettled: () => {
      setEditing(null);
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteAgency(id),
    onSuccess: () => toast.success("Agency deleted"),
    onError: (e: Error) =>
      isNotFound(e)
        ? toast.info("That agency was already deleted — refreshing")
        : toast.error(e.message),
    onSettled: () => {
      setDeleting(null);
      // Lines lose their agency link (SET NULL), so refresh both.
      qc.invalidateQueries({ queryKey: ["agencies"] });
      qc.invalidateQueries({ queryKey: ["shipping-lines"] });
    },
  });

  const submit = () => {
    if (!name.trim()) return toast.error("Enter an agency name");
    create.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agencies</h1>
        <p className="text-sm text-muted-foreground">
          Liner agents that represent carriers locally. An agency handles several
          shipping lines; set repair rates at the agency level to share one tariff
          across its lines, or per line to override.
        </p>
      </div>

      {can("shipping-lines:create") && (
        <Card>
          <CardHeader>
            <CardTitle>Add an agency</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="agency-name">Name</Label>
              <Input
                id="agency-name"
                value={name}
                placeholder="e.g. Inchcape Shipping Services"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>
            <div className="w-28 space-y-1.5">
              <Label htmlFor="agency-code">Code</Label>
              <Input
                id="agency-code"
                value={code}
                placeholder="ISS"
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>
            <Button onClick={submit} disabled={create.isPending}>
              <Plus /> Add
            </Button>
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
                <TableHead className="w-20 text-right">Lines</TableHead>
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
              {agencies?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No agencies yet.
                  </TableCell>
                </TableRow>
              )}
              {pageAgencies.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{a.code || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {lineCount.get(a.id) ?? 0}
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => setEditing(a)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(a)} title="Delete">
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
          label="agency"
          labelPlural="agencies"
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      )}

      {editing && (
        <EditAgencyModal
          key={editing.id}
          agency={editing}
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
        title="Delete agency?"
        description="Its shipping lines stay but lose the agency link, and any agency-level repair rates are removed. This cannot be undone."
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

function EditAgencyModal({
  agency,
  pending,
  onClose,
  onSave,
}: {
  agency: Agency;
  pending: boolean;
  onClose: () => void;
  onSave: (input: { name: string; code: string | null }) => void;
}) {
  const [name, setName] = useState(agency.name);
  const [code, setCode] = useState(agency.code ?? "");

  const save = () => {
    if (!name.trim()) return toast.error("Enter an agency name");
    onSave({ name: name.trim(), code: code.trim() || null });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit agency"
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
          <Label htmlFor="edit-agency-name">Name</Label>
          <Input id="edit-agency-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-agency-code">Code</Label>
          <Input id="edit-agency-code" value={code} placeholder="Optional" onChange={(e) => setCode(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
