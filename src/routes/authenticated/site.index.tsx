import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { submissionsService, formsService } from "@/services";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Wind,
  Droplet,
  Trash2,
  AlertTriangle,
  Wallet,
  Trees,
  Fuel,
  Volume2,
  Waves,
  CloudRain,
  Leaf,
  MapPinned,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/authenticated/site/")({
  ssr: false,
  component: SiteDashboard,
});

const ICON_MAP: Record<string, any> = {
  Droplet, Wind, Trash2, AlertTriangle, Wallet, Trees,
  Fuel, Volume2, Waves, CloudRain, Leaf, MapPinned,
};

function SiteDashboard() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // "2026-07"
  );

  const { data: currentUser } = useCurrentUser();

  // Forms this site user is allowed to see (RLS already filters by site)
  const { data: formsResult, isLoading: formsLoading } = useQuery({
    queryKey: ["active-forms"],
    queryFn: () => formsService.getActiveForms(),
  });

  const requiredForms = (formsResult?.data || []).map((f: any) => ({
    id: f.id,
    name: f.title,
    icon: ICON_MAP[f.schema?.icon] || FileText,
  }));

  // Submissions for the selected month, for this site
  const reportingMonthDate = `${selectedMonth}-01`; // "2026-07" -> "2026-07-01"

  const { data: submissionsResult } = useQuery({
    queryKey: ["submissions-by-month", reportingMonthDate, currentUser?.site_id],
    queryFn: () =>
      submissionsService.getSubmissionsByMonth(reportingMonthDate, currentUser?.site_id),
    enabled: !!currentUser?.site_id,
  });

  const submissions = submissionsResult?.data || [];

  const getStatus = (formId: string) => {
    const sub = submissions.find((s: any) => s.form_id === formId);
    return sub?.status || "Not Started";
  };

  const submitted = requiredForms.filter((f) => getStatus(f.id) === "submitted").length;
  const draft = requiredForms.filter((f) => getStatus(f.id) === "draft").length;
  const pending = requiredForms.filter(
    (f) => getStatus(f.id) === "pending" || getStatus(f.id) === "Not Started"
  ).length;

  const goToForm = (formId: string) =>
    navigate({
      to: "/authenticated/site/forms/$formId",
      params: { formId },
      search: { period: selectedMonth },
    });

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Environmental Compliance Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Complete and submit monthly environmental compliance reports.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Reporting Month</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-72">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  const value = d.toISOString().slice(0, 7);
                  return (
                    <SelectItem key={value} value={value}>
                      {d.toLocaleString("default", { month: "long", year: "numeric" })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-4">
          <Card><CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold">{requiredForms.length}</p>
            <p className="text-muted-foreground">Total Forms</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-green-600">{submitted}</p>
            <p className="text-muted-foreground">Submitted</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-orange-500">{pending}</p>
            <p className="text-muted-foreground">Pending</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold text-blue-500">{draft}</p>
            <p className="text-muted-foreground">Draft</p>
          </CardContent></Card>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Required Monthly Forms</h2>

          {formsLoading ? (
            <p className="text-muted-foreground">Loading forms…</p>
          ) : requiredForms.length === 0 ? (
            <p className="text-muted-foreground">
              No forms have been assigned yet.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {requiredForms.map(({ id, name, icon: Icon }) => {
                const status = getStatus(id);
                return (
                  <Card key={id} className="flex flex-col justify-between">
                    <CardContent className="pt-6 flex flex-col gap-4 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="rounded-lg bg-muted p-2.5">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <Badge
                          variant={
                            status === "submitted" ? "default"
                            : status === "draft" ? "secondary"
                            : "outline"
                          }
                        >
                          {status}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-semibold leading-snug">{name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Monthly compliance report
                        </p>
                      </div>
                    </CardContent>
                    <div className="p-6 pt-0">
                      <Button
                        variant={status === "submitted" ? "outline" : "default"}
                        className="w-full"
                        onClick={() => goToForm(id)}
                      >
                        {status === "submitted" ? "View" : status === "draft" ? "Continue" : "Submit Form"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
