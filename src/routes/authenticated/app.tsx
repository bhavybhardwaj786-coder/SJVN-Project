import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Droplet, Wind, Trash2, AlertTriangle, Wallet, Trees,
  Fuel, Volume2, Waves, CloudRain, Leaf, MapPinned,
  FileText, Loader2, Plus, Pencil, Eye, UserPlus,
  Search, Download, FileSpreadsheet, FileIcon,
  ChevronDown, Sliders, type LucideIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AppShell } from "@/components/app-shell";
import { formsService } from "@/services";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Import your logo for the PDF
import sjvnLogo from "@/assets/sjvn-logo.jpeg";

const ICONS: Record<string, LucideIcon> = {
  Droplet, Wind, Trash2, AlertTriangle, Wallet, Trees,
  Fuel, Volume2, Waves, CloudRain, Leaf, MapPinned,
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
  data: Record<string, any>;
  forms: { id: string; title: string; schema: any } | null;
  sites: { id: string; name: string; code: string } | null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

function AdminDashboard() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [formSearchQuery, setFormSearchQuery] = useState("");
  const [siteSearchQuery, setSiteSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"matrix" | "forms">("matrix");
  
  // State to handle loading spinners on export buttons
  const [exportingSiteId, setExportingSiteId] = useState<string | null>(null);

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
      const { data, error } = await supabase.from("sites").select("id, name, code").order("name");
      if (error) throw error;
      return data as SiteRow[];
    },
  });
  const sites = sitesResult || [];

  // UPDATED QUERY: Added 'data' and 'forms(..., schema)' for export functionality
  // Also kept the .eq("status", "submitted") to hide drafts
  const { data: submissionsResult, isLoading: submissionsLoading } = useQuery({
    queryKey: ["admin-submissions-by-month", reportingMonthDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          id, status, submitted_at, updated_at, form_id, site_id, user_id, data,
          forms(id, title, schema),
          sites(id, name, code)
        `)
        .eq("reporting_month", reportingMonthDate)
        .eq("status", "submitted") 
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as unknown as SubmissionRow[];
    },
  });
  const submissions = submissionsResult || [];

  const submissionMap = useMemo(() => {
    const map = new Map<string, SubmissionRow>();
    submissions.forEach((s) => {
      if (s.site_id && s.form_id) map.set(`${s.site_id}__${s.form_id}`, s);
    });
    return map;
  }, [submissions]);

  const totalSites = sites.length;
  
  // Find currently selected site object if it exists
  const selectedSiteObj = sites.find(s => s.name.toLowerCase() === siteSearchQuery.toLowerCase());
  const isSiteSelected = !!selectedSiteObj;

  // 1. Dynamic Active Forms calculation based on visibility configuration
  const contextualActiveForms = activeForms.filter(f => {
    // If the form has a specific site visibility array, ensure this site is explicitly whitelisted
    if (f.site_ids && f.site_ids.length > 0) {
      return selectedSiteObj ? f.site_ids.includes(selectedSiteObj.id) : false;
    }
    return true; // public forms
  });

  const totalForms = isSiteSelected ? contextualActiveForms.length : activeForms.length;

  // 2. Filter submissions list down exclusively to the matching site selection state
  const contextualSubmissions = submissions.filter(s => {
    if (selectedSiteObj) {
      return s.site_id === selectedSiteObj.id;
    }
    return true;
  });

  const totalSubmitted = isSiteSelected ? contextualSubmissions.length : submissions.length;

  const displayedForms = forms.filter((f: any) =>
    (f.title || "").toLowerCase().includes(formSearchQuery.toLowerCase())
  );
  const displayedSites = sites.filter((s: SiteRow) =>
    (s.name || "").toLowerCase().includes(siteSearchQuery.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: (formId: string) => formsService.deleteForm(formId),
    onSuccess: () => {
      toast.success("Form deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-all-forms"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete form"),
  });

  const handleDelete = (formId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(formId);
  };

  // --- COMBINED EXPORT LOGIC ---
  const handleCombinedExport = async (site: SiteRow, format: "pdf" | "excel") => {
    // 1. Gather all submitted forms for this specific site
    const siteSubmissions = activeForms
      .map(f => ({ form: f, sub: submissionMap.get(`${site.id}__${f.id}`) }))
      .filter(item => item.sub && item.sub.status === "submitted");

    if (siteSubmissions.length === 0) {
      toast.error("No submitted data available to export for this site yet.");
      return;
    }

    setExportingSiteId(site.id);
    const fileName = `SJVN_Combined_Report_${site.code}_${selectedMonth}`.replace(/\s+/g, "_");
    const monthName = new Date(reportingMonthDate).toLocaleString("default", { month: "long", year: "numeric" });

    try {
      if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");

        const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const rightSideX = pageWidth - 40; 

        // PDF Header
        pdf.addImage(sjvnLogo, "JPEG", 40, 40, 75, 100);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(22);
        pdf.setTextColor(0, 78, 138);
        pdf.text("SJVN Limited", rightSideX, 60, { align: "right" });
        
        pdf.setFontSize(14);
        pdf.text("Combined Environmental Monthly Report", rightSideX, 80, { align: "right" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`Site: ${site.name} (${site.code})`, rightSideX, 100, { align: "right" });
        pdf.text(`Reporting Period: ${monthName}`, rightSideX, 115, { align: "right" });
        pdf.text(`Generated On: ${new Date().toLocaleDateString()}`, rightSideX, 130, { align: "right" });

        let currentY = 180;

        // Loop through each submitted form and draw its table
        siteSubmissions.forEach(({ form, sub }, index) => {
          const fields = sub?.forms?.schema?.fields || [];
          const values = sub?.data || {};

          // If table might overflow, start on a new page (rough estimation)
          if (currentY > 700 && index > 0) {
            pdf.addPage();
            currentY = 40;
          }

          // Section Title
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.setTextColor(0, 78, 138);
          pdf.text(form.title, 40, currentY);
          currentY += 15;

          const tableBody = fields.map((field: any) => [
            field.label || "",
            formatFieldValue(field, values[field.key])
          ]);

          autoTable(pdf, {
            startY: currentY,
            head: [['Parameter', 'Reported Value']],
            body: tableBody.length > 0 ? tableBody : [['No fields defined', '-']],
            theme: 'grid',
            headStyles: { fillColor: [0, 78, 138], textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
            columnStyles: {
              0: { cellWidth: 300 }, 
              1: { cellWidth: 215, halign: 'center' }
            },
            margin: { left: 40, right: 40 },
          });

          // @ts-ignore - autoTable attaches lastAutoTable to the document object
          currentY = pdf.lastAutoTable.finalY + 40; 
        });

        pdf.save(`${fileName}.pdf`);
        toast.success("Combined PDF generated successfully!");

      } else {
        // Excel Export
        const ExcelJSModule = await import("exceljs");
        const ExcelJS = ExcelJSModule.default || ExcelJSModule;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Combined Report");

        sheet.columns = [
          { width: 5 },
          { width: 50 },
          { width: 40 },
        ];

        // Main Header
        const titleRow = sheet.addRow(["", "COMBINED ENVIRONMENTAL MONTHLY REPORT"]);
        titleRow.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF004E8A" } };
        sheet.addRow([]);
        
        sheet.addRow(["", "Project Site:", `${site.name} (${site.code})`]).font = { bold: true };
        sheet.addRow(["", "Reporting Period:", monthName]).font = { bold: true };
        sheet.addRow(["", "Generated On:", new Date().toLocaleDateString()]).font = { bold: true };
        sheet.addRow([]);

        // Form Blocks
        siteSubmissions.forEach(({ form, sub }) => {
          const fields = sub?.forms?.schema?.fields || [];
          const values = sub?.data || {};

          // Form Header Row
          const formTitleRow = sheet.addRow(["", form.title.toUpperCase(), ""]);
          formTitleRow.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
          ['B', 'C'].forEach(col => {
            const cell = sheet.getCell(`${col}${formTitleRow.number}`);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004E8A' } };
            cell.alignment = { vertical: 'middle' };
          });

          // Table Headers
          const colHeaderRow = sheet.addRow(["", "Parameter", "Reported Value"]);
          colHeaderRow.font = { bold: true };
          ['B', 'C'].forEach(col => {
            const cell = sheet.getCell(`${col}${colHeaderRow.number}`);
            cell.border = { bottom: {style:'thin'} };
          });

          // Data Rows
          fields.forEach((field: any) => {
            const val = formatFieldValue(field, values[field.key]);
            const row = sheet.addRow(["", field.label, val]);
            sheet.getCell(`B${row.number}`).alignment = { wrapText: true };
            sheet.getCell(`C${row.number}`).alignment = { horizontal: 'center' };
          });

          sheet.addRow([]); // Spacing between forms
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.setAttribute("href", url);
        link.setAttribute("download", `${fileName}.xlsx`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Combined Excel downloaded successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not generate report document.");
    } finally {
      setExportingSiteId(null);
    }
  };

  return (
    <AppShell>
      <motion.div initial="hidden" animate="show" variants={containerVariants}>
        
        <motion.section variants={fadeUp} className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-elevated sm:p-8">
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
          </div>
        </motion.section>

        {/* --- RE-ENGINEERED COMPLEMENTARY DIRECTORY STATS GRID --- */}
        <motion.section variants={containerVariants} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: Replaced with an Animated Rotating-Border Dropdown Selector */}
          <motion.div variants={fadeUp} className="card-lift rounded-xl border bg-card p-5 shadow-card flex flex-col justify-between">
            <div>
              <p className="font-mono-figures text-3xl font-semibold text-[#095a7d]">{totalSites}</p>
              <p className="mt-1 text-xs text-muted-foreground font-medium">Active Sites Available</p>
            </div>
            
            <div className="mt-3 w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative group w-full h-10 overflow-hidden rounded-lg p-[1.5px] focus:outline-none focus:ring-2 focus:ring-[#095a7d]/50">
                    {/* Animated Rotating Gradient Background Effect */}
                    <span className="absolute inset-0 bg-[conic-gradient(from_0deg,#3FC1A0,#095a7d,#3FC1A0)] animate-[spin_4s_linear_infinite] opacity-75 transition-opacity group-hover:opacity-100" />
                    
                    {/* Inner Button Content Box Layer */}
                    <span className="relative flex items-center justify-between w-full h-full bg-white rounded-[7px] px-3 text-xs font-bold text-slate-700 select-none transition-colors group-hover:bg-slate-50">
                      <span className="truncate">
                        {sites.find(s => s.name.toLowerCase() === siteSearchQuery.toLowerCase())
                          ? `${sites.find(s => s.name.toLowerCase() === siteSearchQuery.toLowerCase())?.name} (${sites.find(s => s.name.toLowerCase() === siteSearchQuery.toLowerCase())?.code})`
                          : "Choose Project Site"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-1 transition-transform group-data-[state=open]:rotate-180" />
                    </span>
                  </button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="start" className="w-[240px] max-h-60 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-lg p-1 z-[60]">
                  <DropdownMenuItem 
                    onClick={() => setSiteSearchQuery("")}
                    className="cursor-pointer text-xs font-semibold text-slate-500 hover:bg-slate-50 px-2 py-2 rounded"
                  >
                    -- Clear Selection --
                  </DropdownMenuItem>
                  {sites.map((site) => (
                    <DropdownMenuItem
                      key={site.id}
                      onClick={() => setSiteSearchQuery(site.name)}
                      className={`cursor-pointer text-xs font-bold text-slate-700 hover:bg-[#eaf3f6] hover:text-[#095a7d] px-2 py-2 rounded mt-0.5 transition-colors ${
                        siteSearchQuery.toLowerCase() === site.name.toLowerCase() ? "bg-[#eaf3f6] text-[#095a7d]" : ""
                      }`}
                    >
                      {site.name} ({site.code})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>

          {/* Card 2: Contextual Active Form Types counter */}
          <motion.div variants={fadeUp} className="card-lift rounded-xl border bg-card p-5 shadow-card flex flex-col justify-between">
            <div>
              <p className="font-mono-figures text-3xl font-semibold">
                {isSiteSelected ? totalForms : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground font-medium">
                {isSiteSelected ? "Active Form Types Assigned" : "Select Site"}
              </p>
            </div>
          </motion.div>

          {/* Card 3: Contextual Submitted This Month tracking counter */}
          <motion.div variants={fadeUp} className="card-lift rounded-xl border bg-card p-5 shadow-card flex flex-col justify-between">
            <div>
              <p className={`font-mono-figures text-3xl font-semibold ${isSiteSelected ? "text-success" : ""}`}>
                {isSiteSelected ? totalSubmitted : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground font-medium">
                {isSiteSelected ? "Submitted This Month" : "Select Site"}
              </p>
            </div>
          </motion.div>

          {/* Card 4: Direct Edit Forms Action Trigger Shortcut */}
          {/* Card 4: Direct Edit Forms Action Trigger Shortcut */}
          <motion.div 
            variants={fadeUp} 
            whileHover={{ y: -2 }}
            onClick={() => setActiveView(activeView === "forms" ? "matrix" : "forms")}
            className={`card-lift rounded-xl border p-5 shadow-card flex flex-col justify-between cursor-pointer transition-all duration-200 ${
              activeView === "forms" 
                ? "border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30" 
                : "border-primary-soft bg-gradient-to-br from-white to-[#f4f9fb] hover:border-primary/40"
            }`}
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-brand shadow-inner">
                <Sliders className="h-4 w-4 text-[#095a7d]" />
              </div>
              <p className="mt-3 text-sm font-bold text-[#095a7d]">
                {activeView === "forms" ? "Back to Table Submissions" : "Edit Form"}
              </p>
            </div>
          </motion.div>
        </motion.section>

        {/* --- Reporting Month Selection Row --- */}
        <motion.section variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Reporting Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border bg-card px-3 py-2 text-sm shadow-card outline-none focus:border-primary"
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

        {/* --- Lower Component Section View Rendering Block --- */}
        {activeView === "matrix" && siteSearchQuery.trim() !== "" && (
          <motion.section variants={fadeUp} className="mt-8 space-y-4">
            
            {/* Form Info Row: Shows the selected site name and its combined export action wrapper */}
            {displayedSites.map((site) => (
              <div key={site.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border bg-white shadow-sm">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Selected Station</span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {site.name} <span className="text-sm font-semibold text-muted-foreground">({site.code})</span>
                  </h3>
                </div>
                
                {/* Combined Export Trigger */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 text-xs font-bold border-primary/20 text-primary hover:bg-primary/10 shrink-0 shadow-sm">
                      {exportingSiteId === site.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                      Export All Forms Combined
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-white border-slate-200 shadow-xl p-1 rounded-lg">
                    <DropdownMenuItem onClick={() => handleCombinedExport(site, "pdf")} className="cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-50 p-2 rounded">
                      <FileIcon className="mr-2 h-4 w-4 text-rose-500" /> Combined PDF Report
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCombinedExport(site, "excel")} className="cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-50 p-2 rounded mt-0.5">
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Combined Excel Sheet
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {/* Re-pivoted Vertical Forms Log Grid */}
            <div className="overflow-hidden rounded-xl border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                  <tr>
                    <th className="px-6 py-3.5 font-bold text-slate-500">Form Metric Type</th>
                    <th className="px-6 py-3.5 font-bold text-center text-slate-500 w-[200px]">Compliance Status</th>
                    <th className="px-6 py-3.5 font-bold text-right text-slate-500 w-[150px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissionsLoading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                      </td>
                    </tr>
                  ) : displayedSites.length > 0 && activeForms.length > 0 ? (
                    // We map the active site reference
                    displayedSites.map((site) => (
                      // And now we loop through the forms vertically as rows!
                      activeForms.map((f: any) => {
                        const submission = submissionMap.get(`${site.id}__${f.id}`);
                        const status = submission?.status ?? "not_submitted";

                        return (
                          <tr key={f.id} className="transition-colors hover:bg-slate-50/40">
                            {/* Column 1: Dynamic Form Name */}
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-800 text-sm">{f.title}</div>
                              {f.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.description}</div>
                              )}
                            </td>

                            {/* Column 2: Status Pill Badge */}
                            <td className="px-6 py-4 text-center">
                              <StatusBadge status={status} />
                            </td>

                            {/* Column 3: View Action Trigger Link */}
                            <td className="px-6 py-4 text-right">
                              {submission ? (
                                <Link 
                                  to="/authenticated/$submissionId" 
                                  params={{ submissionId: submission.id }} 
                                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-primary-soft/40 hover:bg-primary-soft px-3 py-1.5 rounded-md transition-colors"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View Log
                                </Link>
                              ) : (
                                <span className="text-xs font-medium text-slate-400 select-none pr-3">
                                  No Record
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground font-medium">
                        No form metrics are currently assigned or active for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}
      </motion.div>
    </AppShell>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "submitted" ? "bg-success/15 text-success" : status === "draft" ? "bg-blue-500/15 text-blue-600" : status === "not_submitted" ? "bg-muted text-muted-foreground" : "bg-warning/15 text-warning-foreground";
  const label = status === "not_submitted" ? "Not submitted" : status;
  
  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

// Helper to format values for printing
function formatFieldValue(field: any, value: any) {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "checkbox") return value ? "Yes" : "No";
  if (field.type === "select") {
    const opt = field.options?.find((o: any) => o.value === value);
    return opt?.label ?? value;
  }
  return String(value);
}