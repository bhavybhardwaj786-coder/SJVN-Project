import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Wind,
  Droplets,
  Trash2,
  IndianRupee,
  TreePine,
  PawPrint,
  HeartHandshake,
  AlertTriangle,
  FileText,
  MapPin,
  Download,
  FileX2,
  Loader2,
  type LucideIcon,
} from "lucide-react";

import { supabase } from "@/integrations/client";
import { AppShell, useMe } from "@/components/app-shell";

const ICONS: Record<string, LucideIcon> = {
  Wind,
  Droplets,
  Trash2,
  IndianRupee,
  TreePine,
  PawPrint,
  HeartHandshake,
  AlertTriangle,
};

export const Route = createFileRoute("/authenticated/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (roles?.some((r) => r.role === "admin")) throw redirect({ to: "/admin" });
  },
  component: SiteDashboard,
});

// ---- Types (adjust field names to match your actual schema) ----
type SubmissionRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string;
  pdf_path: string | null; // path inside the storage bucket, e.g. "site-1/form-3/2026-07.pdf"
  forms: { id: string; name: string } | null;
  sites: { id: string; name: string; code: string } | null;
  site_users: { full_name: string } | null;
};

// Storage bucket where generated submission PDFs are stored.
// Update this to match your actual bucket name.
const PDF_BUCKET = "submission-pdfs";

// ---- Dummy data (used only as a fallback so the dashboard has something
// to show while wiring up the real Supabase tables — remove once your
// forms/sites/submissions tables are populated) ----

const DUMMY_FORMS = [
  { id: "f1", name: "Air Emission Monitoring", description: "Stack and ambient air emission readings.", icon: "Wind", active: true, sort_order: 1 },
  { id: "f2", name: "Water Quality Monitoring", description: "Effluent and surface water quality parameters.", icon: "Droplets", active: true, sort_order: 2 },
  { id: "f3", name: "Solid Waste Management", description: "Volumes generated, recycled, and disposed.", icon: "Trash2", active: true, sort_order: 3 },
  { id: "f4", name: "Environmental Expenditure", description: "Monthly spend on environmental compliance.", icon: "IndianRupee", active: true, sort_order: 4 },
  { id: "f5", name: "Plantation & CSR Activities", description: "Sapling counts and community initiatives.", icon: "TreePine", active: true, sort_order: 5 },
  { id: "f6", name: "Hazardous Waste Report", description: "Hazardous material generation and handling.", icon: "AlertTriangle", active: true, sort_order: 6 },
] as const;

const DUMMY_SITES = [
  { id: "s1", name: "Nathpa Jhakri HPS", code: "NJHPS" },
  { id: "s2", name: "Rampur HPS", code: "RHPS" },
  { id: "s3", name: "Baspa-II HPS", code: "BHPS" },
  { id: "s4", name: "Naitwar Mori HPS", code: "NMHPS" },
] as const;

