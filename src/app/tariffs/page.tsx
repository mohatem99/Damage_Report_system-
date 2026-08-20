"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";
import { formatDual } from "@/lib/money";
import type { CreateTariffInput, Tariff } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ALL_SIZES = "__all__";
const ALL_LINES = "__all__";
const CURRENCIES = ["USD", "EGP", "EUR", "AED", "SAR"];

/** The five numeric fields that make up a rate, with their form labels. */
const RATE_FIELDS = [
  { key: "laborRate", label: "Labour rate / h" },
  { key: "repairHours", label: "Repair hrs" },
  { key: "repairMaterial", label: "Repair material" },
  { key: "replaceHours", label: "Replace hrs" },
  { key: "replaceMaterial", label: "Replace material" },
] as const;

type RateKey = (typeof RATE_FIELDS)[number]["key"];
type RateValues = Record<RateKey, string>;

const EMPTY_RATES: RateValues = {
  laborRate: "",
  repairHours: "",
  repairMaterial: "",
  replaceHours: "",
  replaceMaterial: "",
};

const toNum = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
};

export default function TariffsPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: api.refs });
  const { data: tariffs, isLoading } = useQuery({
    queryKey: ["tariffs"],
    queryFn: api.listTariffs,
  });
  const { data: shippingLines } = useQuery({
    queryKey: ["shipping-lines"],
    queryFn: api.listShippingLines,
  });

  const [damageType, setDamageType] = useState<string>();
  const [size, setSize] = useState<string>(ALL_SIZES);
  const [line, setLine] = useState<string>(ALL_LINES);
  const [rates, setRates] = useState<RateValues>(EMPTY_RATES);
  const [currency, setCurrency] = useState("USD");

  const lineName = (id?: string | null) =>
    id ? shippingLines?.find((l) => l.id === id)?.name ?? "—" : "All lines";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tariffs"] });

  const create = useMutation({
    mutationFn: (input: CreateTariffInput) => api.createTariff(input),
    onSuccess: () => {
      toast.success("Tariff added");
      setDamageType(undefined);
      setRates(EMPTY_RATES);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateTariffInput> }) =>
      api.updateTariff(id, input),
    onSuccess: () => {
      toast.success("Tariff updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteTariff(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const labelForType = (v: string) =>
    refs?.damageTypes.find((t) => t.value === v)?.label ?? v;

  const submit = () => {
    if (!damageType) return toast.error("Pick a damage type");
    const nums = {} as Record<RateKey, number>;
    for (const { key, label } of RATE_FIELDS) {
      const n = toNum(rates[key] || "0");
      if (Number.isNaN(n)) return toast.error(`Enter a valid ${label.toLowerCase()}`);
      nums[key] = n;
    }
    create.mutate({
      damageType,
      containerSize: size === ALL_SIZES ? null : (size as CreateTariffInput["containerSize"]),
      shippingLineId: line === ALL_LINES ? null : line,
      currency,
      ...nums,
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Repair Tariff</h1>
        <p className="text-sm text-muted-foreground">
          Define a labour rate per man-hour plus the standard hours and material
          for repairing vs. replacing each damage type. Estimates multiply these
          by the damage item&apos;s quantity and chosen mode. Leave size or
          shipping line as “All” for a default rate, or set a specific one that
          overrides it — the most specific match wins.
        </p>
      </div>

      {can("tariffs:create") && (
      <Card>
        <CardHeader>
          <CardTitle>Add a rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Damage type</Label>
              <Select value={damageType} onValueChange={setDamageType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {refs?.damageTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Container size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SIZES}>All sizes</SelectItem>
                  {refs?.containerSizes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}&apos;
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Shipping line</Label>
              <Select value={line} onValueChange={setLine}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_LINES}>All lines</SelectItem>
                  {shippingLines?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {RATE_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rates[f.key]}
                  placeholder="0.00"
                  onChange={(e) =>
                    setRates((r) => ({ ...r, [f.key]: e.target.value }))
                  }
                />
              </div>
            ))}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Damage Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Shipping Line</TableHead>
                <TableHead className="text-right">Rate / h</TableHead>
                <TableHead className="text-right">Repair h</TableHead>
                <TableHead className="text-right">Repair mat.</TableHead>
                <TableHead className="text-right">Replace h</TableHead>
                <TableHead className="text-right">Replace mat.</TableHead>
                <TableHead>Cur.</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {tariffs?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    No tariffs yet. Add rates above so reports can be costed.
                  </TableCell>
                </TableRow>
              )}
              {tariffs?.map((t) => (
                <TariffRow
                  key={t.id}
                  tariff={t}
                  label={labelForType(t.damageType)}
                  lineLabel={t.shippingLine?.name ?? lineName(t.shippingLineId)}
                  canEdit={can("tariffs:edit")}
                  canDelete={can("tariffs:delete")}
                  onSave={(input) => update.mutate({ id: t.id, input })}
                  onDelete={() => remove.mutate(t.id)}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TariffRow({
  tariff,
  label,
  lineLabel,
  canEdit,
  canDelete,
  onSave,
  onDelete,
}: {
  tariff: Tariff;
  label: string;
  lineLabel: string;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (input: Partial<CreateTariffInput>) => void;
  onDelete: () => void;
}) {
  const initial: RateValues = {
    laborRate: String(tariff.laborRate),
    repairHours: String(tariff.repairHours),
    repairMaterial: String(tariff.repairMaterial),
    replaceHours: String(tariff.replaceHours),
    replaceMaterial: String(tariff.replaceMaterial),
  };
  const [values, setValues] = useState<RateValues>(initial);
  const dirty = RATE_FIELDS.some(
    (f) => Number(values[f.key]) !== Number(initial[f.key]),
  );

  const cell = (key: RateKey, isMoney = false) => (
    <TableCell className="text-right">
      <Input
        type="number"
        min="0"
        step="0.01"
        value={values[key]}
        disabled={!canEdit}
        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
        className="h-8 w-20 text-right"
      />
      {isMoney && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {formatDual(tariff.currency, Number(values[key]) || 0)}
        </div>
      )}
    </TableCell>
  );

  const save = () => {
    const input = {} as Record<RateKey, number>;
    for (const { key, label: fl } of RATE_FIELDS) {
      const n = toNum(values[key] || "0");
      if (Number.isNaN(n)) return toast.error(`Enter a valid ${fl.toLowerCase()}`);
      input[key] = n;
    }
    onSave(input);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell>{tariff.containerSize ? `${tariff.containerSize}'` : "All sizes"}</TableCell>
      <TableCell>{lineLabel}</TableCell>
      {cell("laborRate", true)}
      {cell("repairHours")}
      {cell("repairMaterial", true)}
      {cell("replaceHours")}
      {cell("replaceMaterial", true)}
      <TableCell>{tariff.currency}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {canEdit && dirty && (
            <Button size="sm" variant="secondary" onClick={save}>
              Save
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm("Delete this tariff?")) onDelete();
              }}
            >
              <Trash2 className="text-destructive" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
