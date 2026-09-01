"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Building2, ChevronRight, Globe, Pencil, Plus, Ship, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Agency, CreateRepairRateInput, RepairRate, Refs, ShippingLine } from "@/lib/types";
import { usePermissions } from "@/lib/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal, ConfirmDialog } from "@/components/ui/dialog";
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
const isNotFound = (e: Error) => /not found|\(404\)/i.test(e.message);

/** A rate's exact scope: an agency, a line, or the all-lines default. */
interface Scope {
  agencyId: string | null;
  shippingLineId: string | null;
}
const inScope = (r: RepairRate, s: Scope) =>
  (r.agencyId ?? null) === s.agencyId && (r.shippingLineId ?? null) === s.shippingLineId;

interface FormState {
  componentCode: string;
  repairCode: string;
  damageCode: string;
  grade: string;
  containerSize: string;
  shippingLineId: string;
  agencyId: string;
  laborHours: string;
  laborRate: string;
  materialCost: string;
  fullLength: string;
  fullWidth: string;
  currency: string;
  description: string;
}

const EMPTY: FormState = {
  componentCode: "",
  repairCode: "",
  damageCode: ANY,
  grade: "",
  containerSize: ANY,
  shippingLineId: ANY,
  agencyId: ANY,
  laborHours: "",
  laborRate: "",
  materialCost: "",
  fullLength: "",
  fullWidth: "",
  currency: "EGP",
  description: "",
};

function formFromRate(r: RepairRate): FormState {
  return {
    componentCode: r.componentCode,
    repairCode: r.repairCode,
    damageCode: r.damageCode ?? ANY,
    grade: r.grade ?? "",
    containerSize: r.containerSize ?? ANY,
    shippingLineId: r.shippingLineId ?? ANY,
    agencyId: r.agencyId ?? ANY,
    laborHours: r.laborHours == null ? "" : String(r.laborHours),
    laborRate: r.laborRate == null ? "" : String(r.laborRate),
    materialCost: r.materialCost == null ? "" : String(r.materialCost),
    fullLength: r.fullLengthMm == null ? "" : String(r.fullLengthMm),
    fullWidth: r.fullWidthMm == null ? "" : String(r.fullWidthMm),
    currency: r.currency ?? "EGP",
    description: r.description ?? "",
  };
}

function toInput(form: FormState): CreateRepairRateInput | null {
  if (!form.componentCode) return toast.error("Pick a component code"), null;
  if (!form.repairCode) return toast.error("Pick a repair code"), null;
  const material = toNum(form.materialCost || "0");
  if (Number.isNaN(material)) return toast.error("Enter a valid material cost"), null;
  const hours = toNum(form.laborHours || "0");
  if (Number.isNaN(hours)) return toast.error("Enter valid labour hours"), null;
  if (form.laborRate && Number.isNaN(toNum(form.laborRate)))
    return toast.error("Enter a valid labour rate"), null;
  if (
    (form.fullLength && Number.isNaN(toNum(form.fullLength))) ||
    (form.fullWidth && Number.isNaN(toNum(form.fullWidth)))
  )
    return toast.error("Enter a valid full size"), null;
  return {
    componentCode: form.componentCode,
    repairCode: form.repairCode,
    damageCode: form.damageCode === ANY ? null : form.damageCode,
    grade: form.grade.trim() || null,
    containerSize:
      form.containerSize === ANY
        ? null
        : (form.containerSize as CreateRepairRateInput["containerSize"]),
    shippingLineId: form.shippingLineId === ANY ? null : form.shippingLineId,
    agencyId: form.agencyId === ANY ? null : form.agencyId,
    laborHours: hours || 0,
    laborRate: form.laborRate ? toNum(form.laborRate) : null,
    materialCost: material,
    fullLengthMm: form.fullLength ? toNum(form.fullLength) : null,
    fullWidthMm: form.fullWidth ? toNum(form.fullWidth) : null,
    currency: form.currency,
    description: form.description.trim() || undefined,
  };
}

type Nav =
  | { level: "overview" }
  | { level: "all" }
  | { level: "agency"; agencyId: string }
  | { level: "line"; lineId: string; from: Nav };

