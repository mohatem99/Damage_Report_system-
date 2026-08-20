"use client";

import { useSession } from "next-auth/react";
import type { Permission } from "./types";

/**
 * Client-side permission checks derived from the NextAuth session.
 * The backend is always the source of truth — this only shapes the UI.
 */
export function usePermissions() {
  const { data: session, status } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const set = new Set(permissions);

  const can = (perm: Permission) => set.has(perm);
  const canAny = (...perms: Permission[]) => perms.some((p) => set.has(p));

  return {
    ready: status !== "loading",
    permissions,
    can,
    canAny,
    roleName: session?.user?.roleName ?? null,
    /** Can reach the admin area (manage users/roles). */
    isAdmin: set.has("users:view"),
  };
}
