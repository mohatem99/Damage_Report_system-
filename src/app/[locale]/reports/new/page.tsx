"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { estimateEor } from "@/lib/pricing";
import { formatDual } from "@/lib/money";
import type {
  ContainerSize,
  CreateReportInput,
  DamageItem,
  RepairMode,
  Responsibility,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
  ComponentCodeSelect,
  DamageCodeSelect,
  RepairCodeSelect,
  LocationCodeSelect,
} from "@/components/iicl/code-selects";
import { CodeCombo } from "@/components/iicl/code-combo";

const NONE_LINE = "__none__";
const NONE = "__none__";

const money = (currency: string, n: number) => formatDual(currency, n);
const cur = (currency: string, n: number) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;

const TYPE_LABELS: Record<string, string> = {
  STANDARD: "Standard",
  HIGH_CUBE: "High Cube",
  REEFER: "Reefer",
  OPEN_TOP: "Open Top",
  TANK: "Tank",
  FLAT_RACK: "Flat Rack",
};

/** ISO-style size/type suffix (e.g. "20DC", "40HC", "40RE") shown in Container Description. */
const TYPE_CODE: Record<string, string> = {
  STANDARD: "DC",
  HIGH_CUBE: "HC",
  REEFER: "RE",
  OPEN_TOP: "OT",
  TANK: "TK",
  FLAT_RACK: "FR",
};
const sizeTypeCode = (size: string, type: string) =>
  `${size}${TYPE_CODE[type] ?? type}`;

const REPAIR_MODES: { value: RepairMode; label: string }[] = [
  { value: "REPAIR", label: "Repair" },
  { value: "REPLACE", label: "Replace" },
];

/**
 * Slice presets for components priced by area (e.g. a plywood floor sheet). Each
 * fills the damage size to a fraction of the matched rate's full panel, so the
 * EOR prices that fraction — e.g. a 240×116 sheet → ¾ = 180×116 = ¾ of the price.
 */
const SLICES: { label: string; f: number }[] = [
  { label: "Full", f: 1 },
  { label: "¾", f: 0.75 },
  { label: "½", f: 0.5 },
  { label: "¼", f: 0.25 },
];