// Deterministic dummy submissions so the matrix + table both have
// realistic mixed statuses (submitted / draft / pending / missing)
const DUMMY_SUBMISSIONS: SubmissionRow[] = [
  { id: "sub1", status: "submitted", submitted_at: "2026-07-03T10:15:00Z", updated_at: "2026-07-03T10:15:00Z", pdf_path: "dummy/njhps-air.pdf", forms: { id: "f1", name: "Air Emission Monitoring" }, sites: { id: "s1", name: "Nathpa Jhakri HPS", code: "NJHPS" }, site_users: { full_name: "Ramesh Thakur" } },
  { id: "sub2", status: "submitted", submitted_at: "2026-07-04T09:00:00Z", updated_at: "2026-07-04T09:00:00Z", pdf_path: "dummy/njhps-water.pdf", forms: { id: "f2", name: "Water Quality Monitoring" }, sites: { id: "s1", name: "Nathpa Jhakri HPS", code: "NJHPS" }, site_users: { full_name: "Ramesh Thakur" } },
  { id: "sub3", status: "draft", submitted_at: null, updated_at: "2026-07-05T14:30:00Z", pdf_path: null, forms: { id: "f3", name: "Solid Waste Management" }, sites: { id: "s1", name: "Nathpa Jhakri HPS", code: "NJHPS" }, site_users: { full_name: "Ramesh Thakur" } },
  { id: "sub4", status: "submitted", submitted_at: "2026-07-02T11:45:00Z", updated_at: "2026-07-02T11:45:00Z", pdf_path: "dummy/rhps-air.pdf", forms: { id: "f1", name: "Air Emission Monitoring" }, sites: { id: "s2", name: "Rampur HPS", code: "RHPS" }, site_users: { full_name: "Sunita Verma" } },
  { id: "sub5", status: "pending", submitted_at: null, updated_at: "2026-07-01T08:00:00Z", pdf_path: null, forms: { id: "f2", name: "Water Quality Monitoring" }, sites: { id: "s2", name: "Rampur HPS", code: "RHPS" }, site_users: { full_name: "Sunita Verma" } },
  { id: "sub6", status: "submitted", submitted_at: "2026-07-06T16:20:00Z", updated_at: "2026-07-06T16:20:00Z", pdf_path: "dummy/rhps-csr.pdf", forms: { id: "f5", name: "Plantation & CSR Activities" }, sites: { id: "s2", name: "Rampur HPS", code: "RHPS" }, site_users: { full_name: "Sunita Verma" } },
  { id: "sub7", status: "submitted", submitted_at: "2026-07-05T13:10:00Z", updated_at: "2026-07-05T13:10:00Z", pdf_path: "dummy/bhps-expenditure.pdf", forms: { id: "f4", name: "Environmental Expenditure" }, sites: { id: "s3", name: "Baspa-II HPS", code: "BHPS" }, site_users: { full_name: "Anil Negi" } },
  { id: "sub8", status: "submitted", submitted_at: "2026-07-07T10:00:00Z", updated_at: "2026-07-07T10:00:00Z", pdf_path: "dummy/bhps-hazardous.pdf", forms: { id: "f6", name: "Hazardous Waste Report" }, sites: { id: "s3", name: "Baspa-II HPS", code: "BHPS" }, site_users: { full_name: "Anil Negi" } },
  { id: "sub9", status: "draft", submitted_at: null, updated_at: "2026-07-06T12:00:00Z", pdf_path: null, forms: { id: "f1", name: "Air Emission Monitoring" }, sites: { id: "s3", name: "Baspa-II HPS", code: "BHPS" }, site_users: { full_name: "Anil Negi" } },
  { id: "sub10", status: "pending", submitted_at: null, updated_at: "2026-06-28T09:30:00Z", pdf_path: null, forms: { id: "f3", name: "Solid Waste Management" }, sites: { id: "s4", name: "Naitwar Mori HPS", code: "NMHPS" }, site_users: { full_name: "Priya Chauhan" } },
];

