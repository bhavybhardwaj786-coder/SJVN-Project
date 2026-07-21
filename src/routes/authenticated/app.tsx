import { createFileRoute, Link , redirect, useNavigate  } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import touchscreenIcon from "@/assets/icon/touchscreen.png";
import dashedLineIcon from "@/assets/icon/dashed-line.png";
import editIcon from "@/assets/icon/edit.png";

import { motion } from "framer-motion";


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
      const { data, error } = await usersService.getUsersByIds(submitterIds);
      if (error) throw new Error(error);
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
      if (!selectedSiteObj || !f.site_ids.includes(selectedSiteObj.id)) return false;
    }
    // Further restrict by which tab (site vs contractor) is active, using the
    // form's own visibility flags rather than guessing from submissions.
    return siteViewMode === "site" ? f.visible_to_site_users : f.visible_to_contractors;
  });

  const totalForms = isSiteSelected ? contextualActiveForms.length : activeForms.length;

  // 2. Filter submissions list down exclusively to the matching site selection state
  const contextualSubmissions = submissions.filter(s => {
    if (selectedSiteObj) {
      return s.site_id === selectedSiteObj.id;
    }
    return true;
  });

  // Split further by which tab (site vs contractor) is active, so the stat
  // card reflects only the submissions for the currently selected view.
  const contextualSubmissionsByRole = contextualSubmissions.filter((s) =>
    siteViewMode === "site" ? s.submitted_by_role === "site" : s.submitted_by_role === "contractor"
  );

  const totalSubmitted = isSiteSelected ? contextualSubmissionsByRole.length : submissions.length;

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

  // Map contractor submissions by form_id so we can look one up per form,
  // the same way submissionMap works for the site view.
  const contractorSubmissionMap = useMemo(() => {
    const map = new Map<string, SubmissionRow>();
    contractorSubmissions.forEach((s) => {
      if (s.form_id) map.set(s.form_id, s);
    });
    return map;
  }, [contractorSubmissions]);

  // Forms assigned to contractors — drives the drill-down table so it shows
  // every assigned form, including ones with no submission yet.
  const contractorAssignedForms = activeForms.filter((f: any) => f.visible_to_contractors);

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
        // EXCEL EXPORT
        
        // 1. Fetch ALL historical submissions for this site to populate the full year matrix
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
        
        const FISCAL_MONTHS = ["April", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
        const NAVY = "FF002060";
        const GREY_HEADER = "FFA5A5A5";
        const TAN_ROW = "FFEEECE1";
        const TOTAL_FILL = "FFF2F2F2";
        const WHITE = "FFFFFFFF";
        const thin = { style: "thin" as const, color: { argb: "FF000000" } };
        const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

        // 2. FORM_CONFIGS engine
        type SectionRowDef = { fieldKey?: string; matchLabel?: string; label?: string; unit?: string; kind?: "data" | "header" | "total"; totalOf?: [number, number]; };
        type FormConfig = { monthStartCol: number; hasTotalCol: boolean; sections: { title: string; columnHeader: string; rows: SectionRowDef[] }[]; };
        
        const FORM_CONFIGS: Record<string, FormConfig> = {
          "energy consumption": {
            monthStartCol: 5, hasTotalCol: true,
            sections: [
              {
                title: "A. Fuel consumption by fuel type", columnHeader: "Sources of Energy",
                rows: [
                  { fieldKey: "field_1784010543765_2", matchLabel: "Diesel - DG onsite", label: "Diesel - DG onsite", unit: "KL" },
                  { fieldKey: "field_1784010715087_3", matchLabel: "Diesel (Vehicles)", label: "Diesel (Vehicles)", unit: "KL" },
                  { fieldKey: "field_1784010812990_5", matchLabel: "Light Diesel Oil (LDO)", label: "Light Diesel Oil (LDO)", unit: "KL" },
                  { fieldKey: "field_1784010833341_7", matchLabel: "Petrol", label: "Petrol", unit: "KL" },
                  { fieldKey: "field_1784010840024_9", matchLabel: "LPG", label: "LPG", unit: "KL" },
                  { fieldKey: "field_1784010876696_11", matchLabel: "CNG/PNG", label: "CNG/PNG", unit: "KL" },
                  { fieldKey: "field_1784010887803_13", matchLabel: "Other fuel (Specify)", label: "Other fuel (Specify)", unit: "KL" },
                ],
              },
              {
                title: "B. Electricity purchased (Renewable and Non renewable Sources)", columnHeader: "Sources of Energy",
                rows: [
                  { fieldKey: "field_1784010907586_15", matchLabel: "Electricity Purchased from Grid (Non renewable)", label: "Electricity Purchased from Grid (Non renewable)", unit: "kwh" },
                  { fieldKey: "field_1784010929847_17", matchLabel: "Renewable Electricity Purchased from Grid", label: "Renewable Electricity Purchased from Grid", unit: "kwh" },
                  { fieldKey: "field_1784010944207_19", matchLabel: "Solar/ Wind/ Hydropower", label: "Solar/ Wind/ Hydropower", unit: "kwh" },
                ],
              },
            ],
          },
          "other air emissions": {
            monthStartCol: 4, hasTotalCol: true,
            sections: [
              {
                title: "305-7 NOx, SOx, and other significant air emissions by type & weight", columnHeader: "Emission substances",
                rows: [
                  { label: "Ambient Air Emissions", kind: "header" },
                  { fieldKey: "ambient_pm10", matchLabel: "PM10 (Ambient)", label: "PM10", unit: "kg" },
                  { fieldKey: "ambient_nox", matchLabel: "NOx (Ambient)", label: "NOx", unit: "kg" },
                  { fieldKey: "ambient_sox", matchLabel: "SOx (Ambient)", label: "SOx", unit: "kg" },
                  { fieldKey: "ambient_co", matchLabel: "CO (Ambient)", label: "CO", unit: "kg" },
                  { fieldKey: "ambient_total", matchLabel: "Total Ambient Emissions", label: "Total Emissions", kind: "total", totalOf: [1, 4] },
                  { label: "Stack Emission (average for multiple stacks)", kind: "header" },
                  { fieldKey: "field_1784011888284_63", matchLabel: "PM10 (Stack)", label: "PM10", unit: "kg" },
                  { fieldKey: "field_1784011897052_65", matchLabel: "NOx (Stack)", label: "NOx", unit: "kg" },
                  { fieldKey: "field_1784011907020_67", matchLabel: "SOx (Stack)", label: "SOx", unit: "kg" },
                  { fieldKey: "field_1784011916956_69", matchLabel: "CO (Stack)", label: "CO", unit: "kg" },
                  { fieldKey: "field_1784011927794_71", matchLabel: "Total Stack Emissions", label: "Total Emissions", kind: "total", totalOf: [8, 11] },
                ],
              },
            ],
          },
          "water withdrawal": {
            monthStartCol: 5, hasTotalCol: true,
            sections: [
              {
                title: "303-1 Total water withdrawal by source", columnHeader: "Water withdrawal by source",
                rows: [
                  { fieldKey: "wd_surface_value", matchLabel: "Surface Water Withdrawn", label: "Surface water", unit: "KL" },
                  { fieldKey: "wd_ground_value", matchLabel: "Groundwater Withdrawn", label: "Groundwater", unit: "KL" },
                  { fieldKey: "wd_third_value", matchLabel: "Third Party Water Withdrawn", label: "Third party water", unit: "KL" },
                  { fieldKey: "wd_other_value", matchLabel: "Other Sources Withdrawn", label: "Other sources - specify", unit: "KL" },
                  { fieldKey: "wd_total_withdrawal", matchLabel: "Total Water Withdrawal", label: "Total Water Withdrawal", kind: "total", totalOf: [0, 3] },
                ],
              },
              {
                title: "Water recycled", columnHeader: "Parameters",
                rows: [{ fieldKey: "wd_recycled_total", matchLabel: "Total Water Recycled", label: "Total Water Recycled", unit: "KL" }],
              },
              {
                title: "Water Discharged", columnHeader: "Water discharge by destination and level of treatment to Surface Water",
                rows: [
                  { fieldKey: "wd_disch_notreat_value", matchLabel: "Water Discharged - No Treatment", label: "No treatment", unit: "KL" },
                  { fieldKey: "wd_disch_treat_value", matchLabel: "Water Discharged - With Treatment", label: "With treatment – please specify level of treatment", unit: "KL" },
                ],
              },
            ],
          }
        };

        // Group ALL historical submissions by form title
        const submissionsByForm: Record<string, any[]> = {};
        allSiteSubmissions.forEach((sub: any) => {
          const title = sub.forms?.title || "Unknown Form";
          if (!submissionsByForm[title]) submissionsByForm[title] = [];
          submissionsByForm[title].push(sub);
        });

        const toNumericIfPossible = (v: any) => {
          if (typeof v === "number") return v;
          if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
          return v;
        };

        // Determine FY label based on React State 
        const targetMonthIndex = parseInt(selectedMonth.split("-")[1], 10) - 1; 
        const fyStartYear = targetMonthIndex >= 3 ? parseInt(selectedMonth.split("-")[0], 10) : parseInt(selectedMonth.split("-")[0], 10) - 1;
        const fyLabel = `FY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`;
        const targetFiscalIndex = targetMonthIndex >= 3 ? targetMonthIndex - 3 : targetMonthIndex + 9;

        // 3. Generate a sheet for each form
        for (const [formTitle, subs] of Object.entries(submissionsByForm)) {
          const formKey = formTitle.trim().toLowerCase();
          const formConfig = FORM_CONFIGS[formKey];

          const safeTitle = formTitle.replace(/[\\\/*?:\[\]]/g, '').slice(0, 31);
          const sheet = workbook.addWorksheet(safeTitle);

          if (formConfig && formConfig.sections) {
            const MONTH_COL_START = formConfig.monthStartCol;
            const TOTAL_COL = MONTH_COL_START + 12;
            const monthColLetter = (i: number) => String.fromCharCode(64 + MONTH_COL_START + i);
            const totalColLetter = String.fromCharCode(64 + TOTAL_COL);
            const lastCol = formConfig.hasTotalCol ? totalColLetter : monthColLetter(11);

            if (MONTH_COL_START === 5) {
              sheet.columns = [
                { width: 5 },   // A margin
                { width: 42 },  // B row label
                { width: 8 },   // C unit (left half)
                { width: 8 },   // D unit (right half)
                ...FISCAL_MONTHS.map(() => ({ width: 9 })),
                ...(formConfig.hasTotalCol ? [{ width: 12 }] : []),
              ];
            } else {
              sheet.columns = [
                { width: 5 },   // A margin
                { width: 42 },  // B row label
                { width: 12 },  // C unit
                ...FISCAL_MONTHS.map(() => ({ width: 9 })),
                ...(formConfig.hasTotalCol ? [{ width: 12 }] : []),
              ];
            }

            sheet.getRow(2).height = 24;
            sheet.mergeCells(`B2:${lastCol}2`);
            const titleCell = sheet.getCell("B2");
            titleCell.value = formTitle.toUpperCase();
            titleCell.font = { name: "Inter", size: 14, bold: true, color: { argb: WHITE } };
            titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
            titleCell.alignment = { horizontal: "center", vertical: "middle" };

            const addMetaRow = (rowNum: number, label: string, value: string) => {
              if (MONTH_COL_START === 5) {
                sheet.mergeCells(`B${rowNum}:D${rowNum}`);
                sheet.mergeCells(`E${rowNum}:${lastCol}${rowNum}`);
                const lbl = sheet.getCell(`B${rowNum}`);
                lbl.value = label; lbl.font = { name: "Inter", bold: true }; lbl.alignment = { horizontal: "right" };
                const val = sheet.getCell(`E${rowNum}`);
                val.value = value; val.alignment = { horizontal: "left" };
              } else {
                sheet.mergeCells(`B${rowNum}:C${rowNum}`);
                sheet.mergeCells(`D${rowNum}:${lastCol}${rowNum}`);
                const lbl = sheet.getCell(`B${rowNum}`);
                lbl.value = label; lbl.font = { name: "Inter", bold: true }; lbl.alignment = { horizontal: "right" };
                const val = sheet.getCell(`D${rowNum}`);
                val.value = value; val.alignment = { horizontal: "left" };
              }
            };

            addMetaRow(4, "Financial Year:", fyLabel);
            addMetaRow(5, "Location / Site:", `${site.name} (${site.code})`);
            addMetaRow(6, "Reporting Month:", monthName);
            addMetaRow(7, "Report Type:", "Combined Environmental Report");

            const sectionStartRows = [10, 20, 30, 40];
            formConfig.sections.forEach((section, sIdx) => {
              let cursor = sectionStartRows[sIdx] ?? (sheet.rowCount + 3);

              sheet.mergeCells(`B${cursor}:${lastCol}${cursor}`);
              const bar = sheet.getCell(`B${cursor}`);
              bar.value = section.title;
              bar.font = { name: "Inter", bold: true, color: { argb: WHITE } };
              bar.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
              bar.alignment = { vertical: "middle" };
              cursor++;

              const headerRowNum = cursor;
              sheet.getCell(`B${headerRowNum}`).value = section.columnHeader;
              if (MONTH_COL_START === 5) {
                sheet.mergeCells(`C${headerRowNum}:D${headerRowNum}`);
                sheet.getCell(`C${headerRowNum}`).value = "Unit";
              } else {
                sheet.getCell(`C${headerRowNum}`).value = "Unit";
              }

              FISCAL_MONTHS.forEach((m, i) => { sheet.getCell(`${monthColLetter(i)}${headerRowNum}`).value = m; });
              if (formConfig.hasTotalCol) sheet.getCell(`${totalColLetter}${headerRowNum}`).value = "Total";

              const headerCols = [
                "B", "C",
                ...(MONTH_COL_START === 5 ? ["D"] : []),
                ...FISCAL_MONTHS.map((_, i) => monthColLetter(i)),
                ...(formConfig.hasTotalCol ? [totalColLetter] : []),
              ];
              headerCols.forEach((col) => {
                const cell = sheet.getCell(`${col}${headerRowNum}`);
                cell.font = { name: "Inter", bold: true, color: { argb: WHITE } };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY_HEADER } };
                cell.border = allBorders; cell.alignment = { horizontal: "center", vertical: "middle" };
              });
              cursor++;

              const rowNumberByIndex: Record<number, number> = {};

              section.rows.forEach((rowDef, rIdx) => {
                const r = cursor;
                rowNumberByIndex[rIdx] = r;
                const rowFill = rIdx % 2 === 0 ? WHITE : TAN_ROW;

                if (rowDef.kind === "header") {
                  sheet.mergeCells(`B${r}:${lastCol}${r}`);
                  const cell = sheet.getCell(`B${r}`);
                  cell.value = rowDef.label; cell.font = { name: "Inter", bold: true, italic: true };
                  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TAN_ROW } };
                  cell.alignment = { vertical: "middle" };
                  cursor++; return;
                }

                sheet.getCell(`B${r}`).value = rowDef.label;
                if (MONTH_COL_START === 5) {
                  sheet.mergeCells(`C${r}:D${r}`);
                  sheet.getCell(`C${r}`).value = rowDef.unit ?? "";
                } else {
                  sheet.getCell(`C${r}`).value = rowDef.unit ?? "";
                }

                if (rowDef.kind === "total" && rowDef.totalOf) {
                  const [fromIdx, toIdx] = rowDef.totalOf;
                  const fromRow = rowNumberByIndex[fromIdx]; const toRow = rowNumberByIndex[toIdx];
                  FISCAL_MONTHS.forEach((_, i) => {
                    const col = monthColLetter(i);
                    const cell = sheet.getCell(`${col}${r}`);
                    cell.value = { formula: `SUM(${col}${fromRow}:${col}${toRow})` };
                    cell.numFmt = "0.00"; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
                    cell.border = allBorders; cell.alignment = { horizontal: "center", vertical: "middle" };
                  });
                } else {
                  
                  // 🔥 BULLETPROOF DATA BINDING FOR ALL MONTHS 🔥
                  // It now freely maps data for May, June, July, etc., wherever it finds it!
                  FISCAL_MONTHS.forEach((m, i) => {
                    const cell = sheet.getCell(`${monthColLetter(i)}${r}`);
                    let rawVal = undefined;

                    // Fiscal index i -> actual calendar month/year, so we match the
                    // right YEAR too, not just month number (April = index 0).
                    const targetCalMonth = ((i + 3) % 12) + 1; // 1=Jan ... 12=Dec
                    const targetYear = i <= 8 ? fyStartYear : fyStartYear + 1;
                    const subForMonth = subs.find((s: any) => {
                      if (!s.reporting_month) return false;
                      const [subYear, subMonth] = s.reporting_month.split("-").map((v: string) => parseInt(v, 10));
                      return subMonth === targetCalMonth && subYear === targetYear;
                    });

                    if (subForMonth) {
                      if (rowDef.fieldKey && subForMonth.data[rowDef.fieldKey] !== undefined) {
                        rawVal = subForMonth.data[rowDef.fieldKey];
                      } else if (rowDef.matchLabel) {
                        const schemaFields = subForMonth.forms?.schema?.fields || [];
                        const matchedField = schemaFields.find((f: any) => {
                          const fLabel = (f.label || "").trim().toLowerCase();
                          const searchLabel = rowDef.matchLabel!.trim().toLowerCase();
                          return fLabel === searchLabel || fLabel.includes(searchLabel);
                        });
                        if (matchedField) rawVal = subForMonth.data[matchedField.key];
                      }
                    }

                    const numericVal = toNumericIfPossible(rawVal);
                    if (i <= targetFiscalIndex) {
                      cell.value = (numericVal !== undefined && numericVal !== "") ? numericVal : 0;
                    }

                    cell.numFmt = "0.00";
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } };
                    cell.border = allBorders; cell.alignment = { horizontal: "center", vertical: "middle" };
                  });
                }

                if (formConfig.hasTotalCol) {
                  const totalCell = sheet.getCell(`${totalColLetter}${r}`);
                  totalCell.value = { formula: `SUM(${monthColLetter(0)}${r}:${monthColLetter(11)}${r})` };
                  totalCell.numFmt = "0.00"; totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
                  totalCell.border = allBorders; totalCell.alignment = { horizontal: "center", vertical: "middle" };
                }

                ["B", "C"].forEach((col) => {
                  const cell = sheet.getCell(`${col}${r}`);
                  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } };
                  cell.border = allBorders; cell.alignment = { vertical: "middle", wrapText: true };
                });
                cursor++;
              });
            });
          } else {
             // Fallback for non-matrix forms (e.g., Waste Disposal)
             // Gets the most recent submission to display
             const latestSub = subs.sort((a, b) => new Date(b.reporting_month).getTime() - new Date(a.reporting_month).getTime())[0];
             const fields = latestSub?.forms?.schema?.fields || [];
             const values = latestSub?.data || {};

             sheet.columns = [
               { width: 5 }, { width: 50 }, { width: 40 },
             ];

             const titleRow = sheet.addRow(["", formTitle.toUpperCase()]);
             titleRow.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF004E8A" } };
             sheet.addRow([]);

             sheet.addRow(["", "Project Site:", `${site.name} (${site.code})`]).font = { bold: true };
             sheet.addRow(["", "Reporting Period:", monthName]).font = { bold: true };
             sheet.addRow(["", "Generated On:", new Date().toLocaleDateString()]).font = { bold: true };
             sheet.addRow([]);

             const colHeaderRow = sheet.addRow(["", "Parameter", "Reported Value"]);
             colHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
             ['B', 'C'].forEach(col => {
               const cell = sheet.getCell(`${col}${colHeaderRow.number}`);
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004E8A' } };
               cell.border = { bottom: {style:'thin'} };
             });

             fields.forEach((field: any) => {
               const val = formatFieldValue(field, values[field.key]);
               const row = sheet.addRow(["", field.label, val]);
               sheet.getCell(`B${row.number}`).alignment = { wrapText: true };
               sheet.getCell(`C${row.number}`).alignment = { horizontal: 'center' };
             });
          }
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
  {/* NEW: Native Month Picker matching the User Dashboard */}
  <div className="inline-flex items-center gap-3 rounded-xl border border-sky-100 bg-white px-4 py-2.5 shadow-sm">
    <Calendar className="h-4 w-4 text-sky-600" />
    <label htmlFor="reporting-month" className="text-sm font-medium text-slate-700 whitespace-nowrap">
      Reporting Month
    </label>
    <input 
      id="reporting-month" 
      type="month" 
      value={selectedMonth} 
      onChange={(e) => setSelectedMonth(e.target.value)} 
      className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" 
    />
  </div>

  {/* NEW: Bulk Portal Access dropdown */}
  {/* Remove 'mt-3' from this div class: */}
  <div className="relative">
    {/* This button must always be visible to toggle the state */}
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

    {/* ONLY the popup menu is hidden behind the condition */}
    {bulkDropdownOpen && (
      <div className="absolute z-50 mt-1 w-full sm:w-[320px] max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl p-1.5">
        {/* "All Sites" option pinned at the top */}
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

        <div className="h-px bg-slate-100 mx-2 mb-1.5" /> {/* Divider */}

        {/* Individual Site List */}
        {sites.map((site) => {
          const isChecked = bulkSiteIds.has(site.id);
          
          return (
            <label
              key={site.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 mb-0.5 transition-all duration-200 ${
                isChecked 
                  ? "bg-slate-50 ring-1 ring-slate-200/50 shadow-sm" 
                  : "hover:bg-slate-50"
              }`}
            >
              {/* 1. Checkbox */}
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

              {/* 2. MapPin Icon Container */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                isChecked ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'
              }`}>
                <MapPin className="h-4 w-4" />
              </div>

              {/* 3. Text Container (Name & Code) */}
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
                  {isSiteSelected
                    ? siteViewMode === "site"
                      ? "Site Submissions This Month"
                      : "Contractor Submissions This Month"
                    : "Select Site"}
                </span>
                {isSiteSelected ? (
                  <CheckCircle2 className="h-5 w-5 text-amber-600 opacity-80" />
                ) : (
                  <img src={dashedLineIcon} alt="Pending" className="h-5 w-5 mix-blend-multiply opacity-50" />
                )}
              </div>
              <p className="mt-3 text-3xl font-bold text-amber-700 tracking-tight">
                {isSiteSelected ? totalSubmitted : "—"}
              </p>
            </div>
          </motion.div>

          {/* Card 3: Contextual Submitted This Month tracking counter */}
          <motion.div variants={fadeUp} className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-100 p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-sm font-semibold text-emerald-800">
                  {isSiteSelected
                    ? siteViewMode === "site"
                      ? "Site Assigned Forms"
                      : "Contractor Assigned Forms"
                    : "Select Site"}
                </span>
                {isSiteSelected ? (
                  <ListChecks className="h-5 w-5 text-emerald-600 opacity-80" />
                ) : (
                  <img src={dashedLineIcon} alt="Pending" className="h-5 w-5 mix-blend-multiply opacity-50" />
                )}
              </div>
              <p className="mt-3 text-3xl font-bold text-emerald-700 tracking-tight">
                {isSiteSelected ? totalForms : "—"}
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

        {/* --- RESTORED VIEW SWITCHER --- */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-1">
          <button
            onClick={() => setSiteViewMode("site")}
            className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              siteViewMode === "site" 
                ? "bg-white text-[#095a7d] shadow-sm ring-1 ring-slate-200/50" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }`}
          >
            Site Submissions
          </button>
          <button
            onClick={() => setSiteViewMode("contractor")}
            className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              siteViewMode === "contractor" 
                ? "bg-white text-[#095a7d] shadow-sm ring-1 ring-slate-200/50" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }`}
          >
            Contractor Submissions
          </button>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
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
                        <StatusBadge status={status} />
                      </div>
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
                    <th className="px-6 py-3.5 font-bold text-center text-slate-500 w-[160px]">Status</th>
                    <th className="px-6 py-3.5 font-bold text-center text-slate-500 w-[180px]">Attachments</th>
                    <th className="px-6 py-3.5 font-bold text-right text-slate-500 w-[180px]">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contractorAssignedForms.length > 0 ? (
                    contractorAssignedForms.map((f: any) => {
                      const submission = contractorSubmissionMap.get(f.id);
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
                            <div className="flex items-center justify-center gap-2">
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
                              <StatusBadge status={status} />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {submission ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={zippingId === submission.id}
                                onClick={() =>
                                  handleDownloadAttachmentsZip(
                                    submission,
                                    submission.sites?.name || selectedSiteObj?.name || "",
                                    f.title
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
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-medium">
                        No form metrics are currently assigned to this contractor.
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