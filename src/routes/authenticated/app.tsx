import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
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

export const Route = createFileRoute("/authenticated/app")({
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

// --- shared animation variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
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
      <motion.div initial="hidden" animate="show" variants={containerVariants}>
        {/* --- Hero --- */}
        <motion.section
          variants={fadeUp}
          className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-elevated sm:p-8"
        >
          <div className="relative z-10">
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-primary-foreground/75">
              Welcome back
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold sm:text-3xl">
              {currentUser?.full_name ?? "Admin"}
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-primary-foreground/75">
              Here's how compliance is tracking across all sites this reporting period.
            </p>

            {isSuperAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                <Link
                  to="/authenticated/users"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-medium text-primary-foreground backdrop-blur-sm transition-colors hover:bg-white/15"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Manage Admins & Site Users
                </Link>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* --- Stat cards --- */}
        <motion.section variants={containerVariants} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={fadeUp} whileHover={{ y: -2 }} className="card-lift rounded-xl border bg-card p-5 shadow-card hover:card-lift-hover">
            <p className="font-mono-figures text-3xl font-semibold">{totalSites}</p>
            <p className="mt-1 text-xs text-muted-foreground">Active Sites</p>
          </motion.div>
          <motion.div variants={fadeUp} whileHover={{ y: -2 }} className="card-lift rounded-xl border bg-card p-5 shadow-card hover:card-lift-hover">
            <p className="font-mono-figures text-3xl font-semibold">{totalForms}</p>
            <p className="mt-1 text-xs text-muted-foreground">Active Form Types</p>
          </motion.div>
          <motion.div variants={fadeUp} whileHover={{ y: -2 }} className="card-lift rounded-xl border bg-card p-5 shadow-card hover:card-lift-hover">
            <p className="font-mono-figures text-3xl font-semibold text-success">{totalSubmitted}</p>
            <p className="mt-1 text-xs text-muted-foreground">Submitted This Month</p>
          </motion.div>
          <motion.div variants={fadeUp} whileHover={{ y: -2 }} className="card-lift rounded-xl border bg-card p-5 shadow-card hover:card-lift-hover">
            <p className="font-mono-figures text-3xl font-semibold text-gradient-brand">{complianceRate}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Compliance Rate</p>
          </motion.div>
        </motion.section>

        {/* --- Month selector --- */}
        <motion.section variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">
            Reporting Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border bg-card px-3 py-2 text-sm shadow-card transition-colors focus-visible:border-ring"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const value = d.toISOString().slice(0, 7);

              return (
                <option key={value} value={value}>
                  {d.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </option>
              );
            })}
          </select>
        </motion.section>

        {/* --- Forms grid --- */}
        <motion.section variants={fadeUp} className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Environmental Forms</h2>
            <Link
              to="/authenticated/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-card transition-all hover:shadow-glow"
            >
              <Plus className="h-3.5 w-3.5" />
              New Form
            </Link>
          </div>

          {formsLoading ? (
            <p className="text-sm text-muted-foreground">Loading forms…</p>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {forms.map((f: any) => {
                const Icon = ICONS[f.schema?.icon ?? ""] ?? FileText;

                return (
                  <motion.div
                    key={f.id}
                    variants={fadeUp}
                    whileHover={{ y: -3 }}
                    className="card-lift group rounded-xl border bg-card p-5 shadow-card hover:card-lift-hover"
                  >
                    <div className="flex items-start justify-between">
                      <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary-soft text-brand">
                        <Icon className="h-5 w-5" />
                      </div>

                      {!f.is_active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {f.description || "No description"}
                    </p>

                    <div className="mt-4 flex gap-2">
                      <Link
                        to="/authenticated/new"
                        search={{ edit: f.id }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(f.id, f.title)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.section>

        {/* --- Site submission matrix --- */}
        <motion.section variants={fadeUp} className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Site Submission Matrix</h2>
            <span className="text-xs text-muted-foreground">
              Who has submitted what, this month
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/60 px-4 py-3">
                    Site
                  </th>
                  {activeForms.map((f: any) => (
                    <th key={f.id} className="px-4 py-3 text-center">
                      {f.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissionsLoading ? (
                  <tr>
                    <td
                      colSpan={activeForms.length + 1}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    </td>
                  </tr>
                ) : sites.length ? (
                  sites.map((site) => (
                    <tr key={site.id} className="border-t transition-colors hover:bg-muted/30">
                      <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium">
                        {site.name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({site.code})
                        </span>
                      </td>

                      {activeForms.map((f: any) => {
                        const submission = submissionMap.get(
                          `${site.id}__${f.id}`
                        );
                        const status = submission?.status ?? "not_submitted";

                        return (
                          <td key={f.id} className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <StatusBadge status={status} />
                              {submission && (
                                <Link
                                  to="/authenticated/$submissionId"
                                  params={{ submissionId: submission.id }}
                                  className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                                  style={{ color: "var(--current)" }}
                                >
                                  <Eye className="h-3 w-3" />
                                  View
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
                    <td
                      colSpan={activeForms.length + 1}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No sites found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* --- All submissions --- */}
        <motion.section variants={fadeUp} className="mt-8">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">All Submissions</h2>

            <div className="flex flex-wrap gap-2">
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="rounded-lg border bg-card px-3 py-1.5 text-xs shadow-card"
              >
                <option value="all">All Sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={formFilter}
                onChange={(e) => setFormFilter(e.target.value)}
                className="rounded-lg border bg-card px-3 py-1.5 text-xs shadow-card"
              >
                <option value="all">All Forms</option>
                {forms.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border bg-card px-3 py-1.5 text-xs shadow-card"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="draft">Draft</option>
                <option value="not_submitted">Not Submitted</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Form</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Submitted By</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted On</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {submissionsLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    </td>
                  </tr>
                ) : filteredSubmissions.length ? (
                  filteredSubmissions.map((r) => (
                    <tr key={r.id} className="group border-t transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {r.forms?.title ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.sites?.name ?? "—"}
                        {r.sites?.code && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({r.sites.code})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {userNameMap.get(r.user_id) ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 font-mono-figures text-xs text-muted-foreground">
                        {r.submitted_at
                          ? new Date(r.submitted_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/authenticated/$submissionId"
                          params={{ submissionId: r.id }}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No submissions match the selected filters.
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
  const cls =
    status === "submitted"
      ? "bg-success/15 text-success"
      : status === "draft"
      ? "bg-blue-500/15 text-blue-600"
      : status === "not_submitted"
      ? "bg-muted text-muted-foreground"
      : "bg-warning/15 text-warning-foreground";

  const label = status === "not_submitted" ? "Not submitted" : status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {label}
    </span>
  );
}