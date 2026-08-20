"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportsTable } from "@/components/reports-table";

export default function ReportsPage() {
  // Fetch every report; the data grid handles search, sort, filter,
  // pagination and export entirely client-side.
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "all"],
    queryFn: () => api.listAllReports(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Button asChild>
          <Link href="/reports/new">New Report</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ReportsTable data={data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
