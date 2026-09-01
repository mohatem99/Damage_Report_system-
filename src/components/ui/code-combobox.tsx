"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  code: string;
  description: string;
  group?: string;
}

/**
 * Searchable single-select over a code catalog (component/damage/repair/
 * location codes) — filters by code or description as you type. A plain
 * radix Select doesn't support text search, and the component catalog alone
 * runs to 91 entries, so this trades the native select for a small hand-rolled
 * popover (same "no dialog/combobox lib, just enough to do the job" approach
 * as components/ui/dialog.tsx).
 */
export function CodeCombobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowClear = true,
  disabled,
  className,
}: {
  value?: string | null;
  onChange: (code: string | undefined) => void;
  options: ComboboxOption[];
  placeholder?: string;
  /** Show a "— None —" entry that clears the selection. */
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.code === value);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.code.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q),
    );
  }, [options, query]);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const select = (code: string | undefined) => {
    onChange(code);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) select(opt.code);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
          {selected ? `${selected.code} — ${selected.description}` : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[16rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center border-b px-2">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search code or description…"
              className="flex h-9 w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {allowClear && (
              <ComboboxRow
                active={false}
                onClick={() => select(undefined)}
                label="— None —"
              />
            )}
            {filtered.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                No matches.
              </p>
            )}
            {filtered.map((o, i) => (
              <ComboboxRow
                key={o.code}
                active={i === highlight}
                selected={o.code === value}
                onClick={() => select(o.code)}
                onMouseEnter={() => setHighlight(i)}
                label={`${o.code} — ${o.description}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ComboboxRow({
  label,
  active,
  selected,
  onClick,
  onMouseEnter,
}: {
  label: string;
  active: boolean;
  selected?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {selected && <Check className="h-4 w-4" />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
