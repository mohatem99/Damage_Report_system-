"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import type { DamageReport } from "@/lib/types";
import { exportReportsToExcel, exportReportsToPdf } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ALL = "__all__";

/** Container type codes, in display order; labels come from translations. */
const CONTAINER_TYPES = [
  "STANDARD",
  "HIGH_CUBE",
  "REEFER",
  "OPEN_TOP",
  "TANK",
  "FLAT_RACK",
] as const;

/** Column id → translation key under reports.table.col. */
const COL_KEY: Record<string, string> = {
  reportNo: "no",
  reportDate: "date",
  containerNumber: "container",
  truckCompany: "truckCompany",
  truckNumber: "truckNumber",
  size: "size",
  containerStatus: "status",
  containerType: "type",
  damages: "damages",
  photos: "photos",
};

/**
 * Page numbers to show for pagination: always the first and last page, the
 * current page and its neighbours, with "…" gaps between. e.g. for page 6 of
 * 12 → [1, "…", 5, 6, 7, "…", 12].
 */
function pageItems(current: number, total: number): (number | "dots")[] {
  const items: (number | "dots")[] = [];
  const keep = (i: number) =>
    i === 1 || i === total || (i >= current - 1 && i <= current + 1);
  let last = 0;
  for (let i = 1; i <= total; i++) {
    if (!keep(i)) continue;
    if (last && i - last === 2) items.push(last + 1);
    else if (last && i - last > 2) items.push("dots");
    items.push(i);
    last = i;
  }
  return items;
}

/** Sortable column header button. */
function SortHeader({
  label,
  column,
  className,
}: {
  label: string;
  column: import("@tanstack/react-table").Column<DamageReport, unknown>;
  className?: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={`-ml-2 inline-flex items-center gap-1 rounded px-2 py-1 text-left hover:bg-accent ${className ?? ""}`}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

export function ReportsTable({ data }: { data: DamageReport[] }) {
  const router = useRouter();
  const t = useTranslations("reports.table");
  const tType = useTranslations("reports.containerType");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "reportNo", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const columns = React.useMemo<ColumnDef<DamageReport>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label={t("selectAll")}
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} className="flex">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
              aria-label={t("selectRow")}
            />
          </div>
        ),
      },
      {
        accessorKey: "reportNo",
        header: ({ column }) => <SortHeader label={t("col.no")} column={column} />,
        cell: ({ row }) => (
          <span className="font-mono font-medium">
            {row.original.reportNoFormatted ?? row.original.reportNo}
          </span>
        ),
      },
      {
        accessorKey: "reportDate",
        header: ({ column }) => <SortHeader label={t("col.date")} column={column} />,
      },
      {
        accessorKey: "containerNumber",
        header: ({ column }) => <SortHeader label={t("col.container")} column={column} />,
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "truckCompany",
        header: ({ column }) => <SortHeader label={t("col.truckCompany")} column={column} />,
        cell: ({ getValue }) => getValue<string>() || "—",
      },
      {
        accessorKey: "truckNumber",
        header: ({ column }) => <SortHeader label={t("col.truckNumber")} column={column} />,
        cell: ({ getValue }) => getValue<string>() || "—",
      },
      {
        id: "size",
        accessorFn: (r) => `${r.containerSize}'`,
        header: ({ column }) => <SortHeader label={t("col.size")} column={column} />,
      },
      {
        accessorKey: "containerStatus",
        header: ({ column }) => <SortHeader label={t("col.status")} column={column} />,
        filterFn: "equalsString",
        cell: ({ getValue }) => (
          <Badge variant="outline">{getValue<string>()}</Badge>
        ),
      },
      {
        accessorKey: "containerType",
        header: ({ column }) => <SortHeader label={t("col.type")} column={column} />,
        filterFn: "equalsString",
        cell: ({ getValue }) => tType(getValue<string>()),
      },
      {
        id: "damages",
        accessorFn: (r) => r.itemCount ?? r.items?.length ?? 0,
        enableGlobalFilter: false,
        header: ({ column }) => (
          <SortHeader label={t("col.damages")} column={column} className="justify-center" />
        ),
        cell: ({ getValue }) => (
          <div className="text-center">
            <Badge variant="secondary">{getValue<number>()}</Badge>
          </div>
        ),
      },
      {
        id: "photos",
        accessorFn: (r) => r.attachmentCount ?? r.attachments?.length ?? 0,
        enableGlobalFilter: false,
        header: ({ column }) => (
          <SortHeader label={t("col.photos")} column={column} className="justify-center" />
        ),
        cell: ({ getValue }) => (
          <div className="text-center">
            <Badge variant="outline">{getValue<number>()}</Badge>
          </div>
        ),
      },
    ],
    [t, tType],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: "includesString",
    initialState: { pagination: { pageSize: 20 } },
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;
  const exportRows = (selectedRows.length ? selectedRows : filteredRows).map(
    (r) => r.original,
  );

  const runExport = (fn: (rows: DamageReport[]) => Promise<void>, kind: string) => {
    fn(exportRows)
      .then(() => toast.success(t("exportSuccess", { count: exportRows.length, kind })))
      .catch((e: Error) => toast.error(t("exportFailed", { message: e.message })));
  };

  const statusValue =
    (table.getColumn("containerStatus")?.getFilterValue() as string) ?? ALL;
  const typeValue =
    (table.getColumn("containerType")?.getFilterValue() as string) ?? ALL;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="ps-8"
            placeholder={t("searchPlaceholder")}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>

        <Select
          value={statusValue}
          onValueChange={(v) =>
            table.getColumn("containerStatus")?.setFilterValue(v === ALL ? undefined : v)
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
            <SelectItem value="EMPTY">{t("empty")}</SelectItem>
            <SelectItem value="LADEN">{t("laden")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeValue}
          onValueChange={(v) =>
            table.getColumn("containerType")?.setFilterValue(v === ALL ? undefined : v)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allTypes")}</SelectItem>
            {CONTAINER_TYPES.map((v) => (
              <SelectItem key={v} value={v}>
                {tType(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ms-auto flex items-center gap-2">
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal /> {t("columns")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("toggleColumns")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {COL_KEY[c.id] ? t(`col.${COL_KEY[c.id]}`) : c.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={exportRows.length === 0}>
                <Download /> {t("export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {selectedRows.length
                  ? t("exportSelected", { count: selectedRows.length })
                  : t("exportRows", { count: exportRows.length })}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => runExport(exportReportsToExcel, "Excel")}>
                <FileSpreadsheet /> {t("excel")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runExport(exportReportsToPdf, "PDF")}>
                <FileText /> {t("pdf")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => router.push(`/reports/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("noReports")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer: selection + pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="text-muted-foreground">
          {selectedRows.length > 0
            ? t("rowsSelected", {
                selected: selectedRows.length,
                total: filteredRows.length,
              })
            : t("rowsCount", { count: filteredRows.length })}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t("rowsPerPage")}</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {t("previous")}
            </Button>
            {pageItems(
              table.getState().pagination.pageIndex + 1,
              table.getPageCount() || 1,
            ).map((p, i) =>
              p === "dots" ? (
                <span key={`dots-${i}`} className="px-1.5 text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={
                    p === table.getState().pagination.pageIndex + 1
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="min-w-9 tabular-nums"
                  aria-current={
                    p === table.getState().pagination.pageIndex + 1
                      ? "page"
                      : undefined
                  }
                  onClick={() => table.setPageIndex(p - 1)}
                >
                  {p}
                </Button>
              ),
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
