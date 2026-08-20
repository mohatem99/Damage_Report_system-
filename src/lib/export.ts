import type { DamageReport } from "./types";

// xlsx and jspdf are heavy; load them on demand (export click) so they stay
// out of the initial /reports bundle.

const TYPE_LABELS: Record<string, string> = {
  STANDARD: "Standard",
  HIGH_CUBE: "High Cube",
  REEFER: "Reefer",
  OPEN_TOP: "Open Top",
  TANK: "Tank",
  FLAT_RACK: "Flat Rack",
};

/** Columns used for spreadsheet / PDF exports (label + value extractor). */
const EXPORT_COLUMNS: { header: string; value: (r: DamageReport) => string | number }[] = [
  { header: "Report No.", value: (r) => r.reportNo },
  { header: "Date", value: (r) => r.reportDate },
  { header: "Container Number", value: (r) => r.containerNumber },
  { header: "Truck Company", value: (r) => r.truckCompany || "" },
  { header: "Truck No.", value: (r) => r.truckNumber || "" },
  { header: "Size", value: (r) => `${r.containerSize}'` },
  { header: "Status", value: (r) => r.containerStatus },
  { header: "Type", value: (r) => TYPE_LABELS[r.containerType] ?? r.containerType },
  { header: "Damages", value: (r) => r.itemCount ?? r.items?.length ?? 0 },
  { header: "Photos", value: (r) => r.attachmentCount ?? r.attachments?.length ?? 0 },
];

function timestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

/** Export the given reports to an .xlsx file and trigger a browser download. */
export async function exportReportsToExcel(
  reports: DamageReport[],
  fileName = `damage-reports-${timestamp()}.xlsx`,
): Promise<void> {
  const XLSX = await import("xlsx");
  const header = EXPORT_COLUMNS.map((c) => c.header);
  const rows = reports.map((r) => EXPORT_COLUMNS.map((c) => c.value(r)));

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = EXPORT_COLUMNS.map((c) => ({
    wch: Math.max(
      c.header.length,
      ...reports.map((r) => String(c.value(r)).length),
      8,
    ) + 2,
  }));
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: reports.length, c: EXPORT_COLUMNS.length - 1 },
    }),
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Damage Reports");
  XLSX.writeFile(wb, fileName);
}

/** Export the given reports to a landscape PDF table and trigger a download. */
export async function exportReportsToPdf(
  reports: DamageReport[],
  fileName = `damage-reports-${timestamp()}.pdf`,
): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("EGYPT TO OUTSIDE TRADING", 40, 40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Container Damage Reports", 40, 58);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generated ${new Date().toLocaleString()}  ·  ${reports.length} report(s)`,
    40,
    73,
  );
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 86,
    head: [EXPORT_COLUMNS.map((c) => c.header)],
    body: reports.map((r) => EXPORT_COLUMNS.map((c) => String(c.value(r)))),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [31, 59, 87], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { halign: "right", cellWidth: 55 },
      8: { halign: "center" },
      9: { halign: "center" },
    },
  });

  doc.save(fileName);
}
