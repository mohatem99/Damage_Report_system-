"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CodeCatalog } from "./code-catalog";
import { RepairRates } from "./repair-rates";
import type { CodeKind } from "@/lib/api";

type Tab =
  | { key: CodeKind; label: string; group?: boolean; kind: "codes" }
  | { key: "repair-rates"; label: string; kind: "rates" };

const TABS: Tab[] = [
  { key: "component-codes", label: "Component Codes", group: true, kind: "codes" },
  { key: "damage-codes", label: "Damage Codes", kind: "codes" },
  { key: "repair-codes", label: "Repair Codes", kind: "codes" },
  { key: "location-codes", label: "Location Codes", kind: "codes" },
  { key: "repair-rates", label: "Repair Rates", kind: "rates" },
];

export default function IiclPage() {
  const [active, setActive] = useState<Tab>(TABS[0]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">IICL Catalogs</h1>
        <p className="text-sm text-muted-foreground">
          The IICL coding used across the Estimate of Repair (EOR): component,
          damage, repair and location codes, plus the repair-rate price catalog.
          Seeded with a standard set — edit freely to match your depot&apos;s
          code master.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active.key === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active.kind === "codes" ? (
        <CodeCatalog
          kind={active.key as CodeKind}
          label={active.label}
          withGroup={active.key === "component-codes"}
        />
      ) : (
        <RepairRates />
      )}
    </div>
  );
}
