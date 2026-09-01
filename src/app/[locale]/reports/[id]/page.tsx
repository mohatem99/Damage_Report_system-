"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Download, Mail, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import type { DamageReport } from "@/lib/types";
import { usePermissions } from "@/lib/use-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeCombo } from "@/components/iicl/code-combo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TYPE_LABELS: Record<string, string> = {
  STANDARD: "Standard",
  HIGH_CUBE: "High Cube",
  REEFER: "Reefer",
  OPEN_TOP: "Open Top",
  TANK: "Tank",
  FLAT_RACK: "Flat Rack",
};

const cur = (currency: string, n: number) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const { can } = usePermissions();
  const [emailDoc, setEmailDoc] = useState<"eir" | "eor" | null>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => api.getReport(id),
  });
  const { data: refs } = useQuery({ queryKey: ["refs"], queryFn: api.refs });
  const { data: eor } = useQuery({
    queryKey: ["report-eor", id],
    queryFn: () => api.getReportEor(id),
  });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadAttachment(id, file),
    onSuccess: () => {
      toast.success("Photo uploaded");
      qc.invalidateQueries({ queryKey: ["report", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePhoto = useMutation({
    mutationFn: (attId: string) => api.deleteAttachment(attId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report", id] }),
  });

  const removeReport = useMutation({
    mutationFn: () => api.deleteReport(id),
    onSuccess: () => {
      toast.success("Report deleted");
      router.push("/reports");
    },
  });

  if (isLoading || !report) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const labelForType = (v: string) =>
    refs?.damageTypes.find((t) => t.value === v)?.label ?? v;
  const labelForCode = (c: string) =>
    refs?.locationCodes.find((l) => l.code === c)?.label ?? c;
  const labelForComponent = (c: string) =>
    refs?.componentCodes.find((k) => k.code === c)?.description ?? c;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-sm text-muted-foreground hover:underline">
            ← Back to reports
          </Link>
          <h1 className="text-2xl font-bold">
            Report No. {report.reportNoFormatted ?? report.reportNo}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={api.withToken(api.reportPdfUrl(report.id), token)} target="_blank" rel="noreferrer">
              <Download /> Damage PDF
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={api.withToken(api.reportEorPdfUrl(report.id), token)} target="_blank" rel="noreferrer">
              <Download /> EOR PDF
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={api.withToken(api.reportEorExcelUrl(report.id), token)} target="_blank" rel="noreferrer">
              <Download /> EOR Excel
            </a>
          </Button>
          <Button variant="outline" onClick={() => setEmailDoc("eir")}>
            <Mail /> Email EIR
          </Button>
          <Button variant="outline" onClick={() => setEmailDoc("eor")}>
            <Mail /> Email EOR
          </Button>
          {can("reports:delete") && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this report? This cannot be undone.")) {
                  removeReport.mutate();
                }
              }}
            >
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Detail label="Date" value={report.reportDate} />
          <Detail label="Container Number" value={report.containerNumber} />
          <Detail label="Truck Company" value={report.truckCompany || "-"} />
          <Detail label="Truck No." value={report.truckNumber || "-"} />
          <Detail label="Size" value={`${report.containerSize}'`} />
          <Detail label="Status" value={report.containerStatus} />
          <Detail label="Type" value={TYPE_LABELS[report.containerType] ?? report.containerType} />
          <Detail label="Shipping Line" value={report.shippingLine?.name || "-"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Damage Items ({report.items.length})</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {report.items.map((item) => (
              <li key={item.id} className="space-y-1 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {item.repairMode === "REPLACE" ? "Replace" : "Repair"}
                    {(item.quantity ?? 1) > 1 ? ` ×${item.quantity}` : ""}
                  </Badge>
                  {item.componentCode ? (
                    <>
                      <CodeCombo item={item} />
                      <span className="text-sm text-muted-foreground">
                        {labelForComponent(item.componentCode)}
                      </span>
                    </>
                  ) : (
                    <>
                      {item.damageType && <Badge>{labelForType(item.damageType)}</Badge>}
                      {item.locationCode && (
                        <span className="text-sm">
                          <span className="font-mono font-semibold">{item.locationCode}</span> — {labelForCode(item.locationCode)}
                        </span>
                      )}
                    </>
                  )}
                  {item.note && <span className="text-sm text-muted-foreground">· {item.note}</span>}
                </div>
                {(item.panelPosition != null || item.responsibility) && (
                  <div className="flex flex-wrap gap-1.5 pl-1 text-xs text-muted-foreground">
                    {item.panelPosition != null && (
                      <span className="font-mono">Panel #{item.panelPosition}</span>
                    )}
                    {item.responsibility && (
                      <span className="font-mono">
                        Prty {item.responsibility === "OWNER" ? "O" : "U"}
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {eor && eor.lines.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Estimate of Repair (EOR)</CardTitle>
            <span className="text-lg font-bold">{cur(eor.currency, eor.total)}</span>
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
                    <th className="py-1.5 pr-2 font-medium">Description</th>
                    <th className="py-1.5 pr-2 text-center font-medium">Prty</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Qty</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Hrs</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Labor</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Material</th>
                    <th className="py-1.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {eor.lines.map((l) => (
                    <tr key={l.no} className="border-b last:border-0">
                      <td className="py-1.5 pr-2 text-muted-foreground">{l.no}</td>
                      <td className="py-1.5 pr-2 font-mono">{l.componentCode || "—"}</td>
                      <td className="py-1.5 pr-2 font-mono">{l.locationCode || "—"}</td>
                      <td className="py-1.5 pr-2 font-mono">{l.damageCode || "—"}</td>
                      <td className="py-1.5 pr-2 font-mono">{l.repairCode || "—"}</td>
                      <td className="py-1.5 pr-2">{l.description || "—"}</td>
                      <td className="py-1.5 pr-2 text-center">
                        {l.prty ? (
                          <Badge variant="outline" className="text-[10px]">{l.prty}</Badge>
                        ) : "—"}
                      </td>
                      <td className="py-1.5 pr-2 text-right">{l.quantity}</td>
                      <td className="py-1.5 pr-2 text-right">{l.hours || "—"}</td>
                      <td className="py-1.5 pr-2 text-right">{cur(eor.currency, l.laborCost)}</td>
                      <td className="py-1.5 pr-2 text-right">
                        {cur(eor.currency, l.materialCost)}
                        {l.areaFactor < 1 && (
                          <span
                            className="ml-1 text-[10px] text-muted-foreground"
                            title="Material prorated to the damaged area of the full component"
                          >
                            ({Math.round(l.areaFactor * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 text-right font-medium">{cur(eor.currency, l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-0.5 border-t pt-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Labour subtotal</span>
                <span>{cur(eor.currency, eor.laborTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Material subtotal</span>
                <span>{cur(eor.currency, eor.materialTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>User (U) subtotal</span>
                <span>{cur(eor.currency, eor.userTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Owner (O) subtotal</span>
                <span>{cur(eor.currency, eor.ownerTotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Total estimate</span>
                <span>{cur(eor.currency, eor.total)}</span>
              </div>
            </div>
            {eor.unpricedCount > 0 && (
              <p className="text-sm text-destructive">
                {eor.unpricedCount} line(s) have no matching repair rate and price
                at 0.{" "}
                <Link href="/iicl" className="underline">
                  Add repair rates
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {report.inspectionNotes && (
        <Card>
          <CardHeader><CardTitle>Inspection Description</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">
            {report.inspectionNotes}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Photos ({report.attachments.length})</CardTitle>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
          {can("reports:edit") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={upload.isPending}
            >
              <Upload /> {upload.isPending ? "Uploading…" : "Add photo"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {report.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos attached.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {report.attachments.map((att) => (
                <div key={att.id} className="group relative overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={att.url ?? api.uploadUrl(att.fileName)}
                    alt={att.originalName}
                    className="aspect-square w-full object-cover"
                  />
                  {can("reports:edit") && (
                    <button
                      onClick={() => removePhoto.mutate(att.id)}
                      className="absolute right-1 top-1 rounded-md bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      title="Remove photo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sign-off</CardTitle></CardHeader>
        <CardContent className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Detail label="OP. Shift Supervisor" value={report.supervisorName || "-"} />
          <Detail label="Trucker" value={report.truckerName || "-"} />
          <Detail label="Truck CO." value={report.truckCoName || "-"} />
          <Detail label="Shipper" value={report.shipperName || "-"} />
        </CardContent>
      </Card>

      {emailDoc && (
        <EmailReportDialog
          report={report}
          document={emailDoc}
          onClose={() => setEmailDoc(null)}
        />
      )}
    </div>
  );
}

const DOC_LABEL: Record<"eir" | "eor", string> = {
  eir: "Damage Report (EIR)",
  eor: "Estimate of Repair (EOR)",
};

function EmailReportDialog({
  report,
  document,
  onClose,
}: {
  report: DamageReport;
  document: "eir" | "eor";
  onClose: () => void;
}) {
  const line = report.shippingLine;
  const [to, setTo] = useState(line?.contactEmail ?? "");
  const [cc, setCc] = useState(line?.emailCc ?? "");
  const [subject, setSubject] = useState(
    `${DOC_LABEL[document]} — Container ${report.containerNumber} (Report No. ${report.reportNoFormatted ?? report.reportNo})`,
  );
  const [message, setMessage] = useState(
    line?.contactName ? `Dear ${line.contactName},\n\n` : "",
  );

  const send = useMutation({
    mutationFn: () =>
      api.sendReportEmail(report.id, {
        document,
        to: to.trim() || undefined,
        cc: cc.trim() || undefined,
        subject: subject.trim() || undefined,
        message: message.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(`Email sent to ${res.to}`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Email ${DOC_LABEL[document]}`}
      className="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!to.trim()) return toast.error("Enter a recipient email");
              send.mutate();
            }}
            disabled={send.isPending}
          >
            <Mail /> {send.isPending ? "Sending…" : "Send email"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {!line?.contactEmail && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
            This report&apos;s shipping line has no contact email. Enter a
            recipient below, or set one on the{" "}
            <Link href="/shipping-lines" className="underline">
              shipping line
            </Link>
            .
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email-to">To</Label>
          <Input
            id="email-to"
            type="email"
            value={to}
            placeholder="recipient@carrier.com"
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email-cc">CC (comma-separated)</Label>
          <Input
            id="email-cc"
            value={cc}
            placeholder="a@x.com, b@y.com"
            onChange={(e) => setCc(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email-subject">Subject</Label>
          <Input
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email-message">Message</Label>
          <Textarea
            id="email-message"
            rows={4}
            value={message}
            placeholder="Optional note to include above the report details."
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          The {DOC_LABEL[document]} PDF is attached automatically.
        </p>
      </div>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
