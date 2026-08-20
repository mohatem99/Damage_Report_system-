"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CreateRepairRateInput, RepairRate } from "@/lib/types";
import { usePermissions } from "@/lib/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ANY = "__any__";
const CURRENCIES = ["EGP", "USD", "EUR", "AED", "SAR"];
const toNum = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
};

export function RepairRates() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: api.refs });
  const { data: rates, isLoading } = useQuery({
    queryKey: ["repair-rates"],
    queryFn: api.listRepairRates,
  });
  const { data: shippingLines } = useQuery({
    queryKey: ["shipping-lines"],
    queryFn: api.listShippingLines,
  });

  const [form, setForm] = useState({
    componentCode: "",
    repairCode: "",
    damageCode: ANY,
    grade: "",
    containerSize: ANY,
    shippingLineId: ANY,
    laborHours: "",
    laborRate: "",
    materialCost: "",
    fullLength: "",
    fullWidth: "",
    currency: "EGP",
    description: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const componentLabel = useMemo(() => {
    const m = new Map(refs?.componentCodes.map((c) => [c.code, c.description]));
    return (code: string) => m.get(code) ?? "";
  }, [refs]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["repair-rates"] });

  const create = useMutation({
    mutationFn: (input: CreateRepairRateInput) => api.createRepairRate(input),
    onSuccess: () => {
      toast.success("Repair rate added");
      setForm((f) => ({
        ...f,
        materialCost: "",
        laborHours: "",
        laborRate: "",
        fullLength: "",
        fullWidth: "",
        description: "",
      }));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateRepairRateInput> }) =>
      api.updateRepairRate(id, input),
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteRepairRate(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.componentCode) return toast.error("Pick a component code");
    if (!form.repairCode) return toast.error("Pick a repair code");
    const material = toNum(form.materialCost || "0");
    if (Number.isNaN(material)) return toast.error("Enter a valid material cost");
    create.mutate({
      componentCode: form.componentCode,
      repairCode: form.repairCode,
      damageCode: form.damageCode === ANY ? null : form.damageCode,
      grade: form.grade.trim() || null,
      containerSize:
        form.containerSize === ANY
          ? null
          : (form.containerSize as CreateRepairRateInput["containerSize"]),
      shippingLineId: form.shippingLineId === ANY ? null : form.shippingLineId,
      laborHours: toNum(form.laborHours || "0") || 0,
      laborRate: form.laborRate ? toNum(form.laborRate) : null,
      materialCost: material,
      fullLengthMm: form.fullLength ? toNum(form.fullLength) : null,
      fullWidthMm: form.fullWidth ? toNum(form.fullWidth) : null,
      currency: form.currency,
      description: form.description.trim() || undefined,
    });
  };

  const lineName = (id?: string | null) =>
    id ? shippingLines?.find((l) => l.id === id)?.name ?? "—" : "All";

  return (
    <div className="space-y-4">
      {can("iicl:create") && (
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Component *">
              <Select value={form.componentCode} onValueChange={(v) => set("componentCode", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {refs?.componentCodes.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Repair *">
              <Select value={form.repairCode} onValueChange={(v) => set("repairCode", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {refs?.repairCodes.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Damage (optional)">
              <Select value={form.damageCode} onValueChange={(v) => set("damageCode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any damage</SelectItem>
                  {refs?.damageCodes.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Grade (optional)">
              <Input value={form.grade} placeholder="A / B / C" onChange={(e) => set("grade", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Container size">
              <Select value={form.containerSize} onValueChange={(v) => set("containerSize", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>All sizes</SelectItem>
                  {refs?.containerSizes.map((s) => (
                    <SelectItem key={s} value={s}>{s}&apos;</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Shipping line">
              <Select value={form.shippingLineId} onValueChange={(v) => set("shippingLineId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>All lines</SelectItem>
                  {shippingLines?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Labour hrs">
              <Input type="number" min="0" step="0.01" value={form.laborHours} placeholder="0" onChange={(e) => set("laborHours", e.target.value)} />
            </Field>
            <Field label="Labour rate (optional)">
              <Input type="number" min="0" step="0.01" value={form.laborRate} placeholder="report rate" onChange={(e) => set("laborRate", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Material cost *">
              <Input type="number" min="0" step="0.01" value={form.materialCost} placeholder="0.00" onChange={(e) => set("materialCost", e.target.value)} />
            </Field>
            <Field label="Currency">
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Full length">
              <Input type="number" min="0" step="0.01" value={form.fullLength} placeholder="whole panel" onChange={(e) => set("fullLength", e.target.value)} />
            </Field>
            <Field label="Full width">
              <Input type="number" min="0" step="0.01" value={form.fullWidth} placeholder="whole panel" onChange={(e) => set("fullWidth", e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Material cost is the price for the <strong>whole component</strong>. Set
            its full length &amp; width (same unit you enter damage size in) to bill
            partial damage by area — e.g. a 120×116 dent on a 240×116 panel is
            charged half. Leave the full size blank to always charge the full price.
          </p>
          <div className="grid gap-3">
            <Field label="Description (optional)">
              <Input value={form.description} placeholder="Description of repair" onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={create.isPending}>
              <Plus /> Add rate
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comp</TableHead>
                  <TableHead>Rep</TableHead>
                  <TableHead>Dmg</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead className="text-right">Hrs</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Material</TableHead>
                  <TableHead className="text-right">Full L×W</TableHead>
                  <TableHead>Cur.</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                )}
                {rates?.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                      No repair rates yet. Import the price lists or add rates above.
                    </TableCell>
                  </TableRow>
                )}
                {rates?.map((r) => (
                  <RateRow
                    key={r.id}
                    rate={r}
                    componentLabel={componentLabel(r.componentCode)}
                    lineName={lineName(r.shippingLineId)}
                    canEdit={can("iicl:edit")}
                    canDelete={can("iicl:delete")}
                    onSave={(input) => update.mutate({ id: r.id, input })}
                    onDelete={() => remove.mutate(r.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RateRow({
  rate,
  componentLabel,
  lineName,
  canEdit,
  canDelete,
  onSave,
  onDelete,
}: {
  rate: RepairRate;
  componentLabel: string;
  lineName: string;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (input: Partial<CreateRepairRateInput>) => void;
  onDelete: () => void;
}) {
  const [hours, setHours] = useState(String(rate.laborHours));
  const [ratePerH, setRatePerH] = useState(rate.laborRate == null ? "" : String(rate.laborRate));
  const [material, setMaterial] = useState(String(rate.materialCost));
  const [fullL, setFullL] = useState(rate.fullLengthMm == null ? "" : String(rate.fullLengthMm));
  const [fullW, setFullW] = useState(rate.fullWidthMm == null ? "" : String(rate.fullWidthMm));
  const dirty =
    Number(hours) !== Number(rate.laborHours) ||
    Number(material) !== Number(rate.materialCost) ||
    (ratePerH === "" ? rate.laborRate != null : Number(ratePerH) !== Number(rate.laborRate)) ||
    (fullL === "" ? rate.fullLengthMm != null : Number(fullL) !== Number(rate.fullLengthMm)) ||
    (fullW === "" ? rate.fullWidthMm != null : Number(fullW) !== Number(rate.fullWidthMm));

  const save = () => {
    const h = toNum(hours || "0");
    const m = toNum(material || "0");
    if (Number.isNaN(h) || Number.isNaN(m)) return toast.error("Enter valid numbers");
    if ((fullL !== "" && Number.isNaN(toNum(fullL))) || (fullW !== "" && Number.isNaN(toNum(fullW)))) {
      return toast.error("Enter a valid full size");
    }
    onSave({
      laborHours: h,
      materialCost: m,
      laborRate: ratePerH === "" ? null : toNum(ratePerH),
      fullLengthMm: fullL === "" ? null : toNum(fullL),
      fullWidthMm: fullW === "" ? null : toNum(fullW),
    });
  };

  return (
    <TableRow>
      <TableCell className="font-mono font-semibold" title={componentLabel}>{rate.componentCode}</TableCell>
      <TableCell className="font-mono">{rate.repairCode}</TableCell>
      <TableCell className="font-mono text-muted-foreground">{rate.damageCode ?? "—"}</TableCell>
      <TableCell>{rate.grade ?? "—"}</TableCell>
      <TableCell>{rate.containerSize ? `${rate.containerSize}'` : "All"}</TableCell>
      <TableCell>{lineName}</TableCell>
      <TableCell className="text-right">
        <Input value={hours} disabled={!canEdit} onChange={(e) => setHours(e.target.value)} type="number" min="0" step="0.01" className="h-8 w-16 text-right" />
      </TableCell>
      <TableCell className="text-right">
        <Input value={ratePerH} disabled={!canEdit} onChange={(e) => setRatePerH(e.target.value)} type="number" min="0" step="0.01" placeholder="—" className="h-8 w-16 text-right" />
      </TableCell>
      <TableCell className="text-right">
        <Input value={material} disabled={!canEdit} onChange={(e) => setMaterial(e.target.value)} type="number" min="0" step="0.01" className="h-8 w-20 text-right" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Input value={fullL} disabled={!canEdit} onChange={(e) => setFullL(e.target.value)} type="number" min="0" step="0.01" placeholder="—" className="h-8 w-16 text-right" />
          <span className="text-muted-foreground">×</span>
          <Input value={fullW} disabled={!canEdit} onChange={(e) => setFullW(e.target.value)} type="number" min="0" step="0.01" placeholder="—" className="h-8 w-16 text-right" />
        </div>
      </TableCell>
      <TableCell>{rate.currency}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {canEdit && dirty && (
            <Button size="sm" variant="secondary" onClick={save}>Save</Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this rate?")) onDelete(); }}>
              <Trash2 className="text-destructive" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
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
