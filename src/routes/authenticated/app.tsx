import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

function AdminDashboard() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

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
      <section className="rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-elevated">
        <div className="text-xs uppercase tracking-wider text-primary-foreground/80">
          Welcome
        </div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          {currentUser?.full_name ?? "Admin"}
        </h1>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <p className="text-2xl font-bold">{totalSites}</p>
          <p className="text-xs text-muted-foreground">Active Sites</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <p className="text-2xl font-bold">{totalForms}</p>
          <p className="text-xs text-muted-foreground">Active Form Types</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <p className="text-2xl font-bold text-success">{totalSubmitted}</p>
          <p className="text-xs text-muted-foreground">Submitted This Month</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <p className="text-2xl font-bold">{complianceRate}%</p>
          <p className="text-xs text-muted-foreground">Compliance Rate</p>
        </div>
      </section>

      <section className="mt-8 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">
          Reporting Month
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border bg-card px-3 py-2 text-sm shadow-card"
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
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Environmental Forms</h2>
          <Link
            to="/authenticated/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            New Form
          </Link>
        </div>

        {formsLoading ? (
          <p className="text-sm text-muted-foreground">Loading forms…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {forms.map((f: any) => {
              const Icon = ICONS[f.schema?.icon ?? ""] ?? FileText;

              return (
                <div
                  key={f.id}
                  className="group rounded-xl border bg-card p-5 shadow-card"
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

                  <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {f.description || "No description"}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <Link
                      to="/authenticated/new"
                      search={{ edit: f.id }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
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
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Site Submission Matrix</h2>
          <span className="text-xs text-muted-foreground">
            Who has submitted what, this month
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
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
                  <tr key={site.id} className="border-t">
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
                                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
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
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">All Submissions</h2>

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
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
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
                  <tr key={r.id} className="border-t">
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
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.submitted_at
                        ? new Date(r.submitted_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/authenticated/$submissionId"
                        params={{ submissionId: r.id }}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
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
      </section>
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