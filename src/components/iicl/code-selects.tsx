"use client";

import type { CodeItem } from "@/lib/types";
import { CodeCombobox } from "@/components/ui/code-combobox";

/** Shared props for a single IICL code-catalog picker. */
interface CodeSelectProps {
  codes: CodeItem[];
  value?: string;
  onChange: (code: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}

/** Component code picker (the EOR "Comp Code") — required subject of a damage line. */
export function ComponentCodeSelect({ codes, value, onChange, disabled, className }: CodeSelectProps) {
  return (
    <CodeCombobox
      value={value}
      onChange={onChange}
      options={codes}
      placeholder="Select a component…"
      allowClear={false}
      disabled={disabled}
      className={className}
    />
  );
}

/** Damage code picker (the EOR "Dmg Code") — optional. */
export function DamageCodeSelect({ codes, value, onChange, disabled, className }: CodeSelectProps) {
  return (
    <CodeCombobox
      value={value}
      onChange={onChange}
      options={codes}
      placeholder="Select a damage code…"
      disabled={disabled}
      className={className}
    />
  );
}

/** Repair code picker (the EOR "Rep Code") — optional. */
export function RepairCodeSelect({ codes, value, onChange, disabled, className }: CodeSelectProps) {
  return (
    <CodeCombobox
      value={value}
      onChange={onChange}
      options={codes}
      placeholder="Select a repair code…"
      disabled={disabled}
      className={className}
    />
  );
}

/**
 * IICL TB-002 location code picker (the EOR "Loc Code") — optional. Backed by
 * the catalog's common combos; the field itself accepts any well-formed
 * 4-char TB-002 code (validated server-side by pattern, not catalog
 * membership — see IsIiclLocationCode on the API).
 */
export function LocationCodeSelect({ codes, value, onChange, disabled, className }: CodeSelectProps) {
  return (
    <CodeCombobox
      value={value}
      onChange={onChange}
      options={codes}
      placeholder="Select a location…"
      disabled={disabled}
      className={className}
    />
  );
}
