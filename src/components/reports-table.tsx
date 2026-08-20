"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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

const TYPE_LABELS: Record<string, string> = {
  STANDARD: "Standard",
  HIGH_CUBE: "High Cube",
  REEFER: "Reefer",
  OPEN_TOP: "Open Top",
  TANK: "Tank",
  FLAT_RACK: "Flat Rack",
};

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

const COLUMN_LABELS: Record<string, string> = {
  reportNo: "No.",
  reportDate: "Date",
  containerNumber: "Container",
  truckCompany: "Truck Company",
  truckNumber: "Truck No.",
  size: "Size",
  containerStatus: "Status",
  containerType: "Type",
  damages: "Damages",
  photos: "Photos",
};

export function ReportsTable({ data }: { data: DamageReport[] }) {
  const router = useRouter();
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
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} className="flex">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
              aria-label="Select row"
            />
          </div>
        ),
      },
      {
        accessorKey: "reportNo",
        header: ({ column }) => <SortHeader label="No." column={column} />,
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.reportNo}</span>
        ),
      },
      {
        accessorKey: "reportDate",
        header: ({ column }) => <SortHeader label="Date" column={column} />,
      },
      {
        accessorKey: "containerNumber",
        header: ({ column }) => <SortHeader label="Container" column={column} />,
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "truckCompany",
        header: ({ column }) => <SortHeader label="Truck Company" column={column} />,
        cell: ({ getValue }) => getValue<string>() || "—",
      },
      {
        accessorKey: "truckNumber",
        header: ({ column }) => <SortHeader label="Truck No." column={column} />,
        cell: ({ getValue }) => getValue<string>() || "—",
      },
      {
        id: "size",
        accessorFn: (r) => `${r.containerSize}'`,
        header: ({ column }) => <SortHeader label="Size" column={column} />,
      },
      {
        accessorKey: "containerStatus",
        header: ({ column }) => <SortHeader label="Status" column={column} />,
        filterFn: "equalsString",
        cell: ({ getValue }) => (
          <Badge variant="outline">{getValue<string>()}</Badge>
        ),
      },
      {
        accessorKey: "containerType",
        header: ({ column }) => <SortHeader label="Type" column={column} />,
        filterFn: "equalsString",
        cell: ({ getValue }) => TYPE_LABELS[getValue<string>()] ?? getValue<string>(),
      },
      {
        id: "damages",
        accessorFn: (r) => r.itemCount ?? r.items?.length ?? 0,
        enableGlobalFilter: false,
        header: ({ column }) => (
          <SortHeader label="Damages" column={column} className="justify-center" />
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
          <SortHeader label="Photos" column={column} className="justify-center" />
        ),
        cell: ({ getValue }) => (
          <div className="text-center">
            <Badge variant="outline">{getValue<number>()}</Badge>
          </div>
        ),
      },
    ],
    [],
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
      .then(() => toast.success(`Exported ${exportRows.length} report(s) to ${kind}`))
      .catch((e: Error) => toast.error(`Export failed: ${e.message}`));
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
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search reports…"
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
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="EMPTY">Empty</SelectItem>
            <SelectItem value="LADEN">Laden</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeValue}
          onValueChange={(v) =>
            table.getColumn("containerType")?.setFilterValue(v === ALL ? undefined : v)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
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
                    {COLUMN_LABELS[c.id] ?? c.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={exportRows.length === 0}>
                <Download /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                Export {selectedRows.length ? `${selectedRows.length} selected` : `${exportRows.length} rows`}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => runExport(exportReportsToExcel, "Excel")}>
                <FileSpreadsheet /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => runExport(exportReportsToPdf, "PDF")}>
                <FileText /> PDF
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
                  No reports found.
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
            ? `${selectedRows.length} of ${filteredRows.length} row(s) selected`
            : `${filteredRows.length} report(s)`}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Rows per page</span>
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
          <span className="text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
