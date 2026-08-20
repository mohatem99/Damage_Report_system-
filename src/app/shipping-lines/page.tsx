"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ShippingLinesPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { data: lines, isLoading } = useQuery({
    queryKey: ["shipping-lines"],
    queryFn: api.listShippingLines,
  });

  const [name, setName] = useState("");
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["shipping-lines"] });

  const create = useMutation({
    mutationFn: (n: string) => api.createShippingLine(n),
    onSuccess: () => {
      toast.success("Shipping line added");
      setName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteShippingLine(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!name.trim()) return toast.error("Enter a shipping line name");
    create.mutate(name.trim());
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shipping Lines</h1>
        <p className="text-sm text-muted-foreground">
          The carriers you handle containers for. Pick a line on a report, and
          set line-specific repair tariffs to bill each carrier at their agreed
          rate.
        </p>
      </div>

      {can("shipping-lines:create") && (
        <Card>
          <CardHeader>
            <CardTitle>Add a shipping line</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                placeholder="e.g. Maersk"
                onChange={(e) => setName(e.target.value)}
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
                {can("shipping-lines:delete") && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {lines?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                    No shipping lines yet.
                  </TableCell>
                </TableRow>
              )}
              {lines?.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  {can("shipping-lines:delete") && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (
                            confirm(
                              "Delete this shipping line? Reports keep their record but lose the link, and its tariffs are removed.",
                            )
                          )
                            remove.mutate(l.id);
                        }}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
