"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { usePermissions } from "@/lib/use-permissions";
import type { Permission } from "@/lib/types";
import {
  ClipboardList,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Ship,
  ShieldCheck,
  Tags,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Permission required to see this item. */
  perm: Permission;
  /** Extra path prefixes that should also mark this item active. */
  match?: (path: string) => boolean;
};

const NAV: NavItem[] = [
  {
    href: "/reports",
    label: "Reports",
    icon: ClipboardList,
    perm: "reports:view",
    // Active on /reports and /reports/<id>, but not the dedicated "new" route.
    match: (p) => p === "/reports" || (p.startsWith("/reports/") && p !== "/reports/new"),
  },
  { href: "/iicl", label: "IICL Catalogs", icon: Tags, perm: "iicl:view" },
  { href: "/tariffs", label: "Tariffs", icon: Receipt, perm: "tariffs:view" },
  { href: "/parts", label: "Parts", icon: Wrench, perm: "parts:view" },
  { href: "/shipping-lines", label: "Shipping Lines", icon: Ship, perm: "shipping-lines:view" },
];

function isActive(item: NavItem, path: string) {
  if (item.match) return item.match(path);
  return path === item.href || path.startsWith(item.href + "/");
}

function Brand() {
  return (
    <Link href="/reports" className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-[11px] font-bold tracking-tight text-primary-foreground">
        E2O
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">Egypt to Outside</span>
        <span className="text-xs text-muted-foreground">Damage Reports</span>
      </span>
    </Link>
  );
}

function UserFooter() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="mt-auto border-t p-3">
      {user && (
        <div className="mb-2 flex items-center gap-3 rounded-md px-2 py-1.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold uppercase text-secondary-foreground">
            {(user.name || user.email || "?").slice(0, 2)}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user.roleName ?? "No role"}
            </p>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="size-4 shrink-0" />
        Sign out
      </button>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can, isAdmin } = usePermissions();
  const newActive = pathname === "/reports/new";
  const visibleNav = NAV.filter((item) => can(item.perm));

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {can("reports:create") && (
        <Link
          href="/reports/new"
          onClick={onNavigate}
          className={cn(
            "mb-2 flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90",
            newActive && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          )}
        >
          <Plus className="size-4" />
          New Report
        </Link>
      )}

      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Menu
      </p>

      {visibleNav.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active && "text-foreground")} />
            {item.label}
          </Link>
        );
      })}

      {isAdmin && (
        <Link
          href="/admin"
          onClick={onNavigate}
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/admin")
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <ShieldCheck className={cn("size-4 shrink-0", pathname.startsWith("/admin") && "text-foreground")} />
          Admin
        </Link>
      )}

      <UserFooter />
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The login page renders full-screen, without the app navigation chrome.
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Brand />
        </div>
        <NavLinks />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="grid size-9 place-items-center rounded-md hover:bg-muted"
        >
          <Menu className="size-5" />
        </button>
        <Brand />
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r bg-background shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <Brand />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-md hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
