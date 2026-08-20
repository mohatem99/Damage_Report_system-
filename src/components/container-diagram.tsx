"use client";

import { cn } from "@/lib/utils";
import type { Refs } from "@/lib/types";

/**
 * Interactive location picker built from the form's A–Z legend.
 * Codes are grouped by container region so an inspector can quickly tap
 * where the damage is. Marked codes (already on the report) are highlighted;
 * the currently selected code is outlined.
 */

const GROUPS: { title: string; codes: string[] }[] = [
  { title: "Top", codes: ["A", "B", "X", "W", "H", "Y"] },
  { title: "Front", codes: ["G", "S", "N", "C"] },
  { title: "Left side", codes: ["F", "D", "J", "I"] },
  { title: "Right side", codes: ["V", "R", "K", "T"] },
  { title: "Rear / Doors", codes: ["O", "Q", "P", "U", "Z"] },
  { title: "Bottom", codes: ["E", "M", "L"] },
];

export function ContainerDiagram({
  refs,
  selected,
  marked,
  onSelect,
}: {
  refs: Refs;
  selected?: string;
  marked: string[];
  onSelect: (code: string) => void;
}) {
  const labelFor = (code: string) =>
    refs.locationCodes.find((c) => c.code === code)?.label ?? code;

  return (
    <div className="space-y-4">
      <svg
        viewBox="0 0 320 160"
        className="w-full max-w-md rounded-md border bg-muted/40"
        role="img"
        aria-label="Container schematic"
      >
        <rect
          x="20"
          y="30"
          width="220"
          height="100"
          fill="hsl(var(--background))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        <polygon
          points="20,30 60,10 300,10 260,30"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        <polygon
          points="240,30 280,10 300,10 300,110 260,130 240,130"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        {/* doors hint on the right end */}
        <line
          x1="270"
          y1="20"
          x2="270"
          y2="120"
          stroke="hsl(var(--border))"
          strokeDasharray="4 3"
        />
        <text x="130" y="85" textAnchor="middle" className="fill-muted-foreground" fontSize="11">
          {marked.length
            ? `${marked.length} location(s) marked`
            : "Select a location below"}
        </text>
      </svg>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.codes.map((code) => {
                const isMarked = marked.includes(code);
                const isSelected = selected === code;
                return (
                  <button
                    key={code}
                    type="button"
                    title={labelFor(code)}
                    onClick={() => onSelect(code)}
                    className={cn(
                      "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : isMarked
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "bg-background hover:bg-accent",
                    )}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <p className="text-sm text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{selected}</span>{" "}
          — {labelFor(selected)}
        </p>
      )}
    </div>
  );
}
