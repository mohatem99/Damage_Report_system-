"use client";

import type { Permission, PermissionAction, Resource } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";

const RESOURCES: Resource[] = [
  "reports",
  "shipping-lines",
  "iicl",
  "users",
];
const ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"];

const RESOURCE_LABELS: Record<Resource, string> = {
  reports: "Reports",
  "shipping-lines": "Shipping Lines",
  iicl: "IICL Catalogs",
  users: "Users & Admin",
};

/** A checkbox grid of resource × action permissions. */
export function PermissionMatrix({
  value,
  onChange,
  disabled = false,
}: {
  value: Permission[];
  onChange?: (next: Permission[]) => void;
  disabled?: boolean;
}) {
  const set = new Set(value);

  const toggle = (perm: Permission, checked: boolean) => {
    if (!onChange) return;
    const next = new Set(set);
    if (checked) next.add(perm);
    else next.delete(perm);
    onChange([...next]);
  };

  const toggleRow = (resource: Resource, checked: boolean) => {
    if (!onChange) return;
    const next = new Set(set);
    for (const a of ACTIONS) {
      const p = `${resource}:${a}` as Permission;
      if (checked) next.add(p);
      else next.delete(p);
    }
    onChange([...next]);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Module</th>
            {ACTIONS.map((a) => (
              <th key={a} className="px-3 py-2 text-center font-medium capitalize">
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RESOURCES.map((resource) => {
            const rowPerms = ACTIONS.map(
              (a) => `${resource}:${a}` as Permission,
            );
            const allOn = rowPerms.every((p) => set.has(p));
            const someOn = rowPerms.some((p) => set.has(p));
            return (
              <tr key={resource} className="border-b last:border-0">
                <td className="py-2.5 pr-4">
                  <label className="flex items-center gap-2.5">
                    <Checkbox
                      checked={allOn ? true : someOn ? "indeterminate" : false}
                      disabled={disabled}
                      onCheckedChange={(c) => toggleRow(resource, c === true)}
                    />
                    <span className="font-medium">{RESOURCE_LABELS[resource]}</span>
                  </label>
                </td>
                {ACTIONS.map((a) => {
                  const perm = `${resource}:${a}` as Permission;
                  return (
                    <td key={a} className="px-3 py-2.5 text-center">
                      <Checkbox
                        checked={set.has(perm)}
                        disabled={disabled}
                        onCheckedChange={(c) => toggle(perm, c === true)}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