export default function NewReportPage() {
  const router = useRouter();
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: api.refs });
  const { data: repairRates } = useQuery({
    queryKey: ["repair-rates"],
    queryFn: api.listRepairRates,
  });
  const { data: shippingLines } = useQuery({
    queryKey: ["shipping-lines"],
    queryFn: api.listShippingLines,
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
  });
  const depotSeeded = useRef(false);

  const [form, setForm] = useState({
    reportDate: new Date().toISOString().slice(0, 10),
    containerNumber: "",
    truckCompany: "",
    truckNumber: "",
    containerSize: "40",
    containerStatus: "EMPTY",
    containerType: "STANDARD",
    shippingLineId: "",
    inspectionNotes: "",
    supervisorName: "",
    truckerName: "",
    truckCoName: "",
    shipperName: "",
    blNo: "",
    // EOR header — trimmed to just what the backend requires; the rest
    // (dates, weights, customer, notes, …) defaults to blank server-side.
    // Depot is seeded from system settings below; labor rate/currency use
    // silent defaults since there's no per-report UI for them anymore.
    laborRate: "0",
    estCurrency: "EGP",
    depotCode: "",
    depotName: "",
  });

  // Pre-fill the depot from the system-wide default once, unless the user has
  // already entered one. Reports still store their own depot, editable here.
  useEffect(() => {
    if (!settings || depotSeeded.current) return;
    depotSeeded.current = true;
    setForm((f) =>
      f.depotCode || f.depotName
        ? f
        : {
            ...f,
            depotCode: settings.depotCode ?? "",
            depotName: settings.depotName ?? "",
          },
    );
  }, [settings]);

  const [items, setItems] = useState<DamageItem[]>([]);
  const [pendingMode, setPendingMode] = useState<RepairMode>("REPAIR");
  const [pendingQty, setPendingQty] = useState("1");
  const [pendingNote, setPendingNote] = useState("");
  // IICL repair coding for the item being built.
  const [pendingComponent, setPendingComponent] = useState<string>();
  const [pendingRepair, setPendingRepair] = useState<string>();
  const [pendingIiclDamage, setPendingIiclDamage] = useState<string>();
  const [pendingIiclLoc, setPendingIiclLoc] = useState<string>();
  const [pendingPanel, setPendingPanel] = useState("");
  const [pendingResp, setPendingResp] = useState<string>(NONE);
  const [pendingGrade, setPendingGrade] = useState("");
  const [pendingLength, setPendingLength] = useState("");
  const [pendingWidth, setPendingWidth] = useState("");

  // Photos are queued locally, then uploaded after the report is created.
  const [photos, setPhotos] = useState<File[]>([]);
  const photoInput = useRef<HTMLInputElement>(null);
  const previews = useMemo(
    () => photos.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [photos],
  );
  useEffect(
    () => () => previews.forEach((p) => URL.revokeObjectURL(p.url)),
    [previews],
  );

  // Live repair-cost estimate: reprices whenever the damage items, container
  // size, or shipping line change, so the inspector sees the total as they
  // build it.
  const cost = useMemo(
    () =>
      estimateEor(items, {
        containerSize: form.containerSize as ContainerSize,
        shippingLineId: form.shippingLineId || null,
        // Agency of the selected line, so agency-level rates match in the estimate.
        agencyId:
          shippingLines?.find((l) => l.id === form.shippingLineId)?.agencyId ?? null,
        repairRates: repairRates ?? [],
        laborRate: Number(form.laborRate) || 0,
      }),
    [
      items,
      form.containerSize,
      form.shippingLineId,
      form.laborRate,
      repairRates,
      shippingLines,
    ],
  );

  // The repair rate for the pending item that declares a full component size —
  // powers the "slice" presets (e.g. plywood 240×116 → ¾ = 180×116).
  const sliceRate = useMemo(() => {
    if (!pendingComponent) return undefined;
    const withFull = (repairRates ?? []).filter(
      (r) => r.componentCode === pendingComponent && r.fullLengthMm && r.fullWidthMm,
    );
    return (
      withFull.find((r) => !pendingRepair || r.repairCode === pendingRepair) ??
      withFull[0]
    );
  }, [repairRates, pendingComponent, pendingRepair]);

  // Guided panel numbering: the standard series count for the picked location
  // face at the current container size (e.g. LXXX on a 40′ → 1–14). Used to hint
  // the valid range and flag an out-of-range panel number.
  const panelFace = useMemo(
    () =>
      pendingIiclLoc
        ? refs?.faceCounts?.[form.containerSize as ContainerSize]?.find(
            (f) => f.code === pendingIiclLoc,
          )
        : undefined,
    [refs, form.containerSize, pendingIiclLoc],
  );
  const panelNum = pendingPanel ? Math.floor(Number(pendingPanel)) : null;
  const panelOutOfRange =
    !!panelFace && panelNum != null && (panelNum < 1 || panelNum > panelFace.max);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const labelForComponent = (c: string) =>
    refs?.componentCodes.find((k) => k.code === c)?.description ?? c;

  const num = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const addItem = () => {
    // A damage item is an IICL catalog line; the component code is the required
    // subject (what's damaged).
    if (!pendingComponent) {
      toast.error("Pick an IICL component code");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        repairMode: pendingMode,
        quantity: Math.max(1, Math.floor(Number(pendingQty) || 1)),
        note: pendingNote || undefined,
        componentCode: pendingComponent,
        repairCode: pendingRepair ?? null,
        iiclDamageCode: pendingIiclDamage ?? null,
        iiclLocationCode: pendingIiclLoc ?? null,
        panelPosition: pendingPanel
          ? Math.max(1, Math.floor(Number(pendingPanel))) || null
          : null,
        responsibility:
          pendingResp === NONE ? null : (pendingResp as Responsibility),
        grade: pendingGrade.trim() || null,
        lengthMm: num(pendingLength),
        widthMm: num(pendingWidth),
      },
    ]);
    setPendingMode("REPAIR");
    setPendingQty("1");
    setPendingNote("");
    setPendingComponent(undefined);
    setPendingRepair(undefined);
    setPendingIiclDamage(undefined);
    setPendingIiclLoc(undefined);
    setPendingPanel("");
    setPendingResp(NONE);
    setPendingGrade("");
    setPendingLength("");
    setPendingWidth("");
  };

  const mutation = useMutation({
    mutationFn: async (input: CreateReportInput) => {
      const report = await api.createReport(input);
      // Upload any queued photos to the freshly created report.
      let failed = 0;
      for (const file of photos) {
        try {
          await api.uploadAttachment(report.id, file);
        } catch {
          failed += 1;
        }
      }
      return { report, failed };
    },
    onSuccess: ({ report, failed }) => {
      toast.success(`Report No. ${report.reportNoFormatted ?? report.reportNo} created`);
      if (failed > 0) toast.error(`${failed} photo(s) failed to upload`);
      router.push(`/reports/${report.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.containerNumber.trim()) {
      toast.error("Container number is required");
      return;
    }
    if (!form.blNo.trim()) {
      toast.error("B/L No. is required");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one damage item");
      return;
    }
    const payload: Record<string, unknown> = {
      ...form,
      shippingLineId: form.shippingLineId || null,
      // Derived from Size + Type (e.g. "20DC", "40HC") rather than hand-typed.
      sizeType: sizeTypeCode(form.containerSize, form.containerType),
      laborRate: Number(form.laborRate) || 0,
      items,
    };
    mutation.mutate(payload as unknown as CreateReportInput);
  };

  if (!refs) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">New Damage Report</h1>

      <Card>
        <CardHeader>
          <CardTitle>Identification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <Input
              type="date"
              value={form.reportDate}
              onChange={(e) => set("reportDate", e.target.value)}
            />
          </Field>
          <Field label="Container Number *">
            <Input
              value={form.containerNumber}
              placeholder="e.g. MSKU1234567"
              onChange={(e) => set("containerNumber", e.target.value)}
            />
          </Field>
          <Field label="B/L No. *">
            <Input
              value={form.blNo}
              onChange={(e) => set("blNo", e.target.value)}
            />
          </Field>
          <Field label="Truck Company">
            <Input
              value={form.truckCompany}
              onChange={(e) => set("truckCompany", e.target.value)}
            />
          </Field>
          <Field label="Truck No.">
            <Input
              value={form.truckNumber}
              onChange={(e) => set("truckNumber", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Container Description</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Size">
            <Select value={form.containerSize} onValueChange={(v) => set("containerSize", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {refs.containerSizes.map((s) => (
                  <SelectItem key={s} value={s}>{s}&apos;</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.containerStatus} onValueChange={(v) => set("containerStatus", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {refs.containerStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Type">
            <Select value={form.containerType} onValueChange={(v) => set("containerType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {refs.containerTypes.map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t] ?? t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Size / Type">
            <Input
              value={sizeTypeCode(form.containerSize, form.containerType)}
              disabled
              className="font-mono font-medium"
            />
          </Field>
          <Field label="Shipping Line">
            <Select
              value={form.shippingLineId || NONE_LINE}
              onValueChange={(v) => set("shippingLineId", v === NONE_LINE ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_LINE}>— None —</SelectItem>
                {shippingLines?.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Damage Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3 rounded-md border p-4">
            <p className="text-xs text-muted-foreground">
              Each damage item is an IICL catalog line — pick the component
              that&apos;s damaged, then its damage, repair and location codes.{" "}
              <Link href="/numbering" className="underline">
                Panel numbering guide
              </Link>
              .
            </p>
            <Field label="Component code *">
              <ComponentCodeSelect
                codes={refs.componentCodes}
                value={pendingComponent}
                onChange={setPendingComponent}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Damage code">
                <DamageCodeSelect
                  codes={refs.damageCodes}
                  value={pendingIiclDamage}
                  onChange={setPendingIiclDamage}
                />
              </Field>
              <Field label="Repair code">
                <RepairCodeSelect
                  codes={refs.repairCodes}
                  value={pendingRepair}
                  onChange={setPendingRepair}
                />
              </Field>
              <Field label="Location code">
                <LocationCodeSelect
                  codes={refs.iiclLocationCodes}
                  value={pendingIiclLoc}
                  onChange={setPendingIiclLoc}
                />
              </Field>
              <Field label="Panel / board / member no.">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={pendingPanel}
                  placeholder="e.g. 3"
                  aria-invalid={panelOutOfRange || undefined}
                  className={cn(panelOutOfRange && "border-destructive")}
                  onChange={(e) => setPendingPanel(e.target.value)}
                />
                {panelFace && (
                  <p
                    className={cn(
                      "text-[11px]",
                      panelOutOfRange ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {panelFace.label} · {form.containerSize}′ →{" "}
                    {panelFace.max === 1 ? "1" : `1–${panelFace.max}`}
                    {panelOutOfRange && " · out of range"}
                  </p>
                )}
              </Field>
              <Field label="Action">
                <Select value={pendingMode} onValueChange={(v) => setPendingMode(v as RepairMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPAIR_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Qty">
                <Input type="number" min="1" step="1" value={pendingQty} onChange={(e) => setPendingQty(e.target.value)} />
              </Field>
              <Field label="Responsibility (Prty)">
                <Select value={pendingResp} onValueChange={setPendingResp}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Unassigned —</SelectItem>
                    {refs.responsibilities.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Grade">
                <Input value={pendingGrade} placeholder="A / B / C" onChange={(e) => setPendingGrade(e.target.value)} />
              </Field>
              <Field label="Length">
                <Input type="number" min="0" step="0.01" value={pendingLength} onChange={(e) => setPendingLength(e.target.value)} />
              </Field>
              <Field label="Width">
                <Input type="number" min="0" step="0.01" value={pendingWidth} onChange={(e) => setPendingWidth(e.target.value)} />
              </Field>
            </div>

            {sliceRate && (
              <div className="space-y-1.5 rounded-md border border-dashed p-3">
                <Label>
                  Slice size — full panel {sliceRate.fullLengthMm}×{sliceRate.fullWidthMm}
                  {sliceRate.grade ? ` · grade ${sliceRate.grade}` : ""}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {SLICES.map((s) => {
                    const len = Math.round((sliceRate.fullLengthMm ?? 0) * s.f);
                    const wid = sliceRate.fullWidthMm ?? 0;
                    const active =
                      Number(pendingLength) === len && Number(pendingWidth) === wid;
                    return (
                      <Button
                        key={s.label}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setPendingLength(String(len));
                          setPendingWidth(String(wid));
                          // Match the rate's grade so it actually prices.
                          if (sliceRate.grade) setPendingGrade(sliceRate.grade);
                        }}
                      >
                        {s.label} · {len}×{wid}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Prices as a fraction of the full panel ({sliceRate.materialCost}{" "}
                  {sliceRate.currency}) — ½ ={" "}
                  {Math.round(Number(sliceRate.materialCost) * 0.5)} {sliceRate.currency},
                  ¾ = {Math.round(Number(sliceRate.materialCost) * 0.75)}{" "}
                  {sliceRate.currency}.
                </p>
              </div>
            )}

            <Field label="Description of repair (optional)">
              <Input
                value={pendingNote}
                placeholder={pendingComponent ? labelForComponent(pendingComponent) : "e.g. Renew plywood floor panel"}
                onChange={(e) => setPendingNote(e.target.value)}
              />
            </Field>

            <div className="flex justify-end">
              <Button type="button" onClick={addItem}>Add damage item</Button>
            </div>
          </div>

          {items.length > 0 && (
            <ul className="divide-y rounded-md border">
              {items.map((item, idx) => (
                <li key={idx} className="flex items-start justify-between gap-3 p-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {item.repairMode === "REPLACE" ? "Replace" : "Repair"}
                        {(item.quantity ?? 1) > 1 ? ` ×${item.quantity}` : ""}
                      </Badge>
                      <CodeCombo item={item} />
                      {item.componentCode && (
                        <span className="text-sm text-muted-foreground">
                          {labelForComponent(item.componentCode)}
                        </span>
                      )}
                      {item.panelPosition != null && (
                        <Badge variant="outline" className="font-mono">
                          {item.iiclLocationCode
                            ? `${item.iiclLocationCode}-${item.panelPosition}`
                            : `Panel #${item.panelPosition}`}
                        </Badge>
                      )}
                      {item.note && (
                        <span className="text-sm text-muted-foreground">· {item.note}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Estimate of Repair (EOR)</CardTitle>
            <span className="text-lg font-bold">{money(cost.currency, cost.total)}</span>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">#</th>
                    <th className="py-1.5 pr-2 font-medium">Comp</th>
                    <th className="py-1.5 pr-2 font-medium">Loc</th>
                    <th className="py-1.5 pr-2 font-medium">Dmg</th>
                    <th className="py-1.5 pr-2 font-medium">Rep</th>
                    <th className="py-1.5 pr-2 text-center font-medium">Prty</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Qty</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Hrs</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Labor</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Material</th>
                    <th className="py-1.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cost.lines.map((l) => (
                    <tr key={l.no} className="border-b last:border-0">
                      <td className="py-1.5 pr-2 text-muted-foreground">{l.no}</td>
                      <td className="py-1.5 pr-2 font-mono">
                        {l.componentCode || <span className="text-destructive">—</span>}
                      </td>
                      <td className="py-1.5 pr-2 font-mono">{l.locationCode || "—"}</td>
                      <td className="py-1.5 pr-2 font-mono">{l.damageCode || "—"}</td>
                      <td className="py-1.5 pr-2 font-mono">{l.repairCode || "—"}</td>
                      <td className="py-1.5 pr-2 text-center">{l.prty || "—"}</td>
                      <td className="py-1.5 pr-2 text-right">{l.quantity}</td>
                      <td className="py-1.5 pr-2 text-right">{l.hours || "—"}</td>
                      <td className="py-1.5 pr-2 text-right">{cur(cost.currency, l.laborCost)}</td>
                      <td className="py-1.5 pr-2 text-right">{cur(cost.currency, l.materialCost)}</td>
                      <td className="py-1.5 text-right font-medium">{cur(cost.currency, l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-0.5 border-t pt-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Labour subtotal</span>
                <span>{cur(cost.currency, cost.laborTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Material subtotal</span>
                <span>{cur(cost.currency, cost.materialTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>User (U) subtotal</span>
                <span>{cur(cost.currency, cost.userTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Owner (O) subtotal</span>
                <span>{cur(cost.currency, cost.ownerTotal)}</span>
              </div>
            </div>
            {cost.unpricedCount > 0 && (
              <p className="text-sm text-destructive">
                {cost.unpricedCount} line(s) have no matching repair rate (need a
                component + repair code priced for a {form.containerSize}&apos;
                container) and price at 0.{" "}
                <Link href="/iicl" className="underline">
                  Add repair rates
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Photos ({photos.length})</CardTitle>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) setPhotos((prev) => [...prev, ...files]);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => photoInput.current?.click()}
          >
            <Upload /> Add photos
          </Button>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Attach damage photos (optional). They upload when you save the report.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {previews.map((p, idx) => (
                <div key={idx} className="group relative overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.file.name}
                    className="aspect-square w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute right-1 top-1 rounded-md bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    title="Remove photo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inspection & Sign-off</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Inspection Description">
            <Textarea
              value={form.inspectionNotes}
              onChange={(e) => set("inspectionNotes", e.target.value)}
              placeholder="Free-text notes about the inspection…"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="OP. Shift Supervisor">
              <Input value={form.supervisorName} onChange={(e) => set("supervisorName", e.target.value)} />
            </Field>
            <Field label="Trucker">
              <Input value={form.truckerName} onChange={(e) => set("truckerName", e.target.value)} />
            </Field>
            <Field label="Truck CO.">
              <Input value={form.truckCoName} onChange={(e) => set("truckCoName", e.target.value)} />
            </Field>
            <Field label="Shipper">
              <Input value={form.shipperName} onChange={(e) => set("shipperName", e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/reports")}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save Report"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
