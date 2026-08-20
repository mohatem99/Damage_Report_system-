"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { estimateEor } from "@/lib/pricing";
import { formatDual } from "@/lib/money";
import type {
  ContainerSize,
  CreateReportInput,
  DamageItem,
  DamageItemPart,
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
import { ContainerDiagram } from "@/components/container-diagram";

const NONE_LINE = "__none__";
const NONE = "__none__";

const money = (currency: string, n: number) => formatDual(currency, n);
const cur = (currency: string, n: number) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;

/** Prefill the IICL damage code from the selected EIR damage type. */
const DAMAGE_TYPE_TO_IICL: Record<string, string> = {
  BENT: "BE",
  CAVED_IN: "CV",
  DENT: "DT",
  LOOSE: "LO",
  CUT: "CU",
  SCRATCHED: "SC",
  PUSHED_IN: "PI",
  BROKEN: "BR",
  CRACKED: "CR",
  DISTORTED: "DS",
  MISSING: "MS",
  HOLE: "HO",
  SPRUNG: "SP",
  PUSHED_OUT: "PO",
  TORN_RIP: "TO",
  PUNCTURE: "PU",
  RUSTY: "RU",
};

const TYPE_LABELS: Record<string, string> = {
  STANDARD: "Standard",
  HIGH_CUBE: "High Cube",
  REEFER: "Reefer",
  OPEN_TOP: "Open Top",
  TANK: "Tank",
  FLAT_RACK: "Flat Rack",
};

const REPAIR_MODES: { value: RepairMode; label: string }[] = [
  { value: "REPAIR", label: "Repair" },
  { value: "REPLACE", label: "Replace" },
];

export default function NewReportPage() {
  const router = useRouter();
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: api.refs });
  const { data: parts } = useQuery({
    queryKey: ["parts"],
    queryFn: api.listParts,
  });
  const { data: repairRates } = useQuery({
    queryKey: ["repair-rates"],
    queryFn: api.listRepairRates,
  });
  const { data: shippingLines } = useQuery({
    queryKey: ["shipping-lines"],
    queryFn: api.listShippingLines,
  });

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
    // EOR header (optional)
    eorNo: "",
    eorDate: "",
    estimateDate: "",
    laborRate: "",
    estCurrency: "EGP",
    exchangeRate: "",
    sizeType: "",
    depotCode: "",
    depotName: "",
    opsCode: "",
    blNo: "",
    turnInDate: "",
    onHireDate: "",
    tareWeight: "",
    grossWeight: "",
    cscPlate: "",
    yearBuild: "",
    unitMeasure: "",
    customer: "",
    address: "",
    criteria: "",
    eorNote: "",
  });

  const [items, setItems] = useState<DamageItem[]>([]);
  const [pendingCode, setPendingCode] = useState<string>();
  const [pendingType, setPendingType] = useState<string>();
  const [pendingMode, setPendingMode] = useState<RepairMode>("REPAIR");
  const [pendingQty, setPendingQty] = useState("1");
  const [pendingNote, setPendingNote] = useState("");
  // IICL repair coding for the item being built.
  const [pendingComponent, setPendingComponent] = useState<string>();
  const [pendingRepair, setPendingRepair] = useState<string>();
  const [pendingIiclDamage, setPendingIiclDamage] = useState<string>();
  const [pendingIiclLoc, setPendingIiclLoc] = useState<string>();
  const [pendingResp, setPendingResp] = useState<string>(NONE);
  const [pendingGrade, setPendingGrade] = useState("");
  const [pendingLength, setPendingLength] = useState("");
  const [pendingWidth, setPendingWidth] = useState("");
  // Parts staged for the damage item currently being built.
  const [pendingParts, setPendingParts] = useState<DamageItemPart[]>([]);
  const [partPick, setPartPick] = useState<string>();
  const [partQty, setPartQty] = useState("1");

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

  const markedCodes = useMemo(
    () => Array.from(new Set(items.map((i) => i.locationCode))),
    [items],
  );

  // Live repair-cost estimate: reprices whenever the damage items, container
  // size, or shipping line change, so the inspector sees the total as they
  // build it.
  const cost = useMemo(
    () =>
      estimateEor(items, {
        containerSize: form.containerSize as ContainerSize,
        shippingLineId: form.shippingLineId || null,
        repairRates: repairRates ?? [],
        laborRate: Number(form.laborRate) || 0,
      }),
    [items, form.containerSize, form.shippingLineId, form.laborRate, repairRates],
  );

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const labelForType = (v: string) =>
    refs?.damageTypes.find((t) => t.value === v)?.label ?? v;
  const labelForCode = (c: string) =>
    refs?.locationCodes.find((l) => l.code === c)?.label ?? c;
  const partById = (id: string) => parts?.find((p) => p.id === id);

  const addPendingPart = () => {
    if (!partPick) return toast.error("Pick a part");
    const qty = Math.max(1, Math.floor(Number(partQty) || 1));
    setPendingParts((prev) => {
      // Merge with an existing line for the same part.
      const existing = prev.find((p) => p.partId === partPick);
      if (existing) {
        return prev.map((p) =>
          p.partId === partPick ? { ...p, quantity: p.quantity + qty } : p,
        );
      }
      return [...prev, { partId: partPick, quantity: qty }];
    });
    setPartPick(undefined);
    setPartQty("1");
  };

  const selectType = (v: string) => {
    setPendingType(v);
    // Prefill the IICL damage code from the chosen EIR damage type.
    if (DAMAGE_TYPE_TO_IICL[v]) setPendingIiclDamage(DAMAGE_TYPE_TO_IICL[v]);
  };

  const num = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const addItem = () => {
    if (!pendingCode || !pendingType) {
      toast.error("Pick a location and a damage type");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        damageType: pendingType,
        locationCode: pendingCode,
        repairMode: pendingMode,
        quantity: Math.max(1, Math.floor(Number(pendingQty) || 1)),
        note: pendingNote || undefined,
        parts: pendingParts,
        componentCode: pendingComponent ?? null,
        repairCode: pendingRepair ?? null,
        iiclDamageCode: pendingIiclDamage ?? null,
        iiclLocationCode: pendingIiclLoc ?? null,
        responsibility:
          pendingResp === NONE ? null : (pendingResp as Responsibility),
        grade: pendingGrade.trim() || null,
        lengthMm: num(pendingLength),
        widthMm: num(pendingWidth),
      },
    ]);
    setPendingType(undefined);
    setPendingMode("REPAIR");
    setPendingQty("1");
    setPendingNote("");
    setPendingCode(undefined);
    setPendingParts([]);
    setPartPick(undefined);
    setPartQty("1");
    setPendingComponent(undefined);
    setPendingRepair(undefined);
    setPendingIiclDamage(undefined);
    setPendingIiclLoc(undefined);
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
      toast.success(`Report No. ${report.reportNo} created`);
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
    if (items.length === 0) {
      toast.error("Add at least one damage item");
      return;
    }
    const payload: Record<string, unknown> = {
      ...form,
      shippingLineId: form.shippingLineId || null,
      items,
    };
    // Optional date fields must be omitted (not "") to pass validation.
    for (const k of ["eorDate", "estimateDate", "turnInDate", "onHireDate"]) {
      if (!payload[k]) delete payload[k];
    }
    // Numeric EOR fields: convert or omit when blank.
    for (const k of ["laborRate", "exchangeRate", "tareWeight", "grossWeight"]) {
      if (payload[k] === "" || payload[k] == null) delete payload[k];
      else payload[k] = Number(payload[k]);
    }
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
          <ContainerDiagram
            refs={refs}
            selected={pendingCode}
            marked={markedCodes}
            onSelect={setPendingCode}
          />

          <div className="space-y-3 rounded-md border p-4">
            <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
              <Field label="Damage type">
                <Select value={pendingType} onValueChange={selectType}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {refs.damageTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3 sm:items-end">
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
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={pendingQty}
                    onChange={(e) => setPendingQty(e.target.value)}
                  />
                </Field>
              </div>
            </div>
            <Field label="Note / Description of repair (optional)">
              <Input
                value={pendingNote}
                placeholder={pendingCode ? labelForCode(pendingCode) : "Pick a location on the diagram"}
                onChange={(e) => setPendingNote(e.target.value)}
              />
            </Field>

            {/* IICL repair coding — drives the Estimate of Repair (EOR) */}
            <div className="space-y-3 rounded-md border border-dashed p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                IICL repair coding (for EOR)
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Component code">
                  <Select value={pendingComponent} onValueChange={setPendingComponent}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {refs.componentCodes.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Repair code">
                  <Select value={pendingRepair} onValueChange={setPendingRepair}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {refs.repairCodes.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Damage code">
                  <Select value={pendingIiclDamage} onValueChange={setPendingIiclDamage}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {refs.damageCodes.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Location code">
                  <Select value={pendingIiclLoc} onValueChange={setPendingIiclLoc}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {refs.iiclLocationCodes.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            </div>

            {/* Parts used for this damage (optional) */}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <Field label="Part (optional)">
                <Select value={partPick} onValueChange={setPartPick}>
                  <SelectTrigger>
                    <SelectValue placeholder={parts?.length ? "Select a part…" : "No parts in catalog"} />
                  </SelectTrigger>
                  <SelectContent>
                    {parts?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatDual(p.currency, p.unitPrice)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Qty">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={partQty}
                  onChange={(e) => setPartQty(e.target.value)}
                  className="w-20"
                />
              </Field>
              <Button type="button" variant="outline" onClick={addPendingPart}>
                Add part
              </Button>
            </div>

            {pendingParts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingParts.map((p) => {
                  const cat = partById(p.partId);
                  return (
                    <Badge key={p.partId} variant="secondary" className="gap-1">
                      {cat?.name ?? "Part"} × {p.quantity}
                      <button
                        type="button"
                        onClick={() =>
                          setPendingParts((prev) =>
                            prev.filter((x) => x.partId !== p.partId),
                          )
                        }
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        title="Remove part"
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

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
                      <Badge>{labelForType(item.damageType)}</Badge>
                      <Badge variant="outline">
                        {item.repairMode === "REPLACE" ? "Replace" : "Repair"}
                        {(item.quantity ?? 1) > 1 ? ` ×${item.quantity}` : ""}
                      </Badge>
                      <span className="text-sm">
                        <span className="font-mono font-semibold">{item.locationCode}</span>{" "}
                        — {labelForCode(item.locationCode)}
                      </span>
                      {item.note && (
                        <span className="text-sm text-muted-foreground">· {item.note}</span>
                      )}
                    </div>
                    {item.parts && item.parts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {item.parts.map((p) => (
                          <span key={p.partId} className="text-xs text-muted-foreground">
                            + {partById(p.partId)?.name ?? "Part"} × {p.quantity}
                          </span>
                        ))}
                      </div>
                    )}
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
        <CardHeader>
          <CardTitle>EOR Details (optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="EOR No."><Input value={form.eorNo} onChange={(e) => set("eorNo", e.target.value)} /></Field>
          <Field label="EOR Date"><Input type="date" value={form.eorDate} onChange={(e) => set("eorDate", e.target.value)} /></Field>
          <Field label="Estimate Date"><Input type="date" value={form.estimateDate} onChange={(e) => set("estimateDate", e.target.value)} /></Field>
          <Field label="Labour Rate / h"><Input type="number" min="0" step="0.01" value={form.laborRate} onChange={(e) => set("laborRate", e.target.value)} /></Field>
          <Field label="Est. Currency"><Input value={form.estCurrency} onChange={(e) => set("estCurrency", e.target.value.toUpperCase())} /></Field>
          <Field label="Exchange Rate"><Input type="number" min="0" step="0.0001" value={form.exchangeRate} onChange={(e) => set("exchangeRate", e.target.value)} /></Field>
          <Field label="Size / Type"><Input value={form.sizeType} placeholder="e.g. 20DC" onChange={(e) => set("sizeType", e.target.value)} /></Field>
          <Field label="Depot Code"><Input value={form.depotCode} onChange={(e) => set("depotCode", e.target.value)} /></Field>
          <Field label="Depot Name"><Input value={form.depotName} onChange={(e) => set("depotName", e.target.value)} /></Field>
          <Field label="Ops Code"><Input value={form.opsCode} onChange={(e) => set("opsCode", e.target.value)} /></Field>
          <Field label="B/L No."><Input value={form.blNo} onChange={(e) => set("blNo", e.target.value)} /></Field>
          <Field label="Turn In Date"><Input type="date" value={form.turnInDate} onChange={(e) => set("turnInDate", e.target.value)} /></Field>
          <Field label="On-Hire Date"><Input type="date" value={form.onHireDate} onChange={(e) => set("onHireDate", e.target.value)} /></Field>
          <Field label="Tare Weight"><Input type="number" min="0" step="0.01" value={form.tareWeight} onChange={(e) => set("tareWeight", e.target.value)} /></Field>
          <Field label="Gross Weight"><Input type="number" min="0" step="0.01" value={form.grossWeight} onChange={(e) => set("grossWeight", e.target.value)} /></Field>
          <Field label="CSC Plate"><Input value={form.cscPlate} onChange={(e) => set("cscPlate", e.target.value)} /></Field>
          <Field label="Year Build"><Input value={form.yearBuild} onChange={(e) => set("yearBuild", e.target.value)} /></Field>
          <Field label="Unit Measure"><Input value={form.unitMeasure} onChange={(e) => set("unitMeasure", e.target.value)} /></Field>
          <Field label="Criteria"><Input value={form.criteria} onChange={(e) => set("criteria", e.target.value)} /></Field>
          <Field label="Customer"><Input value={form.customer} onChange={(e) => set("customer", e.target.value)} /></Field>
          <div className="sm:col-span-3">
            <Field label="Address"><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
          </div>
          <div className="sm:col-span-3">
            <Field label="EOR Note"><Input value={form.eorNote} onChange={(e) => set("eorNote", e.target.value)} /></Field>
          </div>
        </CardContent>
      </Card>

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
