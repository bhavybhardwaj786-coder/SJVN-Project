import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/authenticated/site/")({
  ssr: false,
  component: SiteDashboard,
});

const ICON_MAP: Record<string, any> = {
  Droplet, Wind, Trash2, AlertTriangle, Wallet, Trees,
  Fuel, Volume2, Waves, CloudRain, Leaf, MapPinned,
};

// --- shared animation variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
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
      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="space-y-8"
      >
        {/* --- Hero, matching the admin dashboard's gradient system --- */}
        <motion.div
          variants={fadeUp}
          className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-elevated sm:p-8"
        >
          <div className="relative z-10">
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-primary-foreground/75">
              Site Portal
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold sm:text-3xl">
              Environmental Compliance Dashboard
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-primary-foreground/75">
              Complete and submit monthly environmental compliance reports.
            </p>
          </div>
        </motion.div>

        {/* --- Month selector --- */}
        <motion.div variants={fadeUp}>
          <Card className="card-lift hover:card-lift-hover">
            <CardHeader>
              <CardTitle className="font-display text-base">Select Reporting Month</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-72 transition-colors focus-visible:border-ring">
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
        </motion.div>

        {/* --- Stat cards, mono tabular figures, staggered in --- */}
        <motion.div variants={containerVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={fadeUp} whileHover={{ y: -2 }}>
            <Card className="card-lift shadow-card hover:card-lift-hover">
              <CardContent className="pt-6 text-center">
                <p className="font-mono-figures text-3xl font-semibold">{requiredForms.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Total Forms</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp} whileHover={{ y: -2 }}>
            <Card className="card-lift shadow-card hover:card-lift-hover">
              <CardContent className="pt-6 text-center">
                <p className="font-mono-figures text-3xl font-semibold text-success">{submitted}</p>
                <p className="mt-1 text-xs text-muted-foreground">Submitted</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp} whileHover={{ y: -2 }}>
            <Card className="card-lift shadow-card hover:card-lift-hover">
              <CardContent className="pt-6 text-center">
                <p className="font-mono-figures text-3xl font-semibold text-warning">{pending}</p>
                <p className="mt-1 text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp} whileHover={{ y: -2 }}>
            <Card className="card-lift shadow-card hover:card-lift-hover">
              <CardContent className="pt-6 text-center">
                <p className="font-mono-figures text-3xl font-semibold text-gradient-brand">{draft}</p>
                <p className="mt-1 text-xs text-muted-foreground">Draft</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* --- Required forms grid --- */}
        <motion.div variants={fadeUp}>
          <h2 className="mb-4 font-display text-xl font-semibold">Required Monthly Forms</h2>

          {formsLoading ? (
            <p className="text-muted-foreground">Loading forms…</p>
          ) : requiredForms.length === 0 ? (
            <p className="text-muted-foreground">
              No forms have been assigned yet.
            </p>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {requiredForms.map(({ id, name, icon: Icon }) => {
                const status = getStatus(id);
                return (
                  <motion.div key={id} variants={fadeUp} whileHover={{ y: -3 }}>
                    <Card className="card-lift flex h-full flex-col justify-between shadow-card hover:card-lift-hover">
                      <CardContent className="flex flex-1 flex-col gap-4 pt-6">
                        <div className="flex items-start justify-between">
                          <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary-soft text-brand">
                            <Icon className="h-5 w-5" />
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
                          <h3 className="font-display font-semibold leading-snug">{name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Monthly compliance report
                          </p>
                        </div>
                      </CardContent>
                      <div className="p-6 pt-0">
                        <Button
                          variant={status === "submitted" ? "outline" : "default"}
                          className={`group w-full transition-shadow ${
                            status === "submitted" ? "" : "hover:shadow-glow"
                          }`}
                          onClick={() => goToForm(id)}
                        >
                          {status === "submitted" ? "View" : status === "draft" ? "Continue" : "Submit Form"}
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AppShell>
  );
}