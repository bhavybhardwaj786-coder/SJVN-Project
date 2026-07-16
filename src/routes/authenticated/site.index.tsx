import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { submissionsService, formsService } from "@/services";
import { useCurrentUser } from "@/hooks/use-current-user";

import {
  FileText,
  Droplet,
  Wind,
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
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
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

type MappedStatus = "completed" | "in-progress" | "pending";

const statusStyles: Record<
  MappedStatus,
  { pill: string; label: string; Icon: typeof CheckCircle2 }
> = {
  completed: {
    pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    label: "Completed",
    Icon: CheckCircle2,
  },
  "in-progress": {
    pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    label: "In Progress",
    Icon: Clock,
  },
  pending: {
    pill: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    label: "Pending",
    Icon: AlertCircle,
  },
};

function SiteDashboard() {
  const navigate = useNavigate();
  // We use the native YYYY-MM format for the input type="month"
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const { data: currentUser } = useCurrentUser();

  // 1. Data Fetching Logic
  const { data: formsResult, isLoading: formsLoading } = useQuery({
  queryKey: ["active-forms", currentUser?.site_id],
  queryFn: () => formsService.getActiveForms({ role: "site_user", siteId: currentUser?.site_id }),
  enabled: !!currentUser?.site_id,
});

  const requiredForms = (formsResult?.data || []).map((f: any) => ({
    id: f.id,
    name: f.title,
    description: f.description || "Monthly compliance report",
    icon: ICON_MAP[f.schema?.icon] || FileText,
  }));

  const reportingMonthDate = `${selectedMonth}-01`;

  const { data: submissionsResult } = useQuery({
    queryKey: ["submissions-by-month", reportingMonthDate, currentUser?.site_id],
    queryFn: () =>
      submissionsService.getSubmissionsByMonth(reportingMonthDate, currentUser?.site_id),
    enabled: !!currentUser?.site_id,
  });

  const submissions = submissionsResult?.data || [];

  const getOriginalStatus = (formId: string) => {
    const sub = submissions.find((s: any) => s.form_id === formId);
    return sub?.status || "Not Started";
  };

  // 2. Statistics Calculation
  const total = requiredForms.length;
  const completedCount = requiredForms.filter((f) => getOriginalStatus(f.id) === "submitted").length;
  const inProgressCount = requiredForms.filter((f) => getOriginalStatus(f.id) === "draft").length;
  const pendingCount = requiredForms.filter(
    (f) => getOriginalStatus(f.id) === "pending" || getOriginalStatus(f.id) === "Not Started"
  ).length;

  const stats = [
    {
      label: "Total Forms",
      value: total,
      Icon: FileText,
      tint: "from-sky-50 to-blue-50 text-sky-700 ring-sky-100",
    },
    {
      label: "Completed",
      value: completedCount,
      Icon: CheckCircle2,
      tint: "from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-100",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      Icon: Clock,
      tint: "from-amber-50 to-yellow-50 text-amber-700 ring-amber-100",
    },
    {
      label: "Pending",
      value: pendingCount,
      Icon: AlertCircle,
      tint: "from-sky-50 to-indigo-50 text-sky-700 ring-sky-100",
    },
  ];

  const goToForm = (formId: string) =>
  navigate({
    to: "/authenticated/site/forms/$formId",
    params: { formId },
    // Makes sure the URL retains the exact active selected month state configuration!
    search: { period: selectedMonth }, 
  });

  return (
    <AppShell>
      {/* Container breaks out of standard padding to apply the full background gradient */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 -mb-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/40">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          
          {/* Hero Section */}
          <section className="flex">
            <div className="inline-block rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-sky-100">
                Site Portal
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                Business Responsibility and Sustainability Reporting
              </h1>
              <p className="mt-1 text-sm text-sky-50">
                Complete and submit monthly environmental compliance reports.
              </p>
            </div>
          </section>

          {/* Stats Grid */}
          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map(({ label, value, Icon, tint }) => (
              <div
                key={label}
                className={`rounded-xl bg-gradient-to-br ${tint} p-4 ring-1`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{label}</span>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </section>

          {/* Reporting Month Selector */}
          <section className="mt-6 flex">
            <div className="inline-flex items-center gap-3 rounded-xl border border-sky-100 bg-white px-4 py-2.5 shadow-sm">
              <Calendar className="h-4 w-4 text-sky-600" />
              <label
                htmlFor="reporting-month"
                className="text-sm font-medium text-slate-700 whitespace-nowrap"
              >
                Reporting Month
              </label>
              <input
                id="reporting-month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </section>

          {/* Forms Grid */}
          <section className="mt-6 pb-12">
            {formsLoading ? (
               <p className="text-sm text-slate-500 font-medium p-4">Loading forms...</p>
            ) : requiredForms.length === 0 ? (
               <p className="text-sm text-slate-500 font-medium p-4">No forms have been assigned yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {requiredForms.map(({ id, name, description, icon: Icon }) => {
                  const originalStatus = getOriginalStatus(id);
                  
                  // Map database status to UI status
                  const mappedStatus: MappedStatus = 
                    originalStatus === "submitted" ? "completed" 
                    : originalStatus === "draft" ? "in-progress" 
                    : "pending";

                  const s = statusStyles[mappedStatus];

                  return (
                    <article
                      key={id}
                      className="flex flex-col rounded-xl bg-gradient-to-br from-sky-50/60 via-white to-blue-50/40 p-5 ring-1 ring-sky-100 transition hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-blue-100 text-sky-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-800 leading-tight">
                            {name}
                          </h3>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${s.pill}`}
                        >
                          <s.Icon className="h-3 w-3" />
                          {s.label}
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-slate-600 line-clamp-2 flex-1">
                        {description}
                      </p>

                      <div className="mt-5 flex items-center gap-2">
                        <button 
                          onClick={() => goToForm(id)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:from-sky-600 hover:to-blue-700"
                        >
                          {mappedStatus === "completed" ? "View Submission" : mappedStatus === "in-progress" ? "Continue Form" : "Fill Form"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}