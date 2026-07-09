import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { submissionsService } from "@/services";

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
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";

export const Route = createFileRoute("/authenticated/site/")({
  ssr: false,
  component: SiteDashboard,
});

function SiteDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const { data: submissionsData } = useQuery({
    queryKey: ["my-submissions", selectedMonth],
    queryFn: () => submissionsService.getMySubmissions(selectedMonth),
  });

  const submissions = submissionsData?.data || [];

  // Temporary form list — each form has a name + an icon for the dashboard card
  const requiredForms = [
    { name: "Air Emission Monitoring", icon: Wind },
    { name: "Water Quality Monitoring", icon: Droplet },
    { name: "Solid Waste Management", icon: Trash2 },
    { name: "Hazardous Waste Report", icon: AlertTriangle },
    { name: "Environmental Expenditure", icon: Wallet },
    { name: "Plantation & CSR Activities", icon: Trees },
    { name: "Fuel Consumption & Emission", icon: Fuel },
    { name: "Ambient Air Quality", icon: Wind },
    { name: "Noise Level Monitoring", icon: Volume2 },
    { name: "Effluent Treatment Plant (ETP)", icon: Waves },
    { name: "Rainwater Harvesting", icon: CloudRain },
    { name: "Biodiversity & Green Belt Report", icon: Leaf },
    { name: "Greenhouse Gas (GHG) Inventory", icon: MapPinned },
    { name: "Groundwater Monitoring", icon: Droplet },
  ];

  const getStatus = (formName: string) => {
    const form = submissions.find((s: any) => s.formName === formName);

    return form?.status || "Not Started";
  };

  const submitted = requiredForms.filter(
    (f) => getStatus(f.name) === "submitted"
  ).length;

  const draft = requiredForms.filter(
    (f) => getStatus(f.name) === "draft"
  ).length;

  const pending = requiredForms.filter(
    (f) =>
      getStatus(f.name) === "pending" ||
      getStatus(f.name) === "Not Started"
  ).length;

  const progress = (submitted / requiredForms.length) * 100;

  return (
    <AppShell>
      <div className="space-y-8">

        {/* Header */}

        <div>
          <h1 className="text-3xl font-bold">
            Environmental Compliance Dashboard
          </h1>

          <p className="text-muted-foreground mt-2">
            Complete and submit monthly environmental compliance reports.
          </p>
        </div>

        {/* Month Selector */}

        <Card>

          <CardHeader>
            <CardTitle>Select Reporting Month</CardTitle>
          </CardHeader>

          <CardContent>

            <Select
              value={selectedMonth}
              onValueChange={setSelectedMonth}
            >
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
                    <SelectItem
                      key={value}
                      value={value}
                    >
                      {d.toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

          </CardContent>

        </Card>

        {/* Statistics */}

        <div className="grid gap-6 md:grid-cols-4">

          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold">
                {requiredForms.length}
              </p>
              <p className="text-muted-foreground">
                Total Forms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-green-600">
                {submitted}
              </p>
              <p className="text-muted-foreground">
                Submitted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-orange-500">
                {pending}
              </p>
              <p className="text-muted-foreground">
                Pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-blue-500">
                {draft}
              </p>
              <p className="text-muted-foreground">
                Draft
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Required Forms — Grid of small form windows/cards */}

        <div>
          <h2 className="text-xl font-semibold mb-4">
            Required Monthly Forms
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {requiredForms.map(({ name, icon: Icon }) => {
              const status = getStatus(name);

              return (
                <Card
                  key={name}
                  className="flex flex-col justify-between"
                >

                  <CardContent className="pt-6 flex flex-col gap-4 flex-1">

                    <div className="flex items-start justify-between">
                      <div className="rounded-lg bg-muted p-2.5">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>

                      <Badge
                        variant={
                          status === "submitted"
                            ? "default"
                            : status === "draft"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {status}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold leading-snug">
                        {name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Monthly compliance report
                      </p>
                    </div>

                  </CardContent>

                  <div className="p-6 pt-0">
                    {status === "submitted" ? (
                      <Button variant="outline" className="w-full">
                        View
                      </Button>
                    ) : status === "draft" ? (
                      <Button className="w-full">
                        Continue
                      </Button>
                    ) : (
                      <Button className="w-full">
                        Submit Form
                      </Button>
                    )}
                  </div>

                </Card>
              );
            })}

          </div>
        </div>

      </div>
    </AppShell>
  );
}