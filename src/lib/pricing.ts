import type {
  ContainerSize,
  DamageItem,
  EorBreakdown,
  EorLine,
  RepairRate,
  Responsibility,
} from "./types";

const DEFAULT_CURRENCY = "EGP";
const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown): number => (v == null ? 0 : Number(v));

export interface EstimateContext {
  containerSize: ContainerSize;
  shippingLineId?: string | null;
  /** Agency of the selected shipping line, for agency-level rate matching. */
  agencyId?: string | null;
  repairRates: RepairRate[];
  /** Report labour rate, used when a matched rate has none of its own. */
  laborRate?: number;
}

/**
 * Price a set of damage items into an IICL EOR breakdown — a client-side mirror
 * of the backend `EorService.compute`, used for the live estimate on the
 * new-report form. Each item is priced against the best-matching repair rate for
 * (component, repair, damage, grade, size, line); manual per-line overrides win.
 * Totals split by the "Prty" responsibility (owner vs user).
 */
export function estimateEor(
  items: DamageItem[],
  ctx: EstimateContext,
): EorBreakdown {
  const reportLaborRate = num(ctx.laborRate);
  let currency = DEFAULT_CURRENCY;
  const lines: EorLine[] = [];
  let laborTotal = 0;
  let materialTotal = 0;
  let ownerTotal = 0;
  let userTotal = 0;
  let unassignedTotal = 0;
  let pricedCount = 0;
  let unpricedCount = 0;

  items.forEach((item, idx) => {
    const rate = bestRate(ctx.repairRates, {
      componentCode: item.componentCode ?? null,
      repairCode: item.repairCode ?? null,
      damageCode: item.iiclDamageCode ?? null,
      grade: item.grade ?? null,
      containerSize: ctx.containerSize,
      shippingLineId: ctx.shippingLineId ?? null,
      agencyId: ctx.agencyId ?? null,
    });
    if (rate?.currency) currency = rate.currency;

    const qty = item.quantity ?? 1;
    const hours =
      item.hoursOverride != null ? num(item.hoursOverride) : num(rate?.laborHours);
    const laborRate =
      rate?.laborRate != null ? num(rate.laborRate) : reportLaborRate;

    // Material is prorated by the fraction of the full component the damage
    // covers (mirrors EorService.areaFactor). 1 = no proration.
    const areaFactor = computeAreaFactor(item, rate);

    const laborCost =
      item.laborCostOverride != null
        ? num(item.laborCostOverride)
        : round2(qty * hours * laborRate);
    const materialCost =
      item.materialCostOverride != null
        ? num(item.materialCostOverride)
        : round2(qty * num(rate?.materialCost) * areaFactor);
    const total = round2(laborCost + materialCost);

    const priced =
      rate != null ||
      item.laborCostOverride != null ||
      item.materialCostOverride != null;
    if (priced) pricedCount += 1;
    else unpricedCount += 1;

    laborTotal += laborCost;
    materialTotal += materialCost;
    const responsibility = item.responsibility ?? null;
    if (responsibility === "OWNER") ownerTotal += total;
    else if (responsibility === "USER") userTotal += total;
    else unassignedTotal += total;

    lines.push({
      no: idx + 1,
      componentCode: item.componentCode ?? "",
      locationCode: formatLoc(item),
      damageCode: item.iiclDamageCode ?? "",
      repairCode: item.repairCode ?? "",
      description: item.note?.trim() || rate?.description?.trim() || "",
      prty: responsibility ? (responsibility === "OWNER" ? "O" : "U") : "",
      responsibility: responsibility as Responsibility | null,
      length: item.lengthMm != null ? num(item.lengthMm) : null,
      width: item.widthMm != null ? num(item.widthMm) : null,
      areaFactor,
      quantity: qty,
      hours,
      laborRate,
      laborCost,
      materialCost,
      total,
      priced,
    });
  });

  return {
    currency,
    laborRate: reportLaborRate,
    lines,
    laborTotal: round2(laborTotal),
    materialTotal: round2(materialTotal),
    total: round2(laborTotal + materialTotal),
    ownerTotal: round2(ownerTotal),
    userTotal: round2(userTotal),
    unassignedTotal: round2(unassignedTotal),
    pricedCount,
    unpricedCount,
  };
}

/**
 * The EOR "Loc Code" cell: the IICL location face plus the numbered panel/board
 * when set, e.g. "LXXX-3" (left side, panel 3) or "IXXX-5" (floor board 5).
 * Mirrors EorService.formatLoc.
 */
function formatLoc(item: DamageItem): string {
  const loc = item.iiclLocationCode ?? "";
  if (item.panelPosition == null) return loc;
  return loc ? `${loc}-${item.panelPosition}` : `#${item.panelPosition}`;
}

/** Damaged-area ÷ full-component-area (capped at 1); 1 when not prorated. */
function computeAreaFactor(item: DamageItem, rate?: RepairRate): number {
  const fullArea = num(rate?.fullLengthMm) * num(rate?.fullWidthMm);
  const damageArea = num(item.lengthMm) * num(item.widthMm);
  if (fullArea <= 0 || damageArea <= 0) return 1;
  return Math.min(damageArea / fullArea, 1);
}

function bestRate(
  rates: RepairRate[],
  key: {
    componentCode: string | null;
    repairCode: string | null;
    damageCode: string | null;
    grade: string | null;
    containerSize: ContainerSize;
    shippingLineId: string | null;
    agencyId: string | null;
  },
): RepairRate | undefined {
  if (!key.componentCode || !key.repairCode) return undefined;
  let best: RepairRate | undefined;
  let bestScore = -1;
  for (const r of rates) {
    if (r.componentCode !== key.componentCode) continue;
    if (r.repairCode !== key.repairCode) continue;
    if (r.damageCode != null && r.damageCode !== key.damageCode) continue;
    if (r.grade != null && r.grade !== key.grade) continue;
    if (r.containerSize != null && r.containerSize !== key.containerSize) continue;
    if (r.shippingLineId != null && r.shippingLineId !== key.shippingLineId)
      continue;
    if (r.agencyId != null && r.agencyId !== key.agencyId) continue;
    // Precedence: line (16) beats agency (8) beats all; then size/damage/grade.
    const score =
      (r.shippingLineId != null ? 16 : 0) +
      (r.agencyId != null ? 8 : 0) +
      (r.containerSize != null ? 4 : 0) +
      (r.damageCode != null ? 2 : 0) +
      (r.grade != null ? 1 : 0);
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}
