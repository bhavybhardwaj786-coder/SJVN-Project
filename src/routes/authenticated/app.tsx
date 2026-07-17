import { createFileRoute, Link , redirect, useNavigate  } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { motion } from "framer-motion";


import {
  Droplet, Wind, Trash2, AlertTriangle, Wallet, Trees,
  Fuel, Volume2, Waves, CloudRain, Leaf, MapPinned,
  FileText, Loader2, Plus, Pencil, Eye, UserPlus,
  Search, Download, FileSpreadsheet, FileIcon,
  ListChecks, CheckCircle2, Layers,
  ChevronDown, Sliders, FolderDown, AlertCircle, Clock,
  type LucideIcon,
  Users, LayoutGrid, ArrowLeft,
  Lock, Unlock,
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

import { authService } from "@/services/auth";

export const Route = createFileRoute("/authenticated/app")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    site: (search.site as string) || "",
  }),
  beforeLoad: async () => {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw redirect({ to: "/auth" });
    }
    const hasAdminAccess = user.role === "admin" || user.role === "super_admin";
    if (!hasAdminAccess) {
      throw redirect({ to: "/authenticated/site" });
    }
  },
  component: AdminDashboard,
});

type SiteRow = { id: string; name: string; code: string; unlocked_months?: string[] };

type SubmissionRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string;
  form_id: string;
  site_id: string;
  user_id: string;
  submitted_by_role: string;
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

  const [zippingId, setZippingId] = useState<string | null>(null);

  const handleDownloadAttachmentsZip = async (submission: any, siteName: string, formTitle: string) => {
    if (!submission?.data) return;
    
    const filesData = submission.data;
    const fields = submission.forms?.schema?.fields || [];
    
    // Collect all valid multi-file attachment lists from form parameters
    const allAttachments: { url: string; name: string; paramLabel: string }[] = [];
    
    fields.forEach((field: any) => {
      const fieldFiles = filesData[`${field.key}_files`] || [];
      fieldFiles.forEach((file: any) => {
        if (file.url && file.name) {
          allAttachments.push({
            url: file.url,
            name: file.name,
            paramLabel: field.label || field.key
          });
        }
      });
    });

    if (allAttachments.length === 0) {
      toast.error("No attachments exist for this submission log.");
      return;
    }

    setZippingId(submission.id);
    const toastId = toast.loading("Generating secure access links and building archive...");

    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      
      const monthFolderStr = `SJVN_${siteName.replace(/\s+/g, "_")}_${selectedMonth}`;
      const mainFolder = zip.folder(monthFolderStr);

      // Fetch all remote cloud files using secure Supabase Signed URLs
      const downloadPromises = allAttachments.map(async (fileInfo, idx) => {
        try {
          // 1. Identify the storage path: use explicit property if present, otherwise fallback
          let relativePath = (fileInfo as any).storagePath || "";
          
          if (!relativePath) {
            const searchToken = "/storage/v1/object/public/attachments/";
            if (fileInfo.url.includes(searchToken)) {
              relativePath = fileInfo.url.split(searchToken)[1];
            } else {
              const parts = fileInfo.url.split("/attachments/");
              relativePath = parts[parts.length - 1];
            }
          }

          relativePath = relativePath.split("?")[0].split("#")[0];
          relativePath = decodeURIComponent(relativePath);

          if (!relativePath) {
            throw new Error("Unable to parse file location token.");
          }

          // 2. Request a short-lived signed authentication token URL directly from the SDK
          const { data: signData, error: signError } = await supabase.storage
            .from("attachments")
            .createSignedUrl(relativePath, 60);

          if (signError || !signData?.signedUrl) {
            console.error(`Storage lookup failed for path: ${relativePath}`, signError);
            throw signError || new Error("Failed to generate authorization download token.");
          }

          // 3. Download the authenticated asset via the signed token securely
          const response = await fetch(signData.signedUrl);
          if (!response.ok) {
            throw new Error(`HTTP Asset Fetch Failed: ${response.status}`);
          }
          
          const fileBlob = await response.blob();

          // 4. Sanitize naming parameters inside the target ZIP file structure
          const cleanedParamLabel = fileInfo.paramLabel.replace(/[^a-zA-Z0-9]/g, "_");
          const cleanFileName = fileInfo.name.replace(/\s+/g, "_");
          const dynamicFileName = `${String(idx + 1).padStart(2, '0')}_${cleanedParamLabel}_${cleanFileName}`;
          
          mainFolder?.file(dynamicFileName, fileBlob);
        } catch (fileFetchError: any) {
          console.error(`Download process failure on target object: ${fileInfo.name}`, fileFetchError);
          throw new Error(`${fileInfo.name} -> ${fileFetchError.message || 'Not Found'}`);
        }
      });

      await Promise.all(downloadPromises);

      const contentBlob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(contentBlob);
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${monthFolderStr}_Attachments.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("ZIP archive compiled and downloaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(`ZIP Compilation Interrupted: ${err.message || 'Permission Error'}`, { id: toastId });
    } finally {
      setZippingId(null);
    }
  };

  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [formSearchQuery, setFormSearchQuery] = useState("");
  const { site: siteSearchQuery } = Route.useSearch();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<"matrix" | "forms">("matrix");

  // NEW: once a site is selected, choose whether to browse its submissions
  // grouped by form ("site") or grouped by who submitted them ("contractor").
  const [siteViewMode, setSiteViewMode] = useState<"site" | "contractor">("site");
  // NEW: which contractor is currently drilled into, when in contractor mode.
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  
  // State to handle loading spinners on export buttons
  const [exportingSiteId, setExportingSiteId] = useState<string | null>(null);

  // NEW: bulk portal access selection
  const [bulkSiteIds, setBulkSiteIds] = useState<Set<string>>(new Set());
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);

  const reportingMonthDate = `${selectedMonth}-01`;

  const { data: formsResult, isLoading: formsLoading } = useQuery({
    queryKey: ["admin-all-forms"],
    queryFn: () => formsService.getAllForms(),
  });
  const forms = formsResult?.data || [];
  const activeForms = forms.filter((f: any) => f.is_active);

  // 2. Update the query inside AdminDashboard to fetch the new column
  const { data: sitesResult } = useQuery({
    queryKey: ["all-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, code, unlocked_months") // Added unlocked_months
        .order("name");
      if (error) throw error;
      return data as SiteRow[];
    },
  });
  const sites = sitesResult || [];

  // Submissions for the selected reporting month. submitted_by_role tells us
  // whether each row came from the site-user flow or the contractor flow,
  // so the two tabs below never collide on the same site_id + form_id key.
  const { data: submissionsResult, isLoading: submissionsLoading } = useQuery({
    queryKey: ["admin-submissions-by-month", reportingMonthDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          id, status, submitted_at, updated_at, form_id, site_id, user_id, data, submitted_by_role,
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

  // Resolve contractor display names via a direct lookup against the
  // `contractors` table, keyed on the user_ids seen in this month's submissions.
  const submitterIds = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.user_id).filter(Boolean))),
    [submissions]
  );

  const { data: contractorRows } = useQuery({
    queryKey: ["contractor-names", submitterIds],
    queryFn: async () => {
      if (submitterIds.length === 0) return [];
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .in("id", submitterIds);
      if (error) throw error;
      return data || [];
    },
    enabled: submitterIds.length > 0,
  });

  const contractorNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (contractorRows || []).forEach((row: any) => {
      const name =
        row.full_name || row.name || row.contractor_name || row.company_name || null;
      if (!name) return;
      if (row.id) map.set(row.id, name);
      if (row.user_id) map.set(row.user_id, name);
    });
    return map;
  }, [contractorRows]);

  // Site-only submission matrix, keyed by site_id__form_id. Filtering on
  // submitted_by_role instead of guessing by id set means a contractor's
  // submission of the same form can never overwrite the site user's here.
  const submissionMap = useMemo(() => {
    const map = new Map<string, SubmissionRow>();
    submissions
      .filter((s) => s.submitted_by_role === "site")
      .forEach((s) => {
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

  // Contractors who submitted something for the selected site this month,
  // with a count of how many forms each one submitted. Filtered strictly to
  // submitted_by_role === "contractor" so a site user never appears here.
  const siteContractors = useMemo(() => {
    if (!selectedSiteObj) return [];
    const byUser = new Map<string, { id: string; name: string; count: number }>();
    contextualSubmissions
      .filter((s) => s.submitted_by_role === "contractor")
      .forEach((s) => {
        const id = s.user_id;
        if (!id) return;
        const name = contractorNameMap.get(id) || "Unnamed Contractor";
        const existing = byUser.get(id);
        if (existing) {
          existing.count += 1;
        } else {
          byUser.set(id, { id, name, count: 1 });
        }
      });
    return Array.from(byUser.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [contextualSubmissions, selectedSiteObj, contractorNameMap]);

  // NEW: when drilled into a contractor, only that contractor's submissions
  const contractorSubmissions = useMemo(() => {
    if (!selectedContractorId) return [];
    return contextualSubmissions.filter((s) => s.user_id === selectedContractorId);
  }, [contextualSubmissions, selectedContractorId]);

  const selectedContractor = siteContractors.find((c) => c.id === selectedContractorId) || null;

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

  const toggleMonthLockMutation = useMutation({
  mutationFn: async ({ siteId, month, isCurrentlyUnlocked }: { siteId: string, month: string, isCurrentlyUnlocked: boolean }) => {
    const site = sites.find(s => s.id === siteId);
    let updatedMonths = site?.unlocked_months ? [...site.unlocked_months] : [];

    if (isCurrentlyUnlocked) {
      updatedMonths = updatedMonths.filter(m => m !== month);
    } else {
      if (!updatedMonths.includes(month)) {
        updatedMonths.push(month);
      }
    }

    const { data: updatedData, error } = await supabase
      .from("sites")
      .update({ unlocked_months: updatedMonths })
      .eq("id", siteId)
      .select();

    if (error) throw error;

    if (!updatedData || updatedData.length === 0) {
      throw new Error("Update was blocked by database permissions (RLS). No changes were saved.");
    }

    return updatedMonths;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["all-sites"] });
    toast.success("Site portal access updated successfully!");
  },
  onError: (err: any) => {
    console.error("Lock error detail:", err);
    toast.error(err.message || "Failed to update access.");
  }
});

const bulkToggleLockMutation = useMutation({
  // ... your existing bulk mutation code stays exactly as-is below this line
  mutationFn: async ({ siteIds, month, action }: { siteIds: string[]; month: string; action: "lock" | "unlock" }) => {
    const targets = sites.filter((s) => siteIds.includes(s.id));

    const updates = await Promise.all(
      targets.map(async (site) => {
        let updatedMonths = site.unlocked_months ? [...site.unlocked_months] : [];

        if (action === "unlock") {
          if (!updatedMonths.includes(month)) updatedMonths.push(month);
        } else {
          updatedMonths = updatedMonths.filter((m) => m !== month);
        }

        const { data, error } = await supabase
          .from("sites")
          .update({ unlocked_months: updatedMonths })
          .eq("id", site.id)
          .select();

        if (error) throw new Error(`${site.name}: ${error.message}`);
        if (!data || data.length === 0) {
          throw new Error(`${site.name}: update blocked by database permissions.`);
        }
        return site.id;
      })
    );

    return updates;
  },
  onSuccess: (updatedIds, variables) => {
    queryClient.invalidateQueries({ queryKey: ["all-sites"] });
    toast.success(
      `${variables.action === "unlock" ? "Unlocked" : "Locked"} portal for ${updatedIds.length} site(s).`
    );
  },
  onError: (err: any) => {
    console.error("Bulk lock error:", err);
    toast.error(err.message || "Failed to update one or more sites.");
  },
});

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

        // 1. Logo placement on the left
        pdf.addImage(sjvnLogo, "JPEG", 40, 40, 70, 92);

        // 2. Top rule line, spanning the full page width
        const topRuleY = 30;
        pdf.setDrawColor(0, 78, 138);
        pdf.setLineWidth(1.5);
        pdf.line(40, topRuleY, pageWidth - 40, topRuleY);

        // 3. Header text block, right-aligned against the right margin
        let headerY = 55;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(20);
        pdf.setTextColor(0, 78, 138);
        pdf.text("SJVN LIMITED", rightSideX, headerY, { align: "right" });

        headerY += 16;
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(9);
        pdf.setTextColor(90, 90, 90);
        pdf.text("(A Joint Venture of Govt. of India & Govt. of Himachal Pradesh)", rightSideX, headerY, { align: "right" });

        headerY += 14;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(110, 110, 110);
        pdf.text("ISO 9001:2015 Certified  ·  CIN: L40101HP1988GOI008409", rightSideX, headerY, { align: "right" });

        headerY += 14;
        pdf.text("Corporate Headquarter, Shimla, HP, 171006", rightSideX, headerY, { align: "right" });

        headerY += 14;
        pdf.text("Website: www.sjvn.nic.in", rightSideX, headerY, { align: "right" });

        // 4. Divider line under the header block
        const dividerY = 148;
        pdf.setDrawColor(0, 78, 138);
        pdf.setLineWidth(1.2);
        pdf.line(40, dividerY, pageWidth - 40, dividerY);

        // 5. Centered report title below the divider
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(15);
        pdf.setTextColor(0, 78, 138);
        pdf.text("Combined Environmental Monthly Report", pageWidth / 2, dividerY + 26, { align: "center" });

        // 6. Metadata block below the title, shown as a small bordered table
        autoTable(pdf, {
          startY: dividerY + 40,
          body: [
            ["Site", `${site.name} (${site.code})`],
            ["Reporting Period", monthName],
            ["Generated On", new Date().toLocaleDateString()],
          ],
          theme: 'grid',
          styles: {
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 6,
            lineColor: [200, 200, 200],
            lineWidth: 0.5,
            textColor: [60, 60, 60],
          },
          columnStyles: {
            0: { cellWidth: 140, fontStyle: 'bold', fillColor: [235, 240, 247], textColor: [0, 78, 138] },
            1: { cellWidth: 360 },
          },
          margin: { left: (pageWidth - 500) / 2 },
        });

        // @ts-ignore - autoTable attaches lastAutoTable to the document object
        let currentY = pdf.lastAutoTable.finalY + 30;

        // Loop through each submitted form and draw its table
        siteSubmissions.forEach(({ form, sub }, index) => {
          const fields = sub?.forms?.schema?.fields || [];
          const values = sub?.data || {};

          // If table might overflow, start on a new page (rough estimation)
          if (currentY > 700 && index > 0) {
            pdf.addPage();
            currentY = 60;
          }

          // Section Title
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.setTextColor(0, 78, 138);
          pdf.text(form.title, pageWidth / 2, currentY, { align: "center" });
          currentY += 15;

          const tableBody = fields.map((field: any) => [
            field.label || "",
            formatFieldValue(field, values[field.key])
          ]);

          autoTable(pdf, {
            startY: currentY,
            head: [['Field Parameter', 'Reported Value']],
            body: tableBody.length > 0 ? tableBody : [['No fields defined', '-']],
            theme: 'grid',
            headStyles: {
              fillColor: [0, 78, 138],
              textColor: 255,
              fontStyle: 'bold',
              halign: 'center'
            },
            styles: {
              font: 'helvetica',
              fontSize: 10,
              cellPadding: 8,
              lineColor: [200, 200, 200],
              lineWidth: 0.5,
            },
            columnStyles: {
              0: { cellWidth: 250, halign: 'center' },
              1: { cellWidth: 250, halign: 'center' }
            },
            margin: { left: (pageWidth - 500) / 2 },
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

  // NEW: whenever the selected site changes, reset the contractor drill-down
  // so stale selections from a previous site don't linger.
  const handleSelectSite = (name: string) => {
  navigate({
    search: (prev) => ({ ...prev, site: name }),
    replace: true,
  });
  setSiteViewMode("site");
  setSelectedContractorId(null);
};

  return (
    <AppShell>
      <motion.div initial="hidden" animate="show" variants={containerVariants}>
        
        <motion.div variants={fadeUp} className="flex">
  <section className="flex">
    <div className="inline-block rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-5 shadow-sm sm:px-8 sm:py-6">
      <p className="text-xs font-medium uppercase tracking-wider text-sky-100">
        Welcome back
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
        Admin Dashboard
      </h1>
      <p className="mt-1 max-w-md text-sm text-sky-50">
        Here's how compliance is tracking across all sites this reporting period.
      </p>
    </div>
  </section>
</motion.div>

{/* Replace the `<motion.div>` on line 545 with this updated wrapper: */}
<motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-4">
  <div className="inline-flex items-center gap-3 rounded-xl border border-sky-100 bg-white px-4 py-2.5 shadow-sm">
    <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Reporting Month</label>
    <select
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(e.target.value)}
      className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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

  {/* NEW: Bulk Portal Access dropdown */}
  {/* Remove 'mt-3' from this div class: */}
  <div className="relative">
    <button
      onClick={() => setBulkDropdownOpen((o) => !o)}
      className="flex h-10 w-full sm:w-[280px] items-center justify-between rounded-lg border bg-card px-3 text-sm shadow-card outline-none focus:border-primary"
    >
      <span className="truncate text-slate-700 font-medium">
        {bulkSiteIds.size === 0
          ? "Select sites for portal access"
          : bulkSiteIds.size === sites.length
          ? "All sites selected"
          : `${bulkSiteIds.size} site(s) selected`}
      </span>
      <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 ml-1 transition-transform ${bulkDropdownOpen ? "rotate-180" : ""}`} />
    </button>

  {bulkDropdownOpen && (
    <div className="absolute z-50 mt-1 w-full sm:w-[280px] max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl p-1">
      {/* "All" option pinned at the top */}
      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 border-b border-slate-100 mb-1">
        <input
          type="checkbox"
          checked={sites.length > 0 && bulkSiteIds.size === sites.length}
          onChange={() => {
            if (bulkSiteIds.size === sites.length) {
              setBulkSiteIds(new Set());
            } else {
              setBulkSiteIds(new Set(sites.map((s) => s.id)));
            }
          }}
        />
        All Sites
      </label>

      {sites.map((site) => (
        <label
          key={site.id}
          className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <input
            type="checkbox"
            checked={bulkSiteIds.has(site.id)}
            onChange={() => {
              setBulkSiteIds((prev) => {
                const next = new Set(prev);
                if (next.has(site.id)) next.delete(site.id);
                else next.add(site.id);
                return next;
              });
            }}
          />
          {site.name} ({site.code})
        </label>
      ))}
    </div>
  )}
</div>

{/* Bulk action buttons — only show once at least one site is checked */}
{bulkSiteIds.size > 0 && (
  <div className="mt-3 flex flex-wrap items-center gap-3">
    <Button
      onClick={() =>
        bulkToggleLockMutation.mutate({
          siteIds: Array.from(bulkSiteIds),
          month: selectedMonth,
          action: "unlock",
        })
      }
      disabled={bulkToggleLockMutation.isPending}
      className="bg-emerald-600 hover:bg-emerald-700 h-10 text-xs font-bold shadow-sm"
    >
      <Unlock className="h-4 w-4 mr-1.5" /> Unlock Selected ({bulkSiteIds.size})
    </Button>
    <Button
      onClick={() =>
        bulkToggleLockMutation.mutate({
          siteIds: Array.from(bulkSiteIds),
          month: selectedMonth,
          action: "lock",
        })
      }
      disabled={bulkToggleLockMutation.isPending}
      variant="outline"
      className="border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 h-10 text-xs font-bold shadow-sm"
    >
      <Lock className="h-4 w-4 mr-1.5" /> Lock Selected ({bulkSiteIds.size})
    </Button>
    {bulkToggleLockMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
  </div>
)}
</motion.div>

        {/* --- RE-ENGINEERED COMPLEMENTARY DIRECTORY STATS GRID --- */}
        <motion.section variants={containerVariants} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: Replaced with an Animated Rotating-Border Dropdown Selector */}
          <motion.div variants={fadeUp} className="rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 ring-1 ring-sky-100 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-sky-700">Active Sites Available</span>
                <Layers className="h-4 w-4 text-sky-700" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-sky-700">{totalSites}</p>
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
                        {selectedSiteObj
                          ? `${selectedSiteObj.name} (${selectedSiteObj.code})`
                          : "Choose Project Site"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-1 transition-transform group-data-[state=open]:rotate-180" />
                    </span>
                  </button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="start" className="w-[240px] max-h-60 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-lg p-1 z-[60]">
                  <DropdownMenuItem 
                    onClick={() => handleSelectSite("")}
                    className="cursor-pointer text-xs font-semibold text-slate-500 hover:bg-slate-50 px-2 py-2 rounded"
                  >
                    -- Clear Selection --
                  </DropdownMenuItem>
                  {sites.map((site) => (
                    <DropdownMenuItem
                      key={site.id}
                      onClick={() => handleSelectSite(site.name)}
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
          <motion.div variants={fadeUp} className="rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 ring-1 ring-amber-100 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-700">
                  {isSiteSelected ? "Submitted This Month" : "Select Site"}
                </span>
                <CheckCircle2 className="h-4 w-4 text-amber-700" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-amber-700">
                {isSiteSelected ? totalSubmitted : "—"}
              </p>
            </div>
          </motion.div>

          {/* Card 3: Contextual Submitted This Month tracking counter */}
          <motion.div variants={fadeUp} className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-100 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-700">
                  {isSiteSelected ? "Active Form Types Assigned" : "Select Site"}
                </span>
                <ListChecks className="h-4 w-4 text-emerald-700" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {isSiteSelected ? totalForms : "—"}
              </p>
            </div>
          </motion.div>

          {/* Card 4: Direct Edit Forms Action Trigger Shortcut */}
          <motion.div 
            variants={fadeUp} 
            whileHover={{ y: -2 }}
            onClick={() => setActiveView(activeView === "forms" ? "matrix" : "forms")}
            className="rounded-xl bg-gradient-to-br from-indigo-50 to-sky-50 ring-1 ring-indigo-100 p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:ring-indigo-200"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 text-indigo-700 shadow-inner">
                <Sliders className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-bold text-indigo-700">
                {activeView === "forms" ? "Back to Table Submissions" : "Edit Form"}
              </p>
            </div>
          </motion.div>
        </motion.section>

        {/* --- Lower Component Section View Rendering Block --- */}
{activeView === "matrix" && siteSearchQuery.trim() !== "" && (
  <motion.section variants={fadeUp} className="mt-8 space-y-4">
    
    {/* Form Info Row: Shows the selected site name, the view switcher, and combined export */}
    {displayedSites.map((site) => (
      <div key={site.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border bg-white shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Selected Site</span>
          <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
            {site.name} <span className="text-sm font-semibold text-muted-foreground">({site.code})</span>
          </h3>
        </div>

        {/* Replace your existing `<div className="flex flex-wrap items-center gap-3">` block for the site header with this: */}

          <div className="flex flex-wrap items-center gap-3">
            {/* NEW: Portal Lock/Unlock Toggle */}
            <Button
              variant={site.unlocked_months?.includes(selectedMonth) ? "default" : "outline"}
              className={
                site.unlocked_months?.includes(selectedMonth) 
                  ? "bg-emerald-600 hover:bg-emerald-700 h-10 text-xs font-bold shadow-sm" 
                  : "border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 h-10 text-xs font-bold shadow-sm"
              }
              onClick={() => toggleMonthLockMutation.mutate({ 
                siteId: site.id, 
                month: selectedMonth, 
                isCurrentlyUnlocked: site.unlocked_months?.includes(selectedMonth) || false 
              })}
              disabled={toggleMonthLockMutation.isPending}
            >
              {site.unlocked_months?.includes(selectedMonth) ? (
                <><Unlock className="h-4 w-4 mr-1.5" /> Portal Open</>
              ) : (
                <><Lock className="h-4 w-4 mr-1.5" /> Portal Locked</>
              )}
            </Button>

            {/* Existing Combined Export Trigger */}
            {/* ... Keep your DropdownMenu for Export here ... */}
          </div>
      </div>
    ))}

    {/* ---- SITE VIEW: existing forms x status matrix, unchanged ---- */}
    {siteViewMode === "site" && (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
            <tr>
              <th className="px-6 py-3.5 font-bold text-slate-500">Form Metric Type</th>
              <th className="px-6 py-3.5 font-bold text-center text-slate-500 w-[160px]">Status</th>
              <th className="px-6 py-3.5 font-bold text-center text-slate-500 w-[180px]">Attachments</th>
              <th className="px-6 py-3.5 font-bold text-right text-slate-500 w-[180px]">Report</th>
            </tr>
          </thead>
        <tbody className="divide-y divide-slate-100">
          {submissionsLoading ? (
            <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                </td>
              </tr>
          ) : displayedSites.length > 0 && activeForms.length > 0 ? (
            displayedSites.map((site) => (
              activeForms.map((f: any) => {
                const submission = submissionMap.get(`${site.id}__${f.id}`);
                const status = submission?.status ?? "not_submitted";

                return (
                  <tr key={f.id} className="transition-colors hover:bg-slate-50/40">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{f.title}</div>
                      {f.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={status} />
                    </td>
                    
                    {/* COLUMN 1: DOWNLOAD ATTACHMENTS */}
                    <td className="px-6 py-4 text-center">
                      {submission ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={zippingId === submission.id}
                          onClick={() => handleDownloadAttachmentsZip(submission, site.name, f.title)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold border-amber-200 text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                        >
                          {zippingId === submission.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FolderDown className="h-3.5 w-3.5" />
                          )}
                          Download ZIP
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 italic select-none">—</span>
                      )}
                    </td>

                    {/* COLUMN 2: DOWNLOAD/VIEW REPORT */}
                    <td className="px-6 py-4 text-right">
                      {submission ? (
                        <Link 
                          to="/authenticated/$submissionId" 
                          params={{ submissionId: submission.id }} 
                          search={{ site: siteSearchQuery }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-primary-soft/40 hover:bg-primary-soft px-3 py-1.5 rounded-md transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Report
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
              <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-medium">
                No form metrics are currently assigned or active for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    )}

    {/* ---- CONTRACTOR VIEW: grouped by who submitted, drill down per contractor ---- */}
    {siteViewMode === "contractor" && (
      <div className="space-y-4">
        {!selectedContractor ? (
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            {submissionsLoading ? (
              <div className="px-6 py-12 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              </div>
            ) : siteContractors.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {siteContractors.map((contractor) => (
                  <button
                    key={contractor.id}
                    type="button"
                    onClick={() => setSelectedContractorId(contractor.id)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-50/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf3f6] text-[#095a7d] font-bold text-sm shrink-0">
                        {contractor.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{contractor.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {contractor.count} form{contractor.count !== 1 ? "s" : ""} submitted
                        </div>
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-muted-foreground font-medium">
                No contractors have submitted forms for this site yet.
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSelectedContractorId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Contractors
            </button>

            <div className="overflow-hidden rounded-xl border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                  <tr>
                    <th className="px-6 py-3.5 font-bold text-slate-500">
                      Forms Submitted by {selectedContractor.name}
                    </th>
                    <th className="px-6 py-3.5 font-bold text-center text-slate-500 w-[160px]">Compliance Status</th>
                    <th className="px-6 py-3.5 font-bold text-center text-slate-500 w-[180px]">Download Attachments</th>
                    <th className="px-6 py-3.5 font-bold text-right text-slate-500 w-[180px]">Download Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contractorSubmissions.length > 0 ? (
                    contractorSubmissions.map((submission) => (
                      <tr key={submission.id} className="transition-colors hover:bg-slate-50/40">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 text-sm">
                            {submission.forms?.title ?? "Untitled Form"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge status={submission.status} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={zippingId === submission.id}
                            onClick={() =>
                              handleDownloadAttachmentsZip(
                                submission,
                                submission.sites?.name || "",
                                submission.forms?.title || ""
                              )
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-bold border-amber-200 text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            {zippingId === submission.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FolderDown className="h-3.5 w-3.5" />
                            )}
                            Download ZIP
                          </Button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to="/authenticated/$submissionId"
                            params={{ submissionId: submission.id }}
                            search={{ site: siteSearchQuery }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-primary-soft/40 hover:bg-primary-soft px-3 py-1.5 rounded-md transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Report
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-medium">
                        No submissions found for this contractor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    )}
  </motion.section>
)}

{/* --- NEW HANDLER BLOCK: Rendered when activeView is 'forms' --- */}
{activeView === "forms" && (
  <motion.section variants={fadeUp} className="mt-8 space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border bg-white shadow-sm">
      <div>
        <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Form Infrastructure</span>
        <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">Manage Compliance Metric Forms</h3>
      </div>
      
      {/* Route pointer shortcut to build/publish standard compliance models */}
      <Link to="/authenticated/new">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 shadow-md">
          <Plus className="h-4 w-4 mr-1.5" /> Create New Form
        </Button>
      </Link>
    </div>

    {/* Directory Table View of All Existing Master Forms */}
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
          <tr>
            <th className="px-6 py-3.5 font-bold text-slate-500">Metric Title</th>
            <th className="px-6 py-3.5 font-bold text-slate-500">Reporting Frequency</th>
            <th className="px-6 py-3.5 font-bold text-center text-slate-500 w-[120px]">Form Status</th>
            <th className="px-6 py-3.5 font-bold text-right text-slate-500 w-[200px]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {formsLoading ? (
            <tr>
              <td colSpan={4} className="px-6 py-12 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              </td>
            </tr>
          ) : displayedForms.length > 0 ? (
            displayedForms.map((f: any) => (
              <tr key={f.id} className="transition-colors hover:bg-slate-50/40">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800 text-sm">{f.title}</div>
                  {f.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 font-semibold text-slate-600 capitalize">
                  {f.frequency || "monthly"}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    f.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}>
                    {f.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex gap-2">
                    {/* Send them to the Form Wizard Editor Mode via Search Param */}
                    <Link 
                      to="/authenticated/new" 
                      search={{ edit: f.id }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-md transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit Form
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(f.id, f.title)}
                      className="h-8 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-medium">
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