import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, useMe } from "@/components/app-shell";
import { motion, AnimatePresence } from "framer-motion";
import { submissionsService, formsService, sitesService } from "@/services";
import { useCurrentUser } from "@/hooks/use-current-user";

import {
  FileText, Droplet, Wind, Trash2, AlertTriangle, Wallet, Trees,
  Fuel, Volume2, Waves, CloudRain, Leaf, MapPinned, Calendar,
  CheckCircle2, Clock, AlertCircle, ArrowRight, Lock, Loader2
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
  completed: { pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", label: "Completed", Icon: CheckCircle2 },
  "in-progress": { pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", label: "In Progress", Icon: Clock },
  pending: { pill: "bg-sky-50 text-sky-700 ring-1 ring-sky-200", label: "Pending", Icon: AlertCircle },
};

function SiteDashboard() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const { data: currentUser } = useCurrentUser();
  const { data: me } = useMe();

  // Safely resolve the target site ID
  const targetSiteId = currentUser?.site_id || me?.sites?.[0]?.id;

  const { data: formsResult, isLoading: formsLoading } = useQuery({
    queryKey: ["active-forms", targetSiteId],
    queryFn: () => formsService.getActiveForms({ role: "site_user", siteId: targetSiteId }),
    enabled: !!targetSiteId,
  });

  // ADDED: Track isLoading and isError to prevent false "Locked" states
    // ADDED: Track isLoading and isError to prevent false "Locked" states
  const { data: siteData, isLoading: isSiteAccessLoading, isError: isSiteAccessError } = useQuery({
    queryKey: ["site-access", targetSiteId],
    queryFn: async () => {
      const { data, error } = await sitesService.getSiteAccess(targetSiteId!);
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!targetSiteId,
  });

  const isMonthUnlocked = siteData?.unlocked_months?.includes(selectedMonth) || false;

  const requiredForms = (formsResult?.data || []).map((f: any) => ({
    id: f.id,
    name: f.title,
    description: f.description || "Monthly compliance report",
    icon: ICON_MAP[f.schema?.icon] || FileText,
  }));

  const reportingMonthDate = `${selectedMonth}-01`;

  const { data: submissionsResult } = useQuery({
    queryKey: ["submissions-by-month", reportingMonthDate, targetSiteId],
    queryFn: () => submissionsService.getSubmissionsByMonth(reportingMonthDate, targetSiteId),
    enabled: !!targetSiteId,
  });

  const submissions = submissionsResult?.data || [];
  const getOriginalStatus = (formId: string) => submissions.find((s: any) => s.form_id === formId)?.status || "Not Started";

  const total = requiredForms.length;
  const completedCount = requiredForms.filter((f) => getOriginalStatus(f.id) === "submitted").length;
  const inProgressCount = requiredForms.filter((f) => getOriginalStatus(f.id) === "draft").length;
  const pendingCount = requiredForms.filter((f) => getOriginalStatus(f.id) === "pending" || getOriginalStatus(f.id) === "Not Started").length;

  const stats = [
    { label: "Total Forms", value: total, Icon: FileText, tint: "from-sky-50 to-blue-50 text-sky-700 ring-sky-100" },
    { label: "Completed", value: completedCount, Icon: CheckCircle2, tint: "from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-100" },
    { label: "In Progress", value: inProgressCount, Icon: Clock, tint: "from-amber-50 to-yellow-50 text-amber-700 ring-amber-100" },
    { label: "Pending", value: pendingCount, Icon: AlertCircle, tint: "from-sky-50 to-indigo-50 text-sky-700 ring-sky-100" },
  ];

  const goToForm = (formId: string) => navigate({ to: "/authenticated/site/forms/$formId", params: { formId }, search: { period: selectedMonth } });

  return (
    <AppShell>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 -mb-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/40">
        <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
          <section className="flex">
            <div className="inline-block rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-sky-100">Site Portal</p>
              <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">User Dashboard</h1>
              <p className="mt-1 text-sm text-sky-50">Complete and submit monthly environmental compliance reports.</p>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map(({ label, value, Icon, tint }) => (
              <div key={label} className={`rounded-xl bg-gradient-to-br ${tint} p-4 ring-1`}>
                <div className="flex items-center justify-between"><span className="text-xs font-medium">{label}</span><Icon className="h-4 w-4" /></div>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-6 flex">
            <div className="inline-flex items-center gap-3 rounded-xl border border-sky-100 bg-white px-4 py-2.5 shadow-sm">
              <Calendar className="h-4 w-4 text-sky-600" />
              <label htmlFor="reporting-month" className="text-sm font-medium text-slate-700 whitespace-nowrap">Reporting Month</label>
              <input id="reporting-month" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
            </div>
          </section>

          {/* DIAGNOSTIC UI ALERTS ADDED HERE */}
          
          {/* 1. Missing Site Assignment Warning */}
          {!targetSiteId && (
            <section className="mt-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-3 shadow-sm">
                <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold">Account Setup Incomplete.</span> Your profile is not assigned to a Project Site. Contact your Administrator to assign you to a site.
                </div>
              </div>
            </section>
          )}

          {/* 2. Loading State */}
          {targetSiteId && isSiteAccessLoading && (
            <section className="mt-4">
               <div className="flex items-center gap-2 p-4 text-sm font-medium text-slate-500 bg-white rounded-xl border border-slate-100 shadow-sm">
                 <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Verifying portal access permissions...
               </div>
            </section>
          )}

          {/* 3. Row Level Security Error */}
          {targetSiteId && isSiteAccessError && (
            <section className="mt-4">
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 flex items-center gap-3 shadow-sm">
                <AlertTriangle className="h-6 w-6 text-orange-600 shrink-0" />
                <div>
                  <span className="font-bold">Permission Denied.</span> Your account lacks the database permissions to verify site status. Ensure backend permissions allow Site Users to read the "sites" table.
                </div>
              </div>
            </section>
          )}

          {/* 4. Correctly Guarded Locked State */}
          <AnimatePresence>
            {targetSiteId && !isSiteAccessLoading && !isSiteAccessError && !isMonthUnlocked && (
              <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-3 shadow-sm">
                  <Lock className="h-6 w-6 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold">Portal Access Locked.</span> The reporting portal for {new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })} is currently closed. Please contact your System Administrator to request an unlock.
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <section className="mt-6 pb-12">
            {!targetSiteId ? (
               <p className="text-sm text-slate-500 font-medium p-4">Awaiting site assignment...</p>
            ) : formsLoading ? (
               <p className="text-sm text-slate-500 font-medium p-4 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading forms...</p>
            ) : requiredForms.length === 0 ? (
               <p className="text-sm text-slate-500 font-medium p-4">No forms have been assigned yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {requiredForms.map(({ id, name, description, icon: Icon }) => {
                  const mappedStatus: MappedStatus = getOriginalStatus(id) === "submitted" ? "completed" : getOriginalStatus(id) === "draft" ? "in-progress" : "pending";
                  const s = statusStyles[mappedStatus];
                  return (
                    <article key={id} className="flex flex-col rounded-xl bg-gradient-to-br from-sky-50/60 via-white to-blue-50/40 p-5 ring-1 ring-sky-100 transition hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-blue-100 text-sky-700"><Icon className="h-5 w-5" /></div>
                          <h3 className="text-sm font-semibold text-slate-800 leading-tight">{name}</h3>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${s.pill}`}><s.Icon className="h-3 w-3" />{s.label}</span>
                      </div>
                      <p className="mt-3 text-xs text-slate-600 line-clamp-2 flex-1">{description}</p>
                      <div className="mt-5 flex items-center gap-2">
                        {isMonthUnlocked ? (
                          <button onClick={() => goToForm(id)} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold text-white shadow-sm transition ${mappedStatus === "completed" ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700" : mappedStatus === "in-progress" ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700" : "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"}`}>{mappedStatus === "completed" ? "View Submission" : mappedStatus === "in-progress" ? "Continue Form" : "Fill Form"}<ArrowRight className="h-3.5 w-3.5" /></button>
                        ) : (
                          <div className="w-full rounded-lg bg-rose-100/50 px-3 py-2.5 text-center text-xs font-bold text-rose-600 border border-rose-100"><Lock className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />Submission Locked</div>
                        )}
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