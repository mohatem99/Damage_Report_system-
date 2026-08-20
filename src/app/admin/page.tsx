"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { KeyRound, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { CreateUserInput, Role, User } from "@/lib/types";
import { cn } from "@/lib/utils";
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
import { RolesPanel } from "./roles-panel";

type Tab = "users" | "roles";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage user accounts, roles, and what each role is allowed to do.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        {(["users", "roles"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "users" ? <UsersPanel /> : <RolesPanel />}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersPanel() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: api.listUsers,
  });
  const { data: roles } = useQuery({ queryKey: ["roles"], queryFn: api.listRoles });

  const [form, setForm] = useState<CreateUserInput>({
    email: "",
    name: "",
    password: "",
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const create = useMutation({
    mutationFn: (input: CreateUserInput) => api.createUser(input),
    onSuccess: () => {
      toast.success("User created");
      setForm({ email: "", name: "", password: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreateUserInput>) =>
      api.updateUser(id, input),
    onSuccess: () => {
      toast.success("User updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      toast.success("User deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPassword = (u: User) => {
    const pw = prompt(`Set a new password for ${u.email} (min 6 chars):`);
    if (pw == null) return;
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    update.mutate({ id: u.id, password: pw });
  };

  const submit = () => {
    if (!form.email.trim() || !form.name.trim()) {
      return toast.error("Name and email are required");
    }
    if (form.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    create.mutate({
      ...form,
      email: form.email.trim(),
      name: form.name.trim(),
    });
  };

  const total = users?.length ?? 0;
  const admins = users?.filter((u) => u.permissions.includes("users:view")).length ?? 0;
  const active = users?.filter((u) => u.isActive).length ?? 0;

  const roleOptions = roles ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={Users} label="Total users" value={total} />
        <StatTile icon={ShieldCheck} label="With admin access" value={admins} />
        <StatTile icon={KeyRound} label="Active accounts" value={active} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a user</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input
              value={form.name}
              placeholder="Jane Doe"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              placeholder="jane@example.com"
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input
              type="password"
              value={form.password}
              placeholder="min. 6 characters"
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={form.roleId ?? ""}
              onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role…" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button onClick={submit} disabled={create.isPending}>
              <Plus /> Create user
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="w-44">Role</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24" />
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
              {users?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No users yet.
                  </TableCell>
                </TableRow>
              )}
              {users?.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">
                        {u.name}
                        {isSelf && (
                          <span className="ml-2 text-[11px] text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.roleId ?? ""}
                        disabled={isSelf}
                        onValueChange={(v) =>
                          update.mutate({ id: u.id, roleId: v })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="No role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((r: Role) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() =>
                          update.mutate({ id: u.id, isActive: !u.isActive })
                        }
                        className="disabled:cursor-not-allowed disabled:opacity-60"
                        title={isSelf ? "You can't change your own status" : "Toggle active"}
                      >
                        <Badge variant={u.isActive ? "default" : "secondary"}>
                          {u.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset password"
                          onClick={() => resetPassword(u)}
                        >
                          <KeyRound className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete user"
                          disabled={isSelf}
                          onClick={() => {
                            if (
                              confirm(
                                `Delete ${u.email}? This cannot be undone.`,
                              )
                            )
                              remove.mutate(u.id);
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
