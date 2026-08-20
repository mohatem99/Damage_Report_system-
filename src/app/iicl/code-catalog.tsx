"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { api, type CodeKind } from "@/lib/api";
import type { CodeItem } from "@/lib/types";
import { usePermissions } from "@/lib/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CodeCatalog({
  kind,
  label,
  withGroup,
}: {
  kind: CodeKind;
  label: string;
  withGroup: boolean;
}) {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { data: codes, isLoading } = useQuery({
    queryKey: ["codes", kind],
    queryFn: () => api.listCodes(kind),
  });

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [group, setGroup] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["codes", kind] });
    qc.invalidateQueries({ queryKey: ["refs"] });
  };

  const create = useMutation({
    mutationFn: () =>
      api.createCode(kind, {
        code,
        description,
        group: withGroup ? group || undefined : undefined,
      }),
    onSuccess: () => {
      toast.success(`${label.replace(/s$/, "")} added`);
      setCode("");
      setDescription("");
      setGroup("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CodeItem> }) =>
      api.updateCode(kind, id, input),
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteCode(kind, id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!code.trim()) return toast.error("Enter a code");
    if (!description.trim()) return toast.error("Enter a description");
    create.mutate();
  };

  return (
    <div className="space-y-4">
      {can("iicl:create") && (
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input
              value={code}
              placeholder="e.g. SPN"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={description}
              placeholder="e.g. Side panel"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {withGroup ? (
            <div className="space-y-1.5">
              <Label>Group (optional)</Label>
              <Input
                value={group}
                placeholder="e.g. Panels"
                onChange={(e) => setGroup(e.target.value)}
              />
            </div>
          ) : (
            <div />
          )}
          <div className="sm:col-span-full sm:flex sm:justify-end">
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
                <TableHead className="w-28">Code</TableHead>
                <TableHead>Description</TableHead>
                {withGroup && <TableHead className="w-40">Group</TableHead>}
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={withGroup ? 4 : 3} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {codes?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={withGroup ? 4 : 3} className="py-8 text-center text-muted-foreground">
                    No codes yet.
                  </TableCell>
                </TableRow>
              )}
              {codes?.map((c) => (
                <CodeRow
                  key={c.id}
                  item={c}
                  withGroup={withGroup}
                  canEdit={can("iicl:edit")}
                  canDelete={can("iicl:delete")}
                  onSave={(input) => update.mutate({ id: c.id, input })}
                  onDelete={() => remove.mutate(c.id)}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CodeRow({
  item,
  withGroup,
  canEdit,
  canDelete,
  onSave,
  onDelete,
}: {
  item: CodeItem;
  withGroup: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (input: Partial<CodeItem>) => void;
  onDelete: () => void;
}) {
  const [description, setDescription] = useState(item.description);
  const [group, setGroup] = useState(item.group ?? "");
  const dirty =
    description !== item.description || (withGroup && group !== (item.group ?? ""));

  return (
    <TableRow>
      <TableCell className="font-mono font-semibold">{item.code}</TableCell>
      <TableCell>
        <Input
          value={description}
          disabled={!canEdit}
          onChange={(e) => setDescription(e.target.value)}
          className="h-8"
        />
      </TableCell>
      {withGroup && (
        <TableCell>
          <Input
            value={group}
            disabled={!canEdit}
            onChange={(e) => setGroup(e.target.value)}
            className="h-8"
          />
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center gap-1">
          {canEdit && dirty && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                onSave({ description, group: withGroup ? group : undefined })
              }
            >
              Save
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm(`Delete code ${item.code}?`)) onDelete();
              }}
            >
              <Trash2 className="text-destructive" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
