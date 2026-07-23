import { createFileRoute, Link , redirect, useNavigate  } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useRef, useEffect } from "react";

import touchscreenIcon from "@/assets/icon/touchscreen.png";
import dashedLineIcon from "@/assets/icon/dashed-line.png";
import editIcon from "@/assets/icon/edit.png";

import { motion } from "framer-motion";

import { buildFormWorksheet, FISCAL_MONTHS } from "@/lib/buildFormWorksheet";
import { renderFormBody } from "@/lib/renderFormBody";


import {
  Droplet, Wind, Trash2, AlertTriangle, Wallet, Trees,
  Fuel, Volume2, Waves, CloudRain, Leaf, MapPinned,
  FileText, Loader2, Plus, Pencil, Eye, UserPlus,
  Search, Download, FileSpreadsheet, FileIcon,
  ListChecks, CheckCircle2, Layers,
  ChevronDown, Sliders, FolderDown, AlertCircle, Clock,
  type LucideIcon,
  Users, LayoutGrid, ArrowLeft,MapPin, Check, X,
  Lock, Unlock,Calendar
} from "lucide-react";


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AppShell } from "@/components/app-shell";
import { formsService, sitesService, submissionsService } from "@/services";
import { usersService } from "@/services/users-service";
import { downloadFile } from "@/lib/apiClient";
import { useCurrentUser } from "@/hooks/use-current-user";
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
  edit_unlocked?: boolean;
  edit_unlocked_by?: string | null;
  edit_unlocked_at?: string | null;
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

  const handleDownloadAttachmentsZip = async (submission: any, siteName: string, formTitle: string) => 
  {
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

      // Fetch all uploaded files from the backend
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

          // 2 & 3. Download directly from our authenticated storage route — no
          // separate signed-URL step needed, the download route checks the JWT itself
          const fileBlob = await downloadFile(relativePath);

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

  // State to handle loading spinners on export buttons
  const [exportingSiteId, setExportingSiteId] = useState<string | null>(null);

  // NEW: bulk portal access selection
  const [bulkSiteIds, setBulkSiteIds] = useState<Set<string>>(new Set());
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bulkDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(e.target as Node)) {
        setBulkDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bulkDropdownOpen]);

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
      const { data, error } = await sitesService.getAllSitesAdmin();
      if (error) throw new Error(error);
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
      const { data, error } = await submissionsService.getAdminSubmissionsByMonth(reportingMonthDate, "submitted");
      if (error) throw new Error(error);
      return data as unknown as SubmissionRow[];
    },
  });
  const submissions = submissionsResult || [];

  // Site-only submission matrix, keyed by site_id__form_id. 
  // Filtering on submitted_by_role strictly ignores contractor flow.
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
  const selectedSiteObj = sites.find(s => s.name.toLowerCase() === siteSearchQuery.toLowerCase());
  const isSiteSelected = !!selectedSiteObj;

  const contextualActiveForms = activeForms.filter(f => {
    if (f.site_ids && f.site_ids.length > 0) {
      if (!selectedSiteObj || !f.site_ids.includes(selectedSiteObj.id)) return false;
    }
    return f.visible_to_site_users; // Admin dashboard purely looks at site users now
  });

  const totalForms = isSiteSelected ? contextualActiveForms.length : activeForms.length;

  const contextualSubmissions = submissions.filter(s => {
    if (selectedSiteObj) return s.site_id === selectedSiteObj.id;
    return true;
  });

  const contextualSubmissionsByRole = contextualSubmissions.filter((s) => s.submitted_by_role === "site");
  const totalSubmitted = isSiteSelected ? contextualSubmissionsByRole.length : submissions.filter(s => s.submitted_by_role === "site").length;

  const displayedForms = forms.filter((f: any) =>
    (f.title || "").toLowerCase().includes(formSearchQuery.toLowerCase()) && f.visible_to_site_users
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

    const { data: updatedData, error } = await sitesService.updateSite(siteId, { unlocked_months: updatedMonths });

    if (error) throw new Error(error);

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

const toggleEditUnlockMutation = useMutation({
  mutationFn: ({ submissionId, unlock }: { submissionId: string; unlock: boolean }) =>
    submissionsService.setEditUnlocked(submissionId, unlock, currentUser?.id),
  onSuccess: (_data, variables) => {
    queryClient.invalidateQueries({ queryKey: ["admin-submissions-by-month", reportingMonthDate] });
    toast.success(
      variables.unlock
        ? "Submission access opened — the user can now edit and resubmit."
        : "Submission access closed — the form is locked again."
    );
  },
  onError: (err: any) => toast.error(err?.message || "Failed to update edit access."),
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

        const { data, error } = await sitesService.updateSite(site.id, { unlocked_months: updatedMonths });

        if (error) throw new Error(`${site.name}: ${error}`);
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

        // Loop through each submitted form and draw its body using the exact
        // same schema-driven renderer as the single-submission report — so
        // the Combined Report always matches whatever design the individual
        // report uses, with zero duplicated layout code.
        //
        // Every form after the first starts on a brand-new page, full stop —
        // not "only if it looks like it might overflow". So if Water
        // Withdrawal runs 1.5 pages, the next form always starts on page 3,
        // never sharing a page with the tail end of the previous one.
        siteSubmissions.forEach(({ form, sub }, index) => {
          const fields = sub?.forms?.schema?.fields || [];
          const layout = sub?.forms?.schema?.layout;
          const repeatableGroups = sub?.forms?.schema?.repeatable_groups || [];
          const values = sub?.data || {};

          if (index > 0) {
            pdf.addPage();
            currentY = 50;
          }

          currentY = renderFormBody({
            pdf,
            autoTable,
            pageWidth,
            startY: currentY,
            formTitle: form.title,
            fields,
            layout,
            repeatableGroups,
            values,
          });
        });

        // Consistent footer on every page — same treatment as the
        // single-submission report (brand rule + page count).
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          const footerY = pdf.internal.pageSize.getHeight() - 34;
          pdf.setDrawColor(215, 222, 232);
          pdf.setLineWidth(0.75);
          pdf.line(40, footerY, pageWidth - 40, footerY);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(140, 145, 155);
          pdf.text(`SJVN Limited  •  ${monthName} Environmental Report`, 40, footerY + 14);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 78, 138);
          pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 40, footerY + 14, { align: "right" });
        }

        pdf.save(`${fileName}.pdf`);
        toast.success("Combined PDF generated successfully!");

      } else {
        // EXCEL EXPORT
        const allSiteSubmissionsRes = await submissionsService.getSiteSubmissions(site.id);
        const allSiteSubmissions = allSiteSubmissionsRes?.data || [];

        if (allSiteSubmissions.length === 0) {
          toast.error("No submitted data available to export for this site.");
          setExportingSiteId(null);
          return;
        }

        const ExcelJSModule = await import("exceljs");
        const ExcelJS = ExcelJSModule.default || ExcelJSModule;
        const workbook = new ExcelJS.Workbook();

        // Group ALL historical submissions by form title, injecting schema if missing
        const submissionsByForm: Record<string, any[]> = {};
        allSiteSubmissions.forEach((sub: any) => {
          // If the API didn't join the form schema, grab it from activeForms
          if (!sub.forms) {
            sub.forms = activeForms.find((f: any) => f.id === sub.form_id) || null;
          }
          const title = sub.forms?.title || "Unknown Form";
          if (!submissionsByForm[title]) submissionsByForm[title] = [];
          submissionsByForm[title].push(sub);
        });

        const targetMonthIndex = parseInt(selectedMonth.split("-")[1], 10) - 1; 
        const fyStartYear = targetMonthIndex >= 3 ? parseInt(selectedMonth.split("-")[0], 10) : parseInt(selectedMonth.split("-")[0], 10) - 1;
        const fyLabel = `FY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`;
        const targetFiscalIndex = targetMonthIndex >= 3 ? targetMonthIndex - 3 : targetMonthIndex + 9;

        // Generate a sheet for each form using the exact same builder engine as individual export
        for (const [formTitle, subs] of Object.entries(submissionsByForm)) {
          const latestSub = subs.sort((a, b) => new Date(b.reporting_month).getTime() - new Date(a.reporting_month).getTime())[0];
          if (!latestSub) continue;

          buildFormWorksheet({
            workbook,
            formTitle,
            schema: {
              fields: latestSub.forms?.schema?.fields || [],
              repeatable_groups: latestSub.forms?.schema?.repeatable_groups || [],
              layout: latestSub.forms?.schema?.layout,
            },
            values: latestSub.data || {},
            siteName: site.name,
            siteCode: site.code,
            fyLabel,
            reportingMonthLabel: monthName,
            metaRow7Label: "Report Type:",
            metaRow7Value: "Combined Environmental Report",
            cutoffFiscalIndex: targetFiscalIndex,
            resolveMonthlyValue: (fiscalIndex, rowDef) => {
              const targetCalMonth = ((fiscalIndex + 3) % 12) + 1;
              const targetYear = fiscalIndex <= 8 ? fyStartYear : fyStartYear + 1;
              const subForMonth = subs.find((s: any) => {
                if (!s.reporting_month) return false;
                const [subYear, subMonth] = s.reporting_month.split("-").map((v: string) => parseInt(v, 10));
                return subMonth === targetCalMonth && subYear === targetYear;
              });

              if (!subForMonth) return undefined;

              if (rowDef.fieldKey && subForMonth.data[rowDef.fieldKey] !== undefined) {
                return subForMonth.data[rowDef.fieldKey];
              }

              if (rowDef.matchLabel) {
                const schemaFields = subForMonth.forms?.schema?.fields || [];
                const matchedField = schemaFields.find((f: any) => {
                  const fLabel = (f.label || "").trim().toLowerCase();
                  const searchLabel = rowDef.matchLabel!.trim().toLowerCase();
                  return fLabel === searchLabel || fLabel.includes(searchLabel);
                });
                if (matchedField) return subForMonth.data[matchedField.key];
              }

              return undefined;
            },
          });
        }

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

  const handleSelectSite = (name: string) => {
    navigate({
      search: (prev) => ({ ...prev, site: name }),
      replace: true,
    });
  };

  return (
    <AppShell>
      <motion.div initial="hidden" animate="show" variants={containerVariants}>
        
        
{/* Unified Full-Width Admin Header & Bulk Controls */}
          <motion.div variants={fadeUp} className="w-full">
            <div className="flex flex-col justify-between gap-6 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-6 shadow-sm xl:flex-row xl:items-center">
              
              {/* Left: Title & Info */}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-100">
                  Welcome back
                </p>
                <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  Admin Dashboard
                </h1>
                <p className="mt-1.5 text-sm text-sky-50 max-w-xl">
                  Here's how compliance is tracking across all sites this reporting period.
                </p>
              </div>

              {/* Right: Controls Container */}
              <div className="flex flex-wrap items-center gap-3 shrink-0 xl:justify-end">
                
                {/* 1. Month Picker */}
                <div className="inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-white">
                  <Calendar className="h-4 w-4 text-sky-600" />
                  <input 
                    id="reporting-month" 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)} 
                    className="bg-transparent text-sm font-semibold text-slate-800 outline-none" 
                  />
                </div>

                {/* 2. Bulk Portal Access Dropdown */}
                <div className="relative" ref={bulkDropdownRef}>
                  <button
                    onClick={() => setBulkDropdownOpen((o) => !o)}
                    className="flex h-10 w-full sm:w-[280px] items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-white"
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

                  {/* Dropdown Menu Popup */}
                  {bulkDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full sm:w-[320px] right-0 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl p-1.5">
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50 mb-1">
                        <input
                          type="checkbox"
                          className="shrink-0 h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          checked={sites.length > 0 && bulkSiteIds.size === sites.length}
                          onChange={() => {
                            if (bulkSiteIds.size === sites.length) {
                              setBulkSiteIds(new Set());
                            } else {
                              setBulkSiteIds(new Set(sites.map((s) => s.id)));
                            }
                          }}
                        />
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <Layers className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-extrabold text-slate-800">
                          Select All Sites
                        </span>
                      </label>

                      <div className="h-px bg-slate-100 mx-2 mb-1.5" /> 

                      {sites.map((site) => {
                        const isChecked = bulkSiteIds.has(site.id);
                        return (
                          <label
                            key={site.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 mb-0.5 transition-all duration-200 ${
                              isChecked ? "bg-slate-50 ring-1 ring-slate-200/50 shadow-sm" : "hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="shrink-0 h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                              checked={isChecked}
                              onChange={() => {
                                setBulkSiteIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(site.id)) next.delete(site.id);
                                  else next.add(site.id);
                                  return next;
                                });
                              }}
                            />
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                              isChecked ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              <MapPin className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col truncate">
                              <span className={`truncate text-sm font-bold leading-tight ${
                                isChecked ? 'text-sky-900' : 'text-slate-700'
                              }`}>
                                {site.name}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                                isChecked ? 'text-sky-600' : 'text-slate-400'
                              }`}>
                                CODE: {site.code}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Action Buttons (Lock/Unlock) */}
                {bulkSiteIds.size > 0 && (
                  <div className="flex items-center gap-2">
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
                      <Unlock className="h-4 w-4 mr-1.5" /> Unlock ({bulkSiteIds.size})
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
                      <Lock className="h-4 w-4 mr-1.5" /> Lock ({bulkSiteIds.size})
                    </Button>
                    {bulkToggleLockMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          
        {/* --- RE-ENGINEERED COMPLEMENTARY DIRECTORY STATS GRID --- */}
        {/* --- RE-ENGINEERED COMPLEMENTARY DIRECTORY STATS GRID --- */}
        <motion.section variants={containerVariants} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: Animated Rotating-Border Dropdown Selector */}
          <motion.div variants={fadeUp} className="rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 ring-1 ring-sky-100 p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-sm font-semibold text-sky-800">Active Sites Available</span>
                {/* Restored the standard Layers icon to the top corner */}
                <Layers className="h-5 w-5 text-sky-700/50" />
              </div>
              <p className="mt-3 text-3xl font-bold text-sky-700 tracking-tight">{totalSites}</p>
            </div>
            
            <div className="mt-4 w-full">
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
                      {/* Replaced the ChevronDown icon with your touchscreen image */}
                      <img 
                        src={touchscreenIcon} 
                        alt="Select Site" 
                        className="h-4 w-4 shrink-0 ml-1 mix-blend-multiply opacity-60 transition-transform group-hover:scale-110" 
                      />
                    </span>
                  </button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent 
                  align="start" 
                  className="w-[280px] max-h-[320px] overflow-y-auto bg-white border border-slate-200 shadow-2xl rounded-xl p-1.5 z-[60]"
                >
                  <DropdownMenuItem 
                    onClick={() => handleSelectSite("")}
                    className="cursor-pointer flex items-center gap-2 text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 px-3 py-2.5 rounded-lg transition-colors mb-1"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-600">
                      <X className="h-3.5 w-3.5" />
                    </div>
                    Clear Selection
                  </DropdownMenuItem>
                  
                  <div className="h-px bg-slate-100 mx-2 mb-1" /> {/* Divider */}

                  {sites.map((site) => {
                    const isSelected = siteSearchQuery.toLowerCase() === site.name.toLowerCase();
                    return (
                      <DropdownMenuItem
                        key={site.id}
                        onClick={() => handleSelectSite(site.name)}
                        className={`cursor-pointer flex items-center justify-between px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-200 outline-none ${
                          isSelected 
                            ? "bg-sky-50 shadow-sm ring-1 ring-sky-200/50" 
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                            isSelected ? 'bg-sky-200/50 text-sky-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col truncate">
                            <span className={`truncate text-sm font-bold leading-tight ${
                              isSelected ? 'text-sky-900' : 'text-slate-700'
                            }`}>
                              {site.name}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                              isSelected ? 'text-sky-600' : 'text-slate-400'
                            }`}>
                              CODE: {site.code}
                            </span>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-sky-600 ml-2" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>

          {/* Card 2: Contextual Active Form Types counter */}
          <motion.div variants={fadeUp} className="rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 ring-1 ring-amber-100 p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-sm font-semibold text-amber-800">
                  {isSiteSelected ? "Site Submissions This Month" : "Select Site"}
                </span>
                {isSiteSelected ? (
                  <CheckCircle2 className="h-5 w-5 text-amber-600 opacity-80" />
                ) : (
                  <img src={dashedLineIcon} alt="Pending" className="h-5 w-5 mix-blend-multiply opacity-50" />
                )}
              </div>
              <p className="mt-3 text-3xl font-bold text-amber-700 tracking-tight">
                {!isSiteSelected ? "—" : totalSubmitted}
              </p>
            </div>
          </motion.div>

          {/* Card 3: Contextual Submitted This Month tracking counter */}
          <motion.div variants={fadeUp} className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-100 p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-sm font-semibold text-emerald-800">
                  {isSiteSelected ? "Site Assigned Forms" : "Select Site"}
                </span>
                {isSiteSelected ? (
                  <ListChecks className="h-5 w-5 text-emerald-600 opacity-80" />
                ) : (
                  <img src={dashedLineIcon} alt="Pending" className="h-5 w-5 mix-blend-multiply opacity-50" />
                )}
              </div>
              <p className="mt-3 text-3xl font-bold text-emerald-700 tracking-tight">
                {!isSiteSelected ? "—" : totalForms}
              </p>
            </div>
          </motion.div>

          {/* Card 4: Direct Edit Forms Action Trigger Shortcut */}
          <motion.div 
            variants={fadeUp} 
            whileHover={{ y: -2 }}
            onClick={() => setActiveView(activeView === "forms" ? "matrix" : "forms")}
            className="group rounded-xl bg-gradient-to-br from-indigo-50 to-sky-50 ring-1 ring-indigo-100 p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:ring-indigo-200 hover:shadow-md shadow-sm"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm border border-indigo-100 transition-transform duration-300 group-hover:scale-105">
                <img src={editIcon} alt="Edit" className="h-5 w-5 mix-blend-multiply opacity-80" />
              </div>
              <p className="mt-4 text-sm font-bold text-indigo-800 leading-tight">
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

        {/* Action Buttons (Export & Lock/Unlock) */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* COMBINED EXPORT DROPDOWN */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 text-xs font-bold border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-sm transition-all duration-200"
                disabled={exportingSiteId === site.id}
              >
                {exportingSiteId === site.id ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1.5" />
                )}
                Export Combined Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-xl rounded-lg p-1 z-50">
              <DropdownMenuItem 
                onClick={() => handleCombinedExport(site, "pdf")}
                className="cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 px-3 py-2.5 rounded"
              >
                <FileIcon className="h-4 w-4 mr-2 text-rose-500" /> PDF Document
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleCombinedExport(site, "excel")}
                className="cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 px-3 py-2.5 rounded mt-0.5"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Excel Spreadsheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    ))}

    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
            <tr>
              <th className="px-6 py-3.5 font-bold text-slate-500">Form Metric Type</th>
              <th className="px-6 py-3.5 font-bold text-center text-slate-500 w-[130px]">Edit Access</th>
              <th className="px-6 py-3.5 font-bold text-center text-slate-500 w-[160px]">Status</th>
              <th className="px-6 py-3.5 font-bold text-center text-slate-500 w-[180px]">Attachments</th>
              <th className="px-6 py-3.5 font-bold text-right text-slate-500 w-[180px]">Report</th>
            </tr>
          </thead>
        <tbody className="divide-y divide-slate-100">
          {submissionsLoading ? (
            <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
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
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <EditUnlockToggle
                          submission={submission}
                          isPending={
                            toggleEditUnlockMutation.isPending &&
                            toggleEditUnlockMutation.variables?.submissionId === submission?.id
                          }
                          onToggle={(unlock) =>
                            submission && toggleEditUnlockMutation.mutate({ submissionId: submission.id, unlock })
                          }
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <StatusBadge status={status} />
                      </div>
                    </td>
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
              <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                No form metrics are currently assigned or active for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
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

function EditUnlockToggle({
  submission,
  isPending,
  onToggle,
}: {
  submission: SubmissionRow | undefined;
  isPending: boolean;
  onToggle: (unlock: boolean) => void;
}) {
  if (!submission || submission.status !== "submitted") return null;
  const unlocked = !!submission.edit_unlocked;

  return (
    <button
      type="button"
      onClick={() => onToggle(!unlocked)}
      disabled={isPending}
      title={unlocked ? "Editing allowed — click to re-lock" : "Click to allow this submission to be edited again"}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
        unlocked ? "bg-emerald-500 focus:ring-emerald-300" : "bg-slate-300 focus:ring-slate-300"
      } ${isPending ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          unlocked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
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