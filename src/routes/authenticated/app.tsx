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
  Calendar,
  Search,
  Home,
  LogOut,
  LayoutDashboard,
  Files,
  Droplet,
  type LucideIcon,
} from "lucide-react";

import sjvnLogo from "@/assets/sjvn-logo.jpeg";
import { supabase } from "@/integrations/client";
import { useMe } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

// ---- Types ----
type SubmissionRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string;
  pdf_path: string | null; 
  forms: { id: string; name: string } | null;
  sites: { id: string; name: string; code: string } | null;
  site_users: { full_name: string } | null;
};

const PDF_BUCKET = "submission-pdfs";

// ---- Dummy data ----
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

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });
  const userEmail = session?.user?.email ?? me?.email ?? "superadmin@sjvn.com";

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
  const usingDummyData = !submissionsLoading && !submissions?.length && !sites?.length && !forms?.length;

  const submissionMap = useMemo(() => {
    const map = new Map<string, SubmissionRow>();
    displaySubmissions.forEach((s) => {
      if (s.sites?.id && s.forms?.id) {
        map.set(`${s.sites.id}__${s.forms.id}`, s);
      }
    });
    return map;
  }, [displaySubmissions]);

  const filteredSubmissions = useMemo(() => {
    return displaySubmissions.filter((s) => {
      if (siteFilter !== "all" && s.sites?.id !== siteFilter) return false;
      if (formFilter !== "all" && s.forms?.id !== formFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [displaySubmissions, siteFilter, formFilter, statusFilter]);

  const totalSites = displaySites?.length ?? 0;
  const totalFormsCount = displayForms?.length ?? 0;
  const totalExpected = totalSites * totalFormsCount;
  
  const countSubmitted = displaySubmissions.filter((s) => s.status === "submitted").length;
  const countPending = displaySubmissions.filter((s) => s.status === "pending").length;
  const countDraft = displaySubmissions.filter((s) => s.status === "draft").length;

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

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] font-sans">
      
      {/* --- NEW DASHBOARD HEADER --- */}
      <header className="w-full flex flex-col font-sans shrink-0 shadow-sm">
        {/* 1. Top Dark Blue Bar */}
        <div className="bg-[#003f7a] text-white py-1.5 px-6 flex justify-between items-center text-xs font-semibold">
          <div>Government of India · SJVN Limited</div>
          <div>EMEMP · Secure Portal</div>
        </div>

        {/* 2. Main White Navigation Bar */}
        <div className="bg-white border-b py-3 px-6 flex justify-between items-center">
          {/* Left: Branding & Titles */}
          <div className="flex items-center gap-3">
            <div className="border border-gray-200 rounded p-1 shadow-sm">
              <img 
                src={sjvnLogo} 
                alt="SJVN Logo" 
                className="w-10 h-10 object-contain" 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[#003f7a] font-bold text-lg leading-tight tracking-wide">
                SJVN · EMEMP
              </span>
              <span className="text-gray-500 text-xs font-medium mt-0.5">
                Environmental Monitoring & Expenditure Management
              </span>
            </div>
          </div>

          {/* Right: User Info & Sign Out */}
          <div className="flex items-center gap-5">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-gray-900 leading-tight">
                {userEmail}
              </span>
              <span className="text-xs text-gray-500">
                {userEmail}
              </span>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 shadow-sm rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut size={16} className="text-gray-600" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* --- DASHBOARD CONTENT --- */}
      <div className="flex flex-1 gap-8 p-8 mx-auto w-full max-w-[1400px]">
        
        <aside className="w-[260px] shrink-0">
          <div className="rounded-xl bg-white p-3 shadow-sm border border-black/5">
            <nav className="flex flex-col gap-1">
              <a href="#" className="flex items-center gap-3 rounded-lg bg-[#003f7a]/10 px-3 py-2.5 text-sm font-bold text-[#003f7a]">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </a>
              <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-black/5 transition-colors">
                <Files className="h-4 w-4" />
                My Submissions
              </a>
            </nav>
          </div>
        </aside>

        <main className="flex-1 space-y-8">
          
          <section className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Environmental Compliance Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete and submit monthly environmental compliance reports.
            </p>
          </section>

          <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
            <label className="mb-3 block text-sm font-bold text-gray-900">
              Select Reporting Month
            </label>
            <div className="relative max-w-[280px]">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full appearance-none rounded-lg border bg-background py-2.5 pl-9 pr-10 text-sm shadow-sm outline-none focus:border-[#003f7a] focus:ring-1 focus:ring-[#003f7a]"
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
            </div>
          </section>

          {usingDummyData && (
            <div className="mb-6 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning-foreground">
              Showing sample data — connect your forms, sites, and submissions tables to replace this with live data.
            </div>
          )}

          <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-8 shadow-sm">
              <p className="text-4xl font-extrabold text-gray-900">{totalExpected}</p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">Total Forms</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-8 shadow-sm">
              <p className="text-4xl font-extrabold text-[#008a00]">{countSubmitted}</p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">Submitted</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-8 shadow-sm">
              <p className="text-4xl font-extrabold text-[#ff6600]">{countPending}</p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">Pending</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-8 shadow-sm">
              <p className="text-4xl font-extrabold text-[#0055ff]">{countDraft}</p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">Draft</p>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-gray-900">Required Monthly Forms</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayForms.map((f) => {
                const Icon = ICONS[f.icon ?? ""] ?? FileText;
                return (
                  <Link
                    key={f.id}
                    to="/forms/$formId"
                    params={{ formId: f.id }}
                    className="group rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#f0f7ff] text-[#003f7a] transition group-hover:bg-[#003f7a] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-gray-900">{f.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {f.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-gray-900">Site Submission Matrix</h2>
              <span className="text-xs text-muted-foreground">
                Who has submitted what, this month
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 border-r">Site</th>
                    {displayForms.map((f) => (
                      <th key={f.id} className="px-4 py-3 text-center">
                        {f.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissionsLoading && !usingDummyData && (
                    <tr>
                      <td colSpan={displayForms.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      </td>
                    </tr>
                  )}
                  
                  {!submissionsLoading && displaySites.length > 0 && displaySites.map((site) => (
                    <tr key={site.id} className="border-t">
                      <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium border-r text-gray-900">
                        {site.name}
                        <span className="ml-1 text-xs text-gray-500 block">
                          ({site.code})
                        </span>
                      </td>
                      {displayForms.map((f) => {
                        const submission = submissionMap.get(`${site.id}__${f.id}`);
                        const status = submission?.status ?? "not_submitted";
                        return (
                          <td key={f.id} className="px-4 py-3 text-center align-middle">
                            <div className="flex flex-col items-center gap-2">
                              <StatusBadge status={status} />
                              {submission?.pdf_path ? (
                                <button
                                  onClick={() => handleDownloadPdf(submission)}
                                  disabled={downloadingId === submission.id}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[#003f7a] hover:underline disabled:opacity-50"
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
                  ))}

                  {!submissionsLoading && displaySites.length === 0 && (
                    <tr>
                      <td colSpan={displayForms.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                        No sites found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-900">All Submissions</h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="rounded-lg border bg-white px-3 py-1.5 text-xs shadow-sm focus:border-[#003f7a] focus:ring-1 focus:ring-[#003f7a] outline-none"
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
                  className="rounded-lg border bg-white px-3 py-1.5 text-xs shadow-sm focus:border-[#003f7a] focus:ring-1 focus:ring-[#003f7a] outline-none"
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
                  className="rounded-lg border bg-white px-3 py-1.5 text-xs shadow-sm focus:border-[#003f7a] focus:ring-1 focus:ring-[#003f7a] outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
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
                  {submissionsLoading && !usingDummyData && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      </td>
                    </tr>
                  )}
                  
                  {!submissionsLoading && filteredSubmissions.length > 0 && filteredSubmissions.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.forms?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.sites?.name ?? "—"}
                        {r.sites?.code ? (
                          <span className="ml-1 text-xs text-gray-500">
                            ({r.sites.code})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.site_users?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.submitted_at
                          ? new Date(r.submitted_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(r.updated_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.pdf_path ? (
                          <button
                            onClick={() => handleDownloadPdf(r)}
                            disabled={downloadingId === r.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition hover:bg-gray-50 disabled:opacity-50 text-gray-700"
                          >
                            {downloadingId === r.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            Download
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                            <FileX2 className="h-3.5 w-3.5" />
                            Not available
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {!submissionsLoading && filteredSubmissions.length === 0 && (
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

        </main>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "submitted"
      ? "bg-green-100 text-green-700"
      : status === "draft"
      ? "bg-blue-100 text-blue-700"
      : status === "not_submitted"
      ? "bg-gray-100 text-gray-600"
      : "bg-orange-100 text-orange-700";

  const label = status === "not_submitted" ? "Not Started" : status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}
    >
      {label}
    </span>
  );
}