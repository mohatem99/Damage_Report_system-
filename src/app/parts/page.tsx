"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";
import { formatDual } from "@/lib/money";
import type { CreatePartInput, Part } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const CURRENCIES = ["USD", "EGP", "EUR", "AED", "SAR"];

export default function PartsPage() {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const { data: parts, isLoading } = useQuery({
    queryKey: ["parts"],
    queryFn: api.listParts,
  });

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["parts"] });

  const create = useMutation({
    mutationFn: (input: CreatePartInput) => api.createPart(input),
    onSuccess: () => {
      toast.success("Part added");
      setName("");
      setPrice("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, unitPrice }: { id: string; unitPrice: number }) =>
      api.updatePart(id, { unitPrice }),
    onSuccess: () => {
      toast.success("Part updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deletePart(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!name.trim()) return toast.error("Enter a part name");
    const value = Number(price);
    if (!Number.isFinite(value) || value < 0)
      return toast.error("Enter a valid price");
    create.mutate({
      name: name.trim(),
      unitPrice: Math.round(value * 100) / 100,
      currency,
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parts Catalog</h1>
        <p className="text-sm text-muted-foreground">
          Define spare parts and materials with a unit price. When you record
          damage on a report, attach the parts used and their cost is added to
          the repair estimate.
        </p>
      </div>

      {can("parts:create") && (
      <Card>
        <CardHeader>
          <CardTitle>Add a part</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[1.6fr_1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              placeholder="e.g. Steel side panel"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unit price</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              placeholder="0.00"
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <TableHead>Part</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="w-12" />
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
              {parts?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No parts yet. Add materials above so repairs can be costed.
                  </TableCell>
                </TableRow>
              )}
              {parts?.map((p) => (
                <PartRow
                  key={p.id}
                  part={p}
                  canEdit={can("parts:edit")}
                  canDelete={can("parts:delete")}
                  onSave={(unitPrice) => update.mutate({ id: p.id, unitPrice })}
                  onDelete={() => remove.mutate(p.id)}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PartRow({
  part,
  canEdit,
  canDelete,
  onSave,
  onDelete,
}: {
  part: Part;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (unitPrice: number) => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(String(part.unitPrice));
  const dirty = Number(value) !== Number(part.unitPrice);

  return (
    <TableRow>
      <TableCell className="font-medium">{part.name}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={value}
            disabled={!canEdit}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 w-28"
          />
          {canEdit && dirty && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSave(Math.round(Number(value) * 100) / 100)}
            >
              Save
            </Button>
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatDual(part.currency, Number(value) || 0)}
        </div>
      </TableCell>
      <TableCell>{part.currency}</TableCell>
      <TableCell>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Delete this part?")) onDelete();
            }}
          >
            <Trash2 className="text-destructive" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