export function RepairRates() {
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: api.refs });
  const { data: rates } = useQuery({
    queryKey: ["repair-rates"],
    queryFn: api.listRepairRates,
    refetchOnMount: "always",
  });
  const { data: shippingLines } = useQuery({
    queryKey: ["shipping-lines"],
    queryFn: api.listShippingLines,
  });
  const { data: agencies } = useQuery({
    queryKey: ["agencies"],
    queryFn: api.listAgencies,
  });

  const [nav, setNav] = useState<Nav>({ level: "overview" });
  const all = rates ?? [];

  const countScope = (s: Scope) => all.filter((r) => inScope(r, s)).length;
  const linesOf = (agencyId: string) =>
    (shippingLines ?? []).filter((l) => l.agencyId === agencyId);
  /** Lines not assigned to any agency — priced directly, no agency layer. */
  const looseLines = (shippingLines ?? []).filter((l) => !l.agencyId);

  // ---- Overview: All-lines default + a card per agency ----
  if (nav.level === "overview") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Rates match <strong>line → agency → all</strong>: a line&apos;s own rate
          wins, then its agency&apos;s shared rate, then the all-lines default.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <OverviewCard
            icon={<Globe className="size-4" />}
            title="All lines (default)"
            subtitle={
              countScope({ agencyId: null, shippingLineId: null })
                ? `${countScope({ agencyId: null, shippingLineId: null })} default rate(s)`
                : "No default rates"
            }
            empty={countScope({ agencyId: null, shippingLineId: null }) === 0}
            onClick={() => setNav({ level: "all" })}
          />
          {(agencies ?? []).map((a) => {
            const agencyRates = countScope({ agencyId: a.id, shippingLineId: null });
            const lines = linesOf(a.id);
            const lineRates = all.filter(
              (r) => r.shippingLineId && lines.some((l) => l.id === r.shippingLineId),
            ).length;
            return (
              <OverviewCard
                key={a.id}
                icon={<Building2 className="size-4" />}
                title={a.name}
                subtitle={`${agencyRates} agency-wide · ${lines.length} line(s) · ${lineRates} line rate(s)`}
                empty={agencyRates === 0 && lineRates === 0}
                onClick={() => setNav({ level: "agency", agencyId: a.id })}
              />
            );
          })}
        </div>
        {looseLines.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Lines without an agency</p>
            <p className="-mt-1 text-xs text-muted-foreground">
              These lines aren&apos;t under any agency. Their own rate wins, then
              the all-lines default.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {looseLines.map((l) => {
                const count = countScope({ agencyId: null, shippingLineId: l.id });
                return (
                  <OverviewCard
                    key={l.id}
                    icon={<Ship className="size-4" />}
                    title={l.name}
                    subtitle={count ? `${count} line rate(s)` : "Uses the all-lines default"}
                    empty={count === 0}
                    onClick={() =>
                      setNav({ level: "line", lineId: l.id, from: { level: "overview" } })
                    }
                  />
                );
              })}
            </div>
          </div>
        )}
        {(agencies ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            No agencies yet — add them on the Agencies page to scope rates per agency.
          </p>
        )}
      </div>
    );
  }

  // ---- All-lines default rates ----
  if (nav.level === "all") {
    return (
      <ScopedRates
        scope={{ agencyId: null, shippingLineId: null }}
        title="All lines (default)"
        icon={<Globe className="size-4 text-muted-foreground" />}
        rates={all.filter((r) => inScope(r, { agencyId: null, shippingLineId: null }))}
        refs={refs}
        agencies={agencies}
        shippingLines={shippingLines}
        onBack={() => setNav({ level: "overview" })}
      />
    );
  }

  // ---- Agency: agency-wide rates + its lines ----
  if (nav.level === "agency") {
    const agency = agencies?.find((a) => a.id === nav.agencyId);
    const scope: Scope = { agencyId: nav.agencyId, shippingLineId: null };
    const lines = linesOf(nav.agencyId);
    return (
      <div className="space-y-5">
        <ScopedRates
          scope={scope}
          title={`${agency?.name ?? "Agency"} — agency-wide`}
          subtitle="These rates apply to every line under this agency (unless a line overrides)."
          icon={<Building2 className="size-4 text-muted-foreground" />}
          rates={all.filter((r) => inScope(r, scope))}
          refs={refs}
          agencies={agencies}
          shippingLines={shippingLines}
          onBack={() => setNav({ level: "overview" })}
        />
        <div className="space-y-2">
          <p className="text-sm font-semibold">Lines under {agency?.name ?? "this agency"}</p>
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lines assigned to this agency yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lines.map((l) => {
                const count = countScope({ agencyId: null, shippingLineId: l.id });
                return (
                  <OverviewCard
                    key={l.id}
                    icon={<Ship className="size-4" />}
                    title={l.name}
                    subtitle={count ? `${count} line rate(s)` : "Uses agency-wide rates"}
                    empty={count === 0}
                    onClick={() => setNav({ level: "line", lineId: l.id, from: nav })}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Line-specific rates ----
  const line = shippingLines?.find((l) => l.id === nav.lineId);
  const scope: Scope = { agencyId: null, shippingLineId: nav.lineId };
  return (
    <ScopedRates
      scope={scope}
      title={line?.name ?? "Shipping line"}
      subtitle="Line-specific rates override the agency-wide and default rates."
      icon={<Ship className="size-4 text-muted-foreground" />}
      rates={all.filter((r) => inScope(r, scope))}
      refs={refs}
      agencies={agencies}
      shippingLines={shippingLines}
      onBack={() => setNav(nav.from)}
    />
  );
}

function OverviewCard({
  icon,
  title,
  subtitle,
  empty,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  empty: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-between gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {empty && (
          <Badge variant="outline" className="text-muted-foreground">Empty</Badge>
        )}
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

/** Create + list + edit/delete for rates at one exact scope. */
function ScopedRates({
  scope,
  title,
  subtitle,
  icon,
  rates,
  refs,
  agencies,
  shippingLines,
  onBack,
}: {
  scope: Scope;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  rates: RepairRate[];
  refs?: Refs;
  agencies?: Agency[];
  shippingLines?: ShippingLine[];
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [createForm, setCreateForm] = useState<FormState>(() => ({
    ...EMPTY,
    agencyId: scope.agencyId ?? ANY,
    shippingLineId: scope.shippingLineId ?? ANY,
  }));
  const [editing, setEditing] = useState<RepairRate | null>(null);
  const [deleting, setDeleting] = useState<RepairRate | null>(null);
  const setC = (k: keyof FormState, v: string) =>
    setCreateForm((f) => ({ ...f, [k]: v }));

  const componentLabel = useMemo(() => {
    const m = new Map(refs?.componentCodes.map((c) => [c.code, c.description]));
    return (code: string) => m.get(code) ?? "";
  }, [refs]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["repair-rates"] });

  const create = useMutation({
    mutationFn: (input: CreateRepairRateInput) => api.createRepairRate(input),
    onSuccess: () => {
      toast.success("Repair rate added");
      setCreateForm((f) => ({
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
    onSuccess: () => toast.success("Repair rate saved"),
    onError: (e: Error) =>
      isNotFound(e) ? toast.info("That rate was already removed — refreshing") : toast.error(e.message),
    onSettled: () => {
      setEditing(null);
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteRepairRate(id),
    onSuccess: () => toast.success("Repair rate deleted"),
    onError: (e: Error) =>
      isNotFound(e) ? toast.info("That rate was already deleted — refreshing") : toast.error(e.message),
    onSettled: () => {
      setDeleting(null);
      invalidate();
    },
  });

  const submitCreate = () => {
    // Lock the scope to this view (the agency/line selects are hidden here).
    const input = toInput({
      ...createForm,
      agencyId: scope.agencyId ?? ANY,
      shippingLineId: scope.shippingLineId ?? ANY,
    });
    if (input) create.mutate(input);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold">{title}</h2>
          <Badge variant="secondary">{rates.length} rate{rates.length === 1 ? "" : "s"}</Badge>
        </div>
      </div>
      {subtitle && <p className="-mt-2 text-sm text-muted-foreground">{subtitle}</p>}

      {can("iicl:create") && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <RateFormFields form={createForm} set={setC} refs={refs} />
            <div className="flex justify-end">
              <Button onClick={submitCreate} disabled={create.isPending}>
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
                  <TableHead className="text-right">Hrs</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Material</TableHead>
                  <TableHead className="text-right">Full L×W</TableHead>
                  <TableHead>Cur.</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                      No rates here yet. Add one above.
                    </TableCell>
                  </TableRow>
                )}
                {rates.map((r) => (
                  <RateRow
                    key={r.id}
                    rate={r}
                    componentLabel={componentLabel(r.componentCode)}
                    canEdit={can("iicl:edit")}
                    canDelete={can("iicl:delete")}
                    onEdit={() => setEditing(r)}
                    onDelete={() => setDeleting(r)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <EditRateModal
          key={editing.id}
          rate={editing}
          refs={refs}
          agencies={agencies}
          shippingLines={shippingLines}
          pending={update.isPending}
          onClose={() => setEditing(null)}
          onSave={(input) => update.mutate({ id: editing.id, input })}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        pending={remove.isPending}
        title="Delete repair rate?"
        description="This removes the rate from the EOR pricing catalog. This cannot be undone."
      >
        {deleting && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <span className="font-mono font-semibold">{deleting.componentCode}</span>
            {" · "}
            <span className="font-mono">{deleting.repairCode}</span>
            {deleting.damageCode ? ` · ${deleting.damageCode}` : ""}
            {deleting.grade ? ` · grade ${deleting.grade}` : ""}
            {" — "}
            {deleting.materialCost} {deleting.currency}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

function EditRateModal({
  rate,
  refs,
  agencies,
  shippingLines,
  pending,
  onClose,
  onSave,
}: {
  rate: RepairRate;
  refs?: Refs;
  agencies?: Agency[];
  shippingLines?: ShippingLine[];
  pending: boolean;
  onClose: () => void;
  onSave: (input: CreateRepairRateInput) => void;
}) {
  const [form, setForm] = useState<FormState>(() => formFromRate(rate));
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    const input = toInput(form);
    if (input) onSave(input);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit repair rate"
      description="Update any field — including whether it's scoped to an agency or a specific line."
      className="max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <RateFormFields form={form} set={set} refs={refs} agencies={agencies} shippingLines={shippingLines} />
    </Modal>
  );
}

/**
 * Rate inputs. The agency + shipping-line selects only render when their arrays
 * are provided (the edit modal passes them; the per-scope create card omits
 * them because the scope is fixed by which card you opened).
 */
function RateFormFields({
  form,
  set,
  refs,
  agencies,
  shippingLines,
}: {
  form: FormState;
  set: (k: keyof FormState, v: string) => void;
  refs?: Refs;
  agencies?: Agency[];
  shippingLines?: ShippingLine[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Component *">
          <Select value={form.componentCode} onValueChange={(v) => set("componentCode", v)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {refs?.componentCodes.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.code} — {c.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Repair *">
          <Select value={form.repairCode} onValueChange={(v) => set("repairCode", v)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {refs?.repairCodes.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.code} — {c.description}</SelectItem>
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
                <SelectItem key={c.code} value={c.code}>{c.code} — {c.description}</SelectItem>
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
        {agencies && (
          <Field label="Agency scope">
            <Select value={form.agencyId} onValueChange={(v) => set("agencyId", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>No agency</SelectItem>
                {agencies.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {shippingLines && (
          <Field label="Line scope">
            <Select value={form.shippingLineId} onValueChange={(v) => set("shippingLineId", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All lines</SelectItem>
                {shippingLines.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
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
        partial damage by area — e.g. a 120×116 dent on a 240×116 panel is charged
        half. Leave the full size blank to always charge the full price.
      </p>
      <Field label="Description (optional)">
        <Input value={form.description} placeholder="Description of repair" onChange={(e) => set("description", e.target.value)} />
      </Field>
    </div>
  );
}

function RateRow({
  rate,
  componentLabel,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  rate: RepairRate;
  componentLabel: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const fullSize =
    rate.fullLengthMm != null && rate.fullWidthMm != null
      ? `${rate.fullLengthMm} × ${rate.fullWidthMm}`
      : "—";

  return (
    <TableRow>
      <TableCell className="font-mono font-semibold" title={componentLabel}>{rate.componentCode}</TableCell>
      <TableCell className="font-mono">{rate.repairCode}</TableCell>
      <TableCell className="font-mono text-muted-foreground">{rate.damageCode ?? "—"}</TableCell>
      <TableCell>{rate.grade ?? "—"}</TableCell>
      <TableCell>{rate.containerSize ? `${rate.containerSize}'` : "All"}</TableCell>
      <TableCell className="text-right tabular-nums">{rate.laborHours}</TableCell>
      <TableCell className="text-right tabular-nums">{rate.laborRate ?? "—"}</TableCell>
      <TableCell className="text-right tabular-nums">{rate.materialCost}</TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">{fullSize}</TableCell>
      <TableCell>{rate.currency}</TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {canEdit && (
            <Button variant="ghost" size="icon" onClick={onEdit} title="Edit rate">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} title="Delete rate">
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
