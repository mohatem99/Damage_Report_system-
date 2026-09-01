"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportsTable } from "@/components/reports-table";

export default function ReportsPage() {
  const t = useTranslations("reports");
  // Fetch every report; the data grid handles search, sort, filter,
  // pagination and export entirely client-side.
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "all"],
    queryFn: () => api.listAllReports(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button asChild>
          <Link href="/reports/new">{t("newReport")}</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("loading")}
            </p>
          ) : (
            <ReportsTable data={data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
