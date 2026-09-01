import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CodeComboItem {
  componentCode?: string | null;
  iiclLocationCode?: string | null;
  iiclDamageCode?: string | null;
  repairCode?: string | null;
}

/**
 * Read-only chip for a damage item's full IICL code combo, e.g.
 * "PAA · LHXX · BE · RP" (component · location · damage · repair) — the
 * consistent compact rendering used across list/detail views.
 */
export function CodeCombo({
  item,
  className,
}: {
  item: CodeComboItem;
  className?: string;
}) {
  const parts = [
    item.componentCode,
    item.iiclLocationCode,
    item.iiclDamageCode,
    item.repairCode,
  ].filter((p): p is string => !!p);
  if (parts.length === 0) return null;
  return (
    <Badge variant="outline" className={cn("font-mono", className)}>
      {parts.join(" · ")}
    </Badge>
  );
}
