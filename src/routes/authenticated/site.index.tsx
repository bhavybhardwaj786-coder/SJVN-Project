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
  CheckCircle2, Clock, AlertCircle, ArrowRight, Lock, Loader2, SquarePen,
  Building2 // <-- ADDED THIS IMPORT
} from "lucide-react";

import wasteIcon from "@/assets/icon/waste.png";
import airPollutionIcon from "@/assets/icon/air-pollution.png";
import defrostingIcon from "@/assets/icon/defrosting.png";
import energyIcon from "@/assets/icon/energy.png";

// Helper function to match form titles to your custom images
function getCustomFormImage(title: string) {
  const t = (title || "").toLowerCase();
  if (t.includes("energy")) return energyIcon;
  if (t.includes("refrigerant") || t.includes("defrost")) return defrostingIcon;
  if (t.includes("emission") || t.includes("air") || t.includes("stack")) return airPollutionIcon;
  if (t.includes("waste") || t.includes("disposal")) return wasteIcon;
  
  return null; // Falls back to standard icons if no keyword matches
}

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

  const { data: sitesResult } = useQuery({
    queryKey: ["my-sites"],
    queryFn: () => sitesService.getSites(),
  });
  const siteName = sitesResult?.data?.find((s: any) => s.id === targetSiteId)?.name;

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
    customImage: getCustomFormImage(f.title), // <-- Add this new property
  }));

  const reportingMonthDate = `${selectedMonth}-01`;

  const { data: submissionsResult } = useQuery({
    queryKey: ["submissions-by-month", reportingMonthDate, targetSiteId],
    queryFn: () => submissionsService.getSubmissionsByMonth(reportingMonthDate, targetSiteId),
    enabled: !!targetSiteId,
  });

  const submissions = submissionsResult?.data || [];
  const getOriginalStatus = (formId: string) => submissions.find((s: any) => s.form_id === formId)?.status || "Not Started";
  const getSubmission = (formId: string) => submissions.find((s: any) => s.form_id === formId);

  const total = requiredForms.length;
  const completedCount = requiredForms.filter((f) => getOriginalStatus(f.id) === "submitted").length;
  const inProgressCount = requiredForms.filter((f) => getOriginalStatus(f.id) === "draft").length;
  const pendingCount = requiredForms.filter((f) => getOriginalStatus(f.id) === "pending" || getOriginalStatus(f.id) === "Not Started").length;

  const stats = [
    { label: "Total Forms", value: total, Icon: FileText, tint: "bg-white text-slate-700 ring-slate-200" },
    { label: "Completed", value: completedCount, Icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    { label: "In Progress", value: inProgressCount, Icon: Clock, tint: "bg-amber-50 text-amber-700 ring-amber-200" },
    { label: "Pending", value: pendingCount, Icon: AlertCircle, tint: "bg-blue-50 text-blue-700 ring-blue-200" },
  ];

  const goToForm = (formId: string) => navigate({ to: "/authenticated/site/forms/$formId", params: { formId }, search: { period: selectedMonth } });

  return (
    <AppShell>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 -mb-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/40">
        <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
          <section className="flex">
            <div className="flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-5 shadow-sm sm:w-auto sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-indigo-100">
                  <span className="font-semibold uppercase tracking-wide text-indigo-200">Site</span>
                  <span className="mx-1.5 text-indigo-300">–</span>
                  <span className="font-bold text-white">{siteName || "—"}</span>
                </p>
                <p className="mt-1 truncate text-sm text-indigo-100">
                  <span className="font-semibold uppercase tracking-wide text-indigo-200">Site user</span>
                  <span className="mx-1.5 text-indigo-300">–</span>
                  <span className="font-bold text-white">{currentUser?.full_name || currentUser?.email || "—"}</span>
                </p>
                <p className="mt-2 truncate text-xs text-indigo-100">Complete and submit monthly BRSR reports.</p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {stats.map(({ label, value, Icon, tint }) => (
              <div key={label} className={`rounded-2xl ${tint} p-4 sm:p-5 ring-1 shadow-sm`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{label}</span>
                  <Icon className="h-4 w-4 shrink-0" />
                </div>
                <p className="mt-2 text-2xl font-bold sm:text-3xl">{value}</p>
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
                {requiredForms.map(({ id, name, description, icon: Icon, customImage }) => {
                  const submission = getSubmission(id);
                  const mappedStatus: MappedStatus = getOriginalStatus(id) === "submitted" ? "completed" : getOriginalStatus(id) === "draft" ? "in-progress" : "pending";
                  const isReopenedForEdit = submission?.status === "submitted" && !!submission?.edit_unlocked;
                  const s = statusStyles[mappedStatus];
                  return (
                    <article key={id} className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100 overflow-hidden">
                            {/* If a custom image matches, show it. Otherwise show standard Icon. */}
                            {customImage ? (
                              <img 
                                src={customImage} 
                                alt={`${name} icon`} 
                                className="h-full w-full object-contain p-2" 
                              />
                            ) : (
                              <Icon className="h-5 w-5 text-slate-600" />
                            )}
                          </div>
                          <h3 className="min-w-0 truncate text-sm font-bold text-slate-800 leading-tight">{name}</h3>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${s.pill}`}><s.Icon className="h-3 w-3" />{s.label}</span>
                      </div>
                      <p className="mt-3 text-xs text-slate-600 line-clamp-2 flex-1">{description}</p>
                      <div className="mt-5 flex items-center gap-2">
                        {isMonthUnlocked ? (
                          <button
                            onClick={() => goToForm(id)}
                            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold text-white shadow-sm transition ${
                              isReopenedForEdit
                                ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                                : mappedStatus === "completed"
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                                : mappedStatus === "in-progress"
                                ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                                : "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"
                            }`}
                            >
                              {isReopenedForEdit ? (
                                <>
                                  Edit <SquarePen className="h-3.5 w-3.5" />
                                </>
                              ) : mappedStatus === "completed" ? (
                                <>
                                  View Submission <ArrowRight className="h-3.5 w-3.5" />
                                </>
                              ) : mappedStatus === "in-progress" ? (
                                <>
                                  Continue Form <ArrowRight className="h-3.5 w-3.5" />
                                </>
                              ) : (
                                <>
                                  Fill Form <ArrowRight className="h-3.5 w-3.5" />
                                </>
                              )}
                          </button>
                        ) : (
                          <div className="w-full rounded-xl bg-rose-50 px-3 py-2.5 text-center text-xs font-bold text-rose-600 ring-1 ring-rose-100"><Lock className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />Submission Locked</div>
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