function SiteDashboard() {
  const { data: me, isLoading } = useMe();

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [formFilter, setFormFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Active forms available in the system
  const { data: forms } = useQuery({
    queryKey: ["forms-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const displayForms = forms?.length ? forms : DUMMY_FORMS;

  // All sites (for the matrix rows + filter dropdown)
  const { data: sites } = useQuery({
    queryKey: ["sites-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, code")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const displaySites = sites?.length ? sites : DUMMY_SITES;

  // All submissions for the selected month, across every site
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["all-submissions", selectedMonth],
    queryFn: async () => {
      const start = `${selectedMonth}-01`;
      const startDate = new Date(start);
      const end = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from("submissions")
        .select(
          "id, status, submitted_at, updated_at, pdf_path, forms(id, name), sites(id, name, code), site_users(full_name)"
        )
        .gte("updated_at", start)
        .lt("updated_at", end)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as SubmissionRow[];
    },
  });
  const displaySubmissions = submissions?.length ? submissions : DUMMY_SUBMISSIONS;
  const usingDummyData =
    !submissionsLoading && !submissions?.length && !sites?.length && !forms?.length;

  // Quick lookup: siteId + formId -> submission
  const submissionMap = useMemo(() => {
    const map = new Map<string, SubmissionRow>();
    displaySubmissions.forEach((s) => {
      if (s.sites?.id && s.forms?.id) {
        map.set(`${s.sites.id}__${s.forms.id}`, s);
      }
    });
    return map;
  }, [displaySubmissions]);

  // Filtered list for the detailed table
  const filteredSubmissions = useMemo(() => {
    return displaySubmissions.filter((s) => {
      if (siteFilter !== "all" && s.sites?.id !== siteFilter) return false;
      if (formFilter !== "all" && s.forms?.id !== formFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [displaySubmissions, siteFilter, formFilter, statusFilter]);

  // Summary stats
  const totalSites = displaySites?.length ?? 0;
  const totalForms = displayForms?.length ?? 0;
  const totalExpected = totalSites * totalForms;
  const totalSubmitted =
    displaySubmissions.filter((s) => s.status === "submitted").length ?? 0;
  const complianceRate =
    totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0;

  async function handleDownloadPdf(row: SubmissionRow) {
    if (!row.pdf_path) {
      toast.error("No PDF available for this submission yet.");
      return;
    }
    if (row.pdf_path.startsWith("dummy/")) {
      toast.info("This is sample data — connect real submissions to enable PDF downloads.");
      return;
    }
    setDownloadingId(row.id);
    try {
      const { data, error } = await supabase.storage
        .from(PDF_BUCKET)
        .createSignedUrl(row.pdf_path, 60);

      if (error || !data?.signedUrl) {
        toast.error("Couldn't generate the PDF link. Please try again.");
        return;
      }
      window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Something went wrong while fetching the PDF.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <AppShell>
      {/* Site header */}
      <section className="rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-elevated">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-primary-foreground/80">
              Welcome
            </div>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {me?.profile?.full_name ?? me?.user.email}
            </h1>
            {isLoading ? null : me?.sites?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {me.sites.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {s.name} · {s.code}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-primary-foreground/85">
                No site assigned yet. An administrator will assign your site shortly.
              </p>
            )}
          </div>
        </div>
      </section>

      {usingDummyData && (
        <div className="mt-4 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning-foreground">
          Showing sample data — connect your forms, sites, and submissions tables to replace this with live data.
        </div>
      )}

      {/* Summary stats */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <p className="text-2xl font-bold">{totalSites}</p>
          <p className="text-xs text-muted-foreground">Active Sites</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <p className="text-2xl font-bold">{totalForms}</p>
          <p className="text-xs text-muted-foreground">Form Types</p>
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

      {/* Month selector */}
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
                {d.toLocaleString("default", { month: "long", year: "numeric" })}
              </option>
            );
          })}
        </select>
      </section>

      {/* Forms */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Environmental Forms</h2>
          <span className="text-xs text-muted-foreground">
            {displayForms.length} available
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayForms.map((f) => {
            const Icon = ICONS[f.icon ?? ""] ?? FileText;
            return (
              <Link
                key={f.id}
                to="/forms/$formId"
                params={{ formId: f.id }}
                className="group rounded-xl border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary-soft text-brand transition group-hover:bg-brand group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {f.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Site x Form submission matrix */}
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
                <th className="sticky left-0 z-10 bg-muted/60 px-4 py-3">Site</th>
                {displayForms.map((f) => (
                  <th key={f.id} className="px-4 py-3 text-center">
                    {f.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissionsLoading && !usingDummyData ? (
                <tr>
                  <td
                    colSpan={displayForms.length + 1}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </td>
                </tr>
              ) : displaySites.length ? (
                displaySites.map((site) => (
                  <tr key={site.id} className="border-t">
                    <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium">
                      {site.name}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({site.code})
                      </span>
                    </td>
                    {displayForms.map((f) => {
                      const submission = submissionMap.get(`${site.id}__${f.id}`);
                      const status = submission?.status ?? "not_submitted";
                      return (
                        <td key={f.id} className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <StatusBadge status={status} />
                            {submission?.pdf_path ? (
                              <button
                                onClick={() => handleDownloadPdf(submission)}
                                disabled={downloadingId === submission.id}
                                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline disabled:opacity-50"
                              >
                                {downloadingId === submission.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                                PDF
                              </button>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={displayForms.length + 1}
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

      {/* Detailed submissions list */}
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
              {displaySites.map((s) => (
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
              {displayForms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
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
              <option value="pending">Pending</option>
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
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody>
              {submissionsLoading && !usingDummyData ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </td>
                </tr>
              ) : filteredSubmissions.length ? (
                filteredSubmissions.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{r.forms?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.sites?.name ?? "—"}
                      {r.sites?.code ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({r.sites.code})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.site_users?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.submitted_at
                        ? new Date(r.submitted_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.updated_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.pdf_path ? (
                        <button
                          onClick={() => handleDownloadPdf(r)}
                          disabled={downloadingId === r.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
                        >
                          {downloadingId === r.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Download
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileX2 className="h-3.5 w-3.5" />
                          Not available
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
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