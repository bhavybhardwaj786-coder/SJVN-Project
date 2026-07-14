import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
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
  FileText,
  Loader2,
  Plus,
  Pencil,
  Eye,
  UserPlus,
  ArrowUpRight,
  Filter,
  Calendar,
  Layers,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { formsService } from "@/services";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ICONS: Record<string, LucideIcon> = {
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
};

export const Route = createFileRoute("/authenticated/supadmin")({
  ssr: false,
  component: AdminDashboard,
});

type SiteRow = { id: string; name: string; code: string };

type SubmissionRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string;
  form_id: string;
  site_id: string;
  user_id: string;
  forms: { id: string; title: string } | null;
  sites: { id: string; name: string; code: string } | null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

function AdminDashboard() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [formFilter, setFormFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const reportingMonthDate = `${selectedMonth}-01`;

  const { data: formsResult, isLoading: formsLoading } = useQuery({
    queryKey: ["admin-all-forms"],
    queryFn: () => formsService.getAllForms(),
  });
  const forms = formsResult?.data || [];
  const activeForms = forms.filter((f: any) => f.is_active);

  const { data: sitesResult } = useQuery({
    queryKey: ["all-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, code")
        .order("name");

      if (error) throw error;
      return data as SiteRow[];
    },
  });
  const sites = sitesResult || [];

  const { data: submissionsResult, isLoading: submissionsLoading } = useQuery({
    queryKey: ["admin-submissions-by-month", reportingMonthDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          id,
          status,
          submitted_at,
          updated_at,
          form_id,
          site_id,
          user_id,
          forms(id, title),
          sites(id, name, code)
        `)
        .eq("reporting_month", reportingMonthDate)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as unknown as SubmissionRow[];
    },
  });
  const submissions = submissionsResult || [];

  const { data: siteUsersResult } = useQuery({
    queryKey: ["all-site-users-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_users")
        .select("id, full_name");

      if (error) throw error;
      return data as { id: string; full_name: string }[];
    },
  });

  const userNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (siteUsersResult || []).forEach((u) => map.set(u.id, u.full_name));
    return map;
  }, [siteUsersResult]);

  const submissionMap = useMemo(() => {
    const map = new Map<string, SubmissionRow>();
    submissions.forEach((s) => {
      if (s.site_id && s.form_id) {
        map.set(`${s.site_id}__${s.form_id}`, s);
      }
    });
    return map;
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (siteFilter !== "all" && s.site_id !== siteFilter) return false;
      if (formFilter !== "all" && s.form_id !== formFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [submissions, siteFilter, formFilter, statusFilter]);

  const totalSites = sites.length;
  const totalForms = activeForms.length;
  const totalExpected = totalSites * totalForms;
  const totalSubmitted = submissions.filter(
    (s) => s.status === "submitted"
  ).length;
  const complianceRate =
    totalExpected > 0
      ? Math.round((totalSubmitted / totalExpected) * 100)
      : 0;

  const deleteMutation = useMutation({
    mutationFn: (formId: string) => formsService.deleteForm(formId),
    onSuccess: () => {
      toast.success("Form deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-all-forms"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete form");
    },
  });

  const handleDelete = (formId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(formId);
  };

  return (
    <AppShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8 p-1 text-slate-900 dynamic-dark-mode-support"
      >
        {/* SJVN Hydro-Green Premium Banner */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B2545] via-[#134074] to-[#0B2545] p-6 text-white shadow-2xl ring-1 ring-cyan-500/20 sm:p-8"
        >
          {/* Hydro and Clean Energy Fluid Glow Effects */}
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />
          <div className="absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-emerald-500/15 blur-3xl" />
          
          <div className="relative z-10">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 0.85, x: 0 }}
              className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300 flex items-center gap-1.5"
            >
              <Waves className="h-3.5 w-3.5 text-cyan-400 animate-bounce" />
              SJVN Environmental Monitoring Core
            </motion.div>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-transparent">
              {currentUser?.full_name ?? "Administrator Panel"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300/90 leading-relaxed">
              Real-time synchronization engine monitoring statutory compliances, flow telemetry logs, and sustainability audits across active project locations.
            </p>

            {isSuperAdmin && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/authenticated/users"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-200 shadow-xl backdrop-blur-md transition-colors hover:bg-cyan-500/20 hover:border-cyan-400/50"
                >
                  <UserPlus className="h-4 w-4 text-cyan-400" />
                  Manage Project Operators & Admins
                </Link>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* Thematic SJVN Metric Cards */}
        <motion.section 
          variants={itemVariants}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { value: totalSites, label: "Active Project Sites", sub: "Hydropower & Solar Nodes", borderHover: "rgba(34, 197, 94, 0.4)", gradient: "from-cyan-500/5" },
            { value: totalForms, label: "Compliance Formats", sub: "Environmental Checklists", borderHover: "rgba(6, 182, 212, 0.4)", gradient: "from-blue-500/5" },
            { value: totalSubmitted, label: "Validated Logs", sub: "Submissions This Cycle", borderHover: "rgba(16, 185, 129, 0.4)", gradient: "from-emerald-500/5", textColor: "text-emerald-600 dark:text-emerald-400" },
            { value: `${complianceRate}%`, label: "Sustainability Index", sub: "Overall Compliance Rate", borderHover: "rgba(14, 165, 233, 0.4)", gradient: "from-sky-500/5", textColor: "bg-gradient-to-r from-cyan-600 to-emerald-600 dark:from-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent" }
          ].map((card, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -5, boxShadow: "0 15px 30px -10px rgba(11,37,69,0.15)", borderColor: card.borderHover }}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800 transition-all duration-300"
            >
              <div className={`absolute right-0 top-0 h-24 w-24 bg-gradient-to-bl ${card.gradient} to-transparent rounded-bl-full pointer-events-none`} />
              <p className={`font-mono-figures text-4xl font-black tracking-tight ${card.textColor || "text-slate-900 dark:text-white"}`}>{card.value}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{card.sub}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* Operational Cycle / Month Picker */}
        <motion.section variants={itemVariants} className="flex items-center gap-3 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4 dark:bg-cyan-950/20 dark:border-cyan-500/20">
          <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Operational Audit Cycle
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/40 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const value = d.toISOString().slice(0, 7);
              return (
                <option key={value} value={value}>
                  {d.toLocaleString("default", { month: "long", year: "numeric" })}
                </option>
              );
            })}
          </select>
        </motion.section>

        {/* Environmental Blueprints Grid */}
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-display text-xl font-black tracking-tight dark:text-white">Compliance Archetypes</h2>
            </div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/authenticated/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/10 hover:brightness-105 transition-all"
              >
                <Plus className="h-4 w-4" />
                Configure New Format
              </Link>
            </motion.div>
          </div>

          {formsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-500" /> Synchronizing parameters...
            </div>
          ) : (
            <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {forms.map((f: any) => {
                  const Icon = ICONS[f.schema?.icon ?? ""] ?? FileText;
                  return (
                    <motion.div
                      layout
                      key={f.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -4, borderColor: "rgba(6, 182, 212, 0.3)", boxShadow: "0 10px 20px -5px rgba(11,37,69,0.05)" }}
                      className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800 relative overflow-hidden transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-500/10 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white dark:text-cyan-400 dark:group-hover:bg-cyan-500 transition-all duration-300">
                            <Icon className="h-5 w-5" />
                          </div>
                          {!f.is_active && (
                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Inactive
                            </span>
                          )}
                        </div>
                        <h3 className="mt-4 font-display text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {f.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {f.description || "No specific sub-parameters mapped."}
                        </p>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Link
                          to="/authenticated/new"
                          search={{ edit: f.id }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-3.5 w-3.5 opacity-70" />
                          Modify
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-rose-600 border-rose-200 bg-rose-50/30 hover:bg-rose-600 hover:text-white dark:border-rose-950/30 dark:bg-rose-950/10 transition-all"
                          onClick={() => handleDelete(f.id, f.title)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.section>

        {/* Matrix View */}
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="font-display text-xl font-black tracking-tight dark:text-white">Project-wise Compliance Matrix</h2>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
            <table className="w-full min-w-[640px] text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-850 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-950 px-5 py-3.5 text-slate-700 dark:text-slate-300 font-bold">Project Location</th>
                  {activeForms.map((f: any) => (
                    <th key={f.id} className="px-4 py-3.5 text-center font-bold">{f.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {submissionsLoading ? (
                  <tr>
                    <td colSpan={activeForms.length + 1} className="px-4 py-12 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-cyan-500" />
                    </td>
                  </tr>
                ) : sites.length ? (
                  sites.map((site) => (
                    <tr key={site.id} className="transition-colors hover:bg-cyan-500/[0.02] dark:hover:bg-cyan-500/[0.01] group">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-5 py-4 font-bold text-slate-800 dark:text-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        {site.name}
                        <span className="ml-2 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {site.code}
                        </span>
                      </td>

                      {activeForms.map((f: any) => {
                        const submission = submissionMap.get(`${site.id}__${f.id}`);
                        const status = submission?.status ?? "not_submitted";
                        return (
                          <td key={f.id} className="px-4 py-4 text-center align-middle">
                            <div className="flex flex-col items-center gap-2">
                              <StatusBadge status={status} />
                              {submission && (
                                <Link
                                  to="/authenticated/$submissionId"
                                  params={{ submissionId: submission.id }}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:underline transition-opacity"
                                >
                                  <Eye className="h-3 w-3" />
                                  Inspect Data
                                </Link>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={activeForms.length + 1} className="px-4 py-10 text-center text-slate-400">
                      No matching projects mapped to criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Telemetry Filter Log */}
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="font-display text-xl font-black tracking-tight dark:text-white">Telemetry & Audit Streams</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { value: siteFilter, setter: setSiteFilter, options: sites.map(s => ({ v: s.id, l: s.name })), placeholder: "All Locations" },
                { value: formFilter, setter: setFormFilter, options: forms.map((f: any) => ({ v: f.id, l: f.title })), placeholder: "All Frameworks" },
                { value: statusFilter, setter: setStatusFilter, options: [{ v: "submitted", l: "Validated" }, { v: "draft", l: "Drafts" }, { v: "not_submitted", l: "Missing" }], placeholder: "All Statuses" }
              ].map((filterConfig, index) => (
                <select
                  key={index}
                  value={filterConfig.value}
                  onChange={(e) => filterConfig.setter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                >
                  <option value="all">{filterConfig.placeholder}</option>
                  {filterConfig.options.map(o => (
                    <option key={o.v} value={o.v}>{o.l}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-850 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Audit Checklist</th>
                  <th className="px-4 py-3.5">Project Station</th>
                  <th className="px-4 py-3.5">Assigned Officer</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Verification Date</th>
                  <th className="px-5 py-3.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {submissionsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-cyan-500" />
                    </td>
                  </tr>
                ) : filteredSubmissions.length ? (
                  <AnimatePresence mode="popLayout">
                    {filteredSubmissions.map((r) => (
                      <motion.tr
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={r.id}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-850 group"
                      >
                        <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-100">
                          {r.forms?.title ?? "—"}
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{r.sites?.name ?? "—"}</span>
                          {r.sites?.code && (
                            <span className="ml-2 rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-500">
                              {r.sites.code}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {userNameMap.get(r.user_id) ?? "—"}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-4 font-mono-figures text-xs text-slate-500 dark:text-slate-400">
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            to="/authenticated/$submissionId"
                            params={{ submissionId: r.id }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-cyan-600 hover:text-white hover:border-cyan-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-cyan-500 transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Review
                            <ArrowUpRight className="h-3 w-3 opacity-40 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </Link>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-xs font-medium text-slate-400">
                      No compliant metric logs matching the active scope parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>
      </motion.div>
    </AppShell>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const badgeConfig = useMemo(() => {
    switch(status) {
      case "submitted":
        return "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40";
      case "draft":
        return "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40";
      case "not_submitted":
        return "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/40";
      default:
        return "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40";
    }
  }, [status]);

  const label = status === "not_submitted" ? "Missing" : status;

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${badgeConfig}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}