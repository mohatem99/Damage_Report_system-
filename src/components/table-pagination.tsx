"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Page numbers to show: always the first and last page, the current page and
 * its neighbours, with "…" gaps between. e.g. page 6 of 12 →
 * [1, "…", 5, 6, 7, "…", 12]. (Mirrors the reports table.)
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

/**
 * Client-side pagination footer: a "N item(s)" count, a page-size select, and
 * numbered prev/next controls. Pages are 1-indexed. Renders nothing when there
 * is a single page and the default page size — nothing to page through.
 */
export function TablePagination({
  page,
  pageSize,
  total,
  label = "item",
  labelPlural,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Singular noun for the count, e.g. "line" → "3 lines". */
  label?: string;
  /** Plural form, when adding "s" is wrong (e.g. "agency" → "agencies"). */
  labelPlural?: string;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="text-muted-foreground tabular-nums">
        {total} {total === 1 ? label : labelPlural ?? `${label}s`}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
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
            onClick={() => onPageChange(current - 1)}
            disabled={current <= 1}
          >
            Previous
          </Button>
          {pageItems(current, pageCount).map((p, i) =>
            p === "dots" ? (
              <span key={`dots-${i}`} className="px-1.5 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === current ? "default" : "outline"}
                size="sm"
                className="min-w-9 tabular-nums"
                aria-current={p === current ? "page" : undefined}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(current + 1)}
            disabled={current >= pageCount}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
