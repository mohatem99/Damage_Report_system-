"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Plus, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CreateRoleInput, Permission, Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PermissionMatrix } from "./permission-matrix";

const ADMIN_ROLE = "Administrator";

export function RolesPanel() {
  const qc = useQueryClient();
  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: api.listRoles,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["roles"] });
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  const create = useMutation({
    mutationFn: (input: CreateRoleInput) => api.createRole(input),
    onSuccess: () => {
      toast.success("Role created");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPerms, setNewPerms] = useState<Permission[]>([]);

  const submitNew = () => {
    if (!newName.trim()) return toast.error("Enter a role name");
    create.mutate(
      { name: newName.trim(), description: newDesc.trim(), permissions: newPerms },
      {
        onSuccess: () => {
          setNewName("");
          setNewDesc("");
          setNewPerms([]);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={newName}
                placeholder="e.g. Depot Supervisor"
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={newDesc}
                placeholder="What this role is for"
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="rounded-md border p-3">
              <PermissionMatrix value={newPerms} onChange={setNewPerms} />
            </div>
          </div>
          <Button onClick={submitNew} disabled={create.isPending}>
            <Plus /> Create role
          </Button>
        </CardContent>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {roles?.map((role) => (
        <RoleCard key={role.id} role={role} onChanged={invalidate} />
      ))}
    </div>
  );
}

function RoleCard({ role, onChanged }: { role: Role; onChanged: () => void }) {
  const isAdmin = role.name === ADMIN_ROLE;
  const [perms, setPerms] = useState<Permission[]>(role.permissions);
  const [description, setDescription] = useState(role.description);
  const dirty =
    description !== role.description ||
    perms.length !== role.permissions.length ||
    perms.some((p) => !role.permissions.includes(p));

  const update = useMutation({
    mutationFn: () =>
      api.updateRole(role.id, { description, permissions: perms }),
    onSuccess: () => {
      toast.success(`${role.name} updated`);
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteRole(role.id),
    onSuccess: () => {
      toast.success("Role deleted");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            {role.name}
            {role.isSystem && (
              <Badge variant="secondary" className="gap-1 font-normal">
                <Lock className="size-3" /> Built-in
              </Badge>
            )}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {role.description || "No description"}
          </p>
        </div>
        {!role.isSystem && (
          <Button
            variant="ghost"
            size="icon"
            title="Delete role"
            onClick={() => {
              if (confirm(`Delete role "${role.name}"?`)) remove.mutate();
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin ? (
          <p className="text-sm text-muted-foreground">
            The Administrator role always has full access and cannot be changed.
          </p>
        ) : (
          <>
            <div className="rounded-md border p-3">
              <PermissionMatrix value={perms} onChange={setPerms} />
            </div>
            {dirty && (
              <Button onClick={() => update.mutate()} disabled={update.isPending}>
                <Save /> Save changes
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
