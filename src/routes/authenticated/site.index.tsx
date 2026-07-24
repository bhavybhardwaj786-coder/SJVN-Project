import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, useMe } from "@/components/app-shell";
import { motion, AnimatePresence } from "framer-motion";
import { submissionsService, formsService, sitesService } from "@/services";
import { usersService } from "@/services/users-service";
import { useCurrentUser } from "@/hooks/use-current-user";

import {
  FileText, Droplet, Wind, Trash2, AlertTriangle, Wallet, Trees,
  Fuel, Volume2, Waves, CloudRain, Leaf, MapPinned, Calendar,
  CheckCircle2, Clock, AlertCircle, ArrowRight, Lock, Loader2, SquarePen,
  Building2, Users, Eye, FolderDown, ArrowLeft, Pencil, Plus, Download, FileIcon, FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { downloadFile } from "@/lib/apiClient";
import { Link } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import sjvnLogo from "@/assets/sjvn-logo.jpeg";
import { buildFormWorksheet } from "@/lib/buildFormWorksheet";
import { renderFormBody } from "@/lib/renderFormBody"; // <-- ADD THIS IMPORT

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

function EditUnlockToggle({ submission, isPending, onToggle }: { submission: any; isPending: boolean; onToggle: (unlock: boolean) => void; }) {
  if (!submission || submission.status !== "submitted") return null;
  const unlocked = !!submission.edit_unlocked;
  return (
    <button
      type="button"
      onClick={() => onToggle(!unlocked)}
      disabled={isPending}
      title={unlocked ? "Editing allowed — click to re-lock" : "Click to allow this submission to be edited again"}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${unlocked ? "bg-emerald-500 focus:ring-emerald-300" : "bg-slate-300 focus:ring-slate-300"} ${isPending ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${unlocked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls = status === "submitted" ? "bg-success/15 text-success" : status === "draft" ? "bg-blue-500/15 text-blue-600" : status === "not_submitted" ? "bg-muted text-muted-foreground" : "bg-warning/15 text-warning-foreground";
  const label = status === "not_submitted" ? "Not submitted" : status;
  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
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

  // activeView controls main section: "site_forms" or "contractor_board"
  const [activeView, setActiveView] = useState<"site_forms" | "contractor_board">("site_forms");
  // Sub-tab under contractor board
  const [viewMode, setViewMode] = useState<"contractor" | "editForm">("contractor");

  // Fetch contractors scoped to this site
  const { data: contractorsData } = useQuery({
    queryKey: ["site-contractors", targetSiteId],
    queryFn: () => usersService.listContractors().then((r) => r.data || []),
    enabled: !!targetSiteId,
  });
  
  // 1. Add this bulletproof matching function above the count
  const isMatchingSite = (c: any) => {
    const contractorSiteId = c.site_id || c.sites?.id || c.site?.id;
    return contractorSiteId && targetSiteId && String(contractorSiteId) === String(targetSiteId);
  };

  // 2. Update the count to use it
  const siteContractorsCount = contractorsData?.filter(isMatchingSite)?.length || 0;

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

  const goToForm = (formId: string) => navigate({ to: "/authenticated/site/forms/$formId", params: { formId }, search: { period: selectedMonth } });

  // --- Step 2 Ported State & Logic (Declared FIRST so stats can use them) ---
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [zippingId, setZippingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Derive contractors from the users list
  // 3. Update the table mapper to use it
  const siteContractorsWithCounts = (contractorsData || [])
    .filter(isMatchingSite)
    .map((c: any) => ({
      ...c,
      name: c.full_name || c.name || c.email || "Unnamed Contractor",
      count: submissions.filter((s: any) => s.user_id === c.id && s.submitted_by_role === "contractor").length
    })).sort((a, b) => a.name.localeCompare(b.name));

  const selectedContractor = siteContractorsWithCounts.find(c => c.id === selectedContractorId) || null;

  // Forms assigned to contractors
  const { data: contractorFormsResult } = useQuery({
    queryKey: ["contractor-active-forms", targetSiteId],
    queryFn: () => formsService.getActiveForms({ role: "contractor", siteId: targetSiteId }),
    enabled: !!targetSiteId,
  });
  const contractorAssignedForms = contractorFormsResult?.data || [];

  const contractorSubmissions = submissions.filter((s: any) => s.user_id === selectedContractorId && s.submitted_by_role === "contractor");
  const contractorSubmissionMap = new Map();
  contractorSubmissions.forEach(s => contractorSubmissionMap.set(s.form_id, s));

  // Edit Forms Table (Site user managing contractor forms)
  const myContractorForms = (contractorFormsResult?.data || []).filter((f: any) => f.visible_to_contractors);

  // Dynamic stats calculation depending on active view & contractor selection
  const isContractorView = activeView === "contractor_board";

  const contractorTotalForms = isContractorView 
    ? (selectedContractor ? contractorAssignedForms.length : myContractorForms.length)
    : requiredForms.length;

  const contractorCompletedCount = isContractorView
    ? (selectedContractor 
        ? contractorAssignedForms.filter((f: any) => contractorSubmissionMap.get(f.id)?.status === "submitted").length
        : "—")
    : requiredForms.filter((f) => getOriginalStatus(f.id) === "submitted").length;

  const contractorPendingCount = isContractorView
    ? (selectedContractor
        ? contractorAssignedForms.filter((f: any) => {
            const st = contractorSubmissionMap.get(f.id)?.status;
            return !st || st === "draft" || st === "pending";
          }).length
        : "—")
    : requiredForms.filter((f) => getOriginalStatus(f.id) === "pending" || getOriginalStatus(f.id) === "Not Started").length;

  const stats = [
    { label: "Total Forms", value: contractorTotalForms, Icon: FileText, tint: "bg-white text-slate-700 ring-slate-200", view: "site_forms" },
    { label: "Completed", value: contractorCompletedCount, Icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-700 ring-emerald-200", view: "site_forms" },
    { label: "Pending", value: contractorPendingCount, Icon: AlertCircle, tint: "bg-blue-50 text-blue-700 ring-blue-200", view: "site_forms" },
    { label: "Contractors", value: siteContractorsCount, Icon: Users, tint: "bg-indigo-50 text-indigo-700 ring-indigo-200", isClickable: true, view: "contractor_board" },
  ];

  const toggleEditUnlockMutation = useMutation({
    mutationFn: ({ submissionId, unlock }: { submissionId: string; unlock: boolean }) =>
      submissionsService.setEditUnlocked(submissionId, unlock, currentUser?.id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["submissions-by-month"] });
      toast.success(variables.unlock ? "Access opened — contractor can edit." : "Access closed.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (formId: string) => formsService.deleteForm(formId),
    onSuccess: () => {
      toast.success("Form deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["active-forms"] });
    },
  });

  const handleDeleteForm = (formId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(formId);
  };

  const [exportingData, setExportingData] = useState(false);

  const handleCombinedExport = async (format: "pdf" | "excel", specificContractorId?: string | null) => {
    const targetForms = myContractorForms;

  // Build an ordered, per-contractor list of form submissions — never
  // summed together. When a specific contractor is requested, only that
  // contractor's forms are included. When exporting "All Contractors",
  // every contractor's forms are included as their own separate entries,
  // ordered contractor by contractor (contractor1's forms first, then
  // contractor2's, and so on) using the same order shown in the
  // Contractor Submissions list.
  let formExportData: any[] = [];

  if (specificContractorId) {
    // SINGLE CONTRACTOR: Keep data isolated
    const contractor = siteContractorsWithCounts.find((c: any) => c.id === specificContractorId);
    formExportData = targetForms.map((form: any) => {
      const sub = submissions.find(
        (s: any) => s.form_id === form.id && s.status === "submitted" && s.submitted_by_role === "contractor" && s.user_id === specificContractorId
      );
      if (!sub) return null;
      
      const joinedForm = Array.isArray(sub.forms) ? sub.forms[0] : sub.forms;
      const formWithFullSchema = joinedForm?.schema ? joinedForm : form;
      return { form: formWithFullSchema, data: sub.data || {}, contractorName: contractor?.name };
    }).filter(Boolean);
    
  } else {
    // ALL CONTRACTORS: Aggregate and sum the numeric values
    formExportData = targetForms.map((form: any) => {
      // Get every contractor's submission for this specific form
      const subsForForm = submissions.filter(
        (s: any) => s.form_id === form.id && s.status === "submitted" && s.submitted_by_role === "contractor"
      );
      if (subsForForm.length === 0) return null;

      // Extract form schema
      const joinedForm = Array.isArray(subsForForm[0].forms) ? subsForForm[0].forms[0] : subsForForm[0].forms;
      const formWithFullSchema = joinedForm?.schema ? joinedForm : form;

      // Build the aggregated data object
      const aggregatedData: Record<string, any> = {};

      subsForForm.forEach((sub: any) => {
        Object.entries(sub.data || {}).forEach(([key, val]) => {
          if (val === null || val === undefined || val === "") return;

          // Safely check if the value is a number so we don't accidentally sum strings or booleans
          const isNumber = typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "");

          if (isNumber) {
            // Add numeric values together
            aggregatedData[key] = (aggregatedData[key] || 0) + Number(val);
          } else if (Array.isArray(val)) {
            // Merge repeatable group rows and file attachments into one big list
            aggregatedData[key] = [...(aggregatedData[key] || []), ...val];
          } else {
            // For text fields, dropdowns, or booleans, just retain the first reported value
            if (aggregatedData[key] === undefined) {
              aggregatedData[key] = val;
            }
          }
        });
      });

      return { form: formWithFullSchema, data: aggregatedData, contractorName: "All Contractors Aggregated" };
    }).filter(Boolean);
  }

  if (formExportData.length === 0) {
    toast.error("No submitted contractor data available to export for this period.");
    return;
  }

  setExportingData(true);
  const prefix = specificContractorId ? selectedContractor?.name?.replace(/\s+/g, "_") : "All_Contractors_Combined";
  const fileName = `SJVN_${prefix}_${siteName?.replace(/\s+/g, "_")}_${selectedMonth}`;
  const monthName = new Date(reportingMonthDate).toLocaleString("default", { month: "long", year: "numeric" });

  try {
    if (format === "pdf") {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const rightSideX = pageWidth - 40; 

      // PDF Standard Header
      pdf.addImage(sjvnLogo, "JPEG", 40, 40, 70, 92);
      pdf.setDrawColor(0, 78, 138);
      pdf.setLineWidth(1.5);
      pdf.line(40, 30, pageWidth - 40, 30);

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
      headerY += 13;
      pdf.setFont("helvetica", "normal");
      pdf.text("ISO 9001:2015 Certified  ·  CIN: L40101HP1988GOI008409", rightSideX, headerY, { align: "right" });
      headerY += 13;
      pdf.text("Corporate Headquarter, Shimla, HP, 171006", rightSideX, headerY, { align: "right" });
      headerY += 15;
      pdf.text("Website: www.sjvn.nic.in", rightSideX, headerY, { align: "right" });

      const dividerY = 148;
      pdf.setDrawColor(0, 78, 138);
      pdf.line(40, dividerY, pageWidth - 40, dividerY);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(0, 78, 138);
      pdf.text(
        specificContractorId ? "Contractor Monthly Compliance Report" : "Combined Contractor Aggregated Report",
        pageWidth / 2,
        dividerY + 26,
        { align: "center" }
      );

      // Metadata block
      autoTable(pdf, {
        startY: dividerY + 40,
        body: [
          ["Site Location", siteName || "—"],
          ["Reporting Period", monthName],
          ["Data Source", specificContractorId ? selectedContractor?.name : "All Site Contractors (Individual Reports Combined)"],
        ],
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 6, textColor: [60, 60, 60] },
        columnStyles: { 0: { cellWidth: 140, fontStyle: 'bold', fillColor: [235, 240, 247], textColor: [0, 78, 138] }, 1: { cellWidth: 360 } },
        margin: { left: (pageWidth - 500) / 2 },
      });

      let currentY = (pdf as any).lastAutoTable.finalY + 30;

      // Render each form using the exact same schema-driven renderer as the
      // single-submission report and the Admin Combined Report — so this
      // report always matches whatever design the individual report uses,
      // with zero duplicated layout code. Every form after the first
      // starts on a brand-new page, matching the Admin Combined Report.
      formExportData.forEach(({ form, data, contractorName }, index) => {
        const fields = form?.schema?.fields || [];
        const layout = form?.schema?.layout;
        const repeatableGroups = form?.schema?.repeatable_groups || [];

        if (index > 0) {
          pdf.addPage();
          currentY = 50;
        }

        // Small contractor label above each form's page, so it's clear
        // which contractor's data follows when multiple contractors are
        // combined into one file.
        if (!specificContractorId) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(13);
          pdf.setTextColor(0, 0, 0);
          pdf.text(`Contractor: ${contractorName}`, pageWidth / 2, currentY, { align: "center" });
          currentY += 20;
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
          values: data,
        });
      });

      // Consistent footer on every page — same treatment as the Admin
      // Combined Report and the single-submission report.
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
      toast.success("Combined PDF report downloaded successfully!");
    } else {
      // EXCEL EXPORT
      const ExcelJSModule = await import("exceljs");
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      const targetMonthIndex = parseInt(selectedMonth.split("-")[1], 10) - 1; 
      const fyStartYear = targetMonthIndex >= 3 ? parseInt(selectedMonth.split("-")[0], 10) : parseInt(selectedMonth.split("-")[0], 10) - 1;
      const targetFiscalIndex = targetMonthIndex >= 3 ? targetMonthIndex - 3 : targetMonthIndex + 9;

      formExportData.forEach(({ form, data, contractorName }) => {
        // Excel worksheet names must be unique within a workbook (ExcelJS
        // throws if two sheets share a name) and are capped at 31 chars,
        // with : \ / ? * [ ] disallowed. When combining multiple
        // contractors, several of them can submit the *same* form (e.g.
        // "Water Withdrawal"), so the plain form title collides across
        // contractors — mirror the PDF branch's per-contractor labelling
        // by folding the contractor name into the sheet name here.
        const rawTitle = specificContractorId ? form.title : `${form.title} - ${contractorName}`;
        const safeTitle = rawTitle.replace(/[:\\/?*\[\]]/g, "-").slice(0, 31);

        buildFormWorksheet({
          workbook,
          formTitle: safeTitle,
          schema: { fields: form.schema?.fields || [], repeatable_groups: form.schema?.repeatable_groups || [], layout: form.schema?.layout },
          values: data,
          siteName: siteName || "Site",
          siteCode: "",
          fyLabel: `FY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`,
          reportingMonthLabel: monthName,
          metaRow7Label: "Data Source:",
          metaRow7Value: specificContractorId ? (selectedContractor?.name || "") : "All Contractors Aggregated Sum",
          cutoffFiscalIndex: targetFiscalIndex,
          // 👈 CRITICAL FIX: Resolve the aggregated value into the target month's column in Excel
          resolveMonthlyValue: (fiscalIndex, rowDef) => {
            if (fiscalIndex !== targetFiscalIndex) return undefined;
            
            if (rowDef.fieldKey && data[rowDef.fieldKey] !== undefined) {
              return data[rowDef.fieldKey];
            }

            if (rowDef.matchLabel) {
              const schemaFields = form.schema?.fields || [];
              const matchedField = schemaFields.find((f: any) => {
                const fLabel = (f.label || "").trim().toLowerCase();
                const searchLabel = rowDef.matchLabel!.trim().toLowerCase();
                return fLabel === searchLabel || fLabel.includes(searchLabel);
              });
              if (matchedField && data[matchedField.key] !== undefined) {
                return data[matchedField.key];
              }
            }

            return undefined;
          },
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      link.download = `${fileName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Combined Excel workbook downloaded successfully!");
    }
  } catch (err) {
    console.error(err);
    toast.error("Could not generate aggregated report document.");
  } finally {
    setExportingData(false);
  }
};

  const handleDownloadAttachmentsZip = async (submission: any, siteNameStr: string, formTitle: string) => {
    if (!submission?.data) return;
    const filesData = submission.data;
    const fields = submission.forms?.schema?.fields || [];
    const allAttachments: { url: string; name: string; paramLabel: string }[] = [];
    
    fields.forEach((field: any) => {
      const fieldFiles = filesData[`${field.key}_files`] || [];
      fieldFiles.forEach((file: any) => {
        if (file.url && file.name) allAttachments.push({ url: file.url, name: file.name, paramLabel: field.label || field.key });
      });
    });

    if (allAttachments.length === 0) { toast.error("No attachments exist."); return; }
    setZippingId(submission.id);
    const toastId = toast.loading("Building archive...");

    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const folderStr = `SJVN_${siteNameStr.replace(/\s+/g, "_")}_${selectedMonth}`;
      const mainFolder = zip.folder(folderStr);

      await Promise.all(allAttachments.map(async (f, idx) => {
        let relativePath = (f as any).storagePath || f.url.split("/attachments/").pop();
        relativePath = decodeURIComponent(relativePath.split("?")[0].split("#")[0]);
        const fileBlob = await downloadFile(relativePath);
        const name = `${String(idx + 1).padStart(2, '0')}_${f.paramLabel.replace(/[^a-zA-Z0-9]/g, "_")}_${f.name.replace(/\s+/g, "_")}`;
        mainFolder?.file(name, fileBlob);
      }));

      const contentBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(contentBlob);
      link.download = `${folderStr}_Attachments.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("ZIP downloaded!", { id: toastId });
    } catch (err: any) {
      toast.error(`ZIP failed: ${err.message}`, { id: toastId });
    } finally {
      setZippingId(null);
    }
  };

  return (
    <AppShell>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 -mb-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/40">
        <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
          
          <section className="w-full">
            <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-5 shadow-sm sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
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
              
              <div className="shrink-0 sm:text-right sm:mr-6">
                <label htmlFor="reporting-month" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-indigo-100">
                  Select Reporting Period
                </label>
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
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {stats.map(({ label, value, Icon, tint }) => {
            if (label === "Contractors") {
              return (
                <div
                  key={label}
                  onClick={() => setActiveView((prev) => (prev === "contractor_board" ? "site_forms" : "contractor_board"))}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-500 to-purple-600 p-4 sm:p-5 shadow-sm cursor-pointer hover:shadow-lg transition-all ring-1 ring-white/10 ${
                    activeView === "contractor_board" ? "ring-2 ring-white/70 shadow-lg" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                        <Icon className="h-5 w-5 text-white" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide text-white">{label}</span>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white">
                      Manage <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <p className="text-3xl font-bold text-white sm:text-4xl">{value}</p>
                    <span className="text-xs font-medium text-indigo-100">Tap to open</span>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={label}
                onClick={() => setActiveView("site_forms")}
                className={`rounded-2xl ${tint} p-4 sm:p-5 ring-1 shadow-sm cursor-pointer hover:shadow-md transition-all`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{label}</span>
                  <Icon className="h-4 w-4 shrink-0" />
                </div>
                <p className="mt-2 text-2xl font-bold sm:text-3xl">{value}</p>
              </div>
            );
          })}
          </section>

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

          {targetSiteId && isSiteAccessLoading && (
            <section className="mt-4">
               <div className="flex items-center gap-2 p-4 text-sm font-medium text-slate-500 bg-white rounded-xl border border-slate-100 shadow-sm">
                 <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Verifying portal access permissions...
               </div>
            </section>
          )}

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

          {activeView === "site_forms" && (
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
                              {customImage ? (
                                <img src={customImage} alt={`${name} icon`} className="h-full w-full object-contain p-2" />
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
                                  <>Edit <SquarePen className="h-3.5 w-3.5" /></>
                                ) : mappedStatus === "completed" ? (
                                  <>View Submission <ArrowRight className="h-3.5 w-3.5" /></>
                                ) : mappedStatus === "in-progress" ? (
                                  <>Continue Form <ArrowRight className="h-3.5 w-3.5" /></>
                                ) : (
                                  <>Fill Form <ArrowRight className="h-3.5 w-3.5" /></>
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
          )}

          {activeView === "contractor_board" && (
            <section className="mt-8 mb-12">
              <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => setViewMode("contractor")}
                    className={`pb-4 text-sm font-bold border-b-2 transition-all ${
                      viewMode === "contractor" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Contractor Submissions
                  </button>
                  <button
                    onClick={() => setViewMode("editForm")}
                    className={`pb-4 text-sm font-bold border-b-2 transition-all ${
                      viewMode === "editForm" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Manage Contractor Forms
                  </button>
                </div>

                {viewMode === "contractor" && !selectedContractor && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={exportingData} className="h-9 text-xs font-bold shadow-sm">
                        {exportingData ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                        Export Combined Data
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleCombinedExport("pdf", null)} className="cursor-pointer text-xs font-bold"><FileIcon className="h-4 w-4 mr-2 text-rose-500" /> PDF Document</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCombinedExport("excel", null)} className="cursor-pointer text-xs font-bold"><FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Excel Spreadsheet</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {viewMode === "contractor" && (
                <div className="space-y-4">
                  {!selectedContractor ? (
                    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                      {siteContractorsWithCounts.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {siteContractorsWithCounts.map((contractor) => (
                            <button
                              key={contractor.id}
                              type="button"
                              onClick={() => setSelectedContractorId(contractor.id)}
                              className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-slate-50/60"
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
                        <div className="px-6 py-12 text-center text-muted-foreground font-medium text-sm">
                          No contractors have been assigned to this site yet.
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => setSelectedContractorId(null)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-slate-900 transition-colors"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" /> Back to Contractors
                        </button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={exportingData} className="h-8 text-xs font-bold shadow-sm">
                              {exportingData ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                              Export Data
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleCombinedExport("pdf", selectedContractor.id)} className="cursor-pointer text-xs font-bold"><FileIcon className="h-4 w-4 mr-2 text-rose-500" /> PDF Document</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCombinedExport("excel", selectedContractor.id)} className="cursor-pointer text-xs font-bold"><FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Excel Spreadsheet</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                              <tr>
                                <th className="px-6 py-3.5 font-bold">Forms for {selectedContractor.name}</th>
                                <th className="px-6 py-3.5 font-bold text-center w-[130px]">Edit Access</th>
                                <th className="px-6 py-3.5 font-bold text-center w-[160px]">Status</th>
                                <th className="px-6 py-3.5 font-bold text-center w-[180px]">Attachments</th>
                                <th className="px-6 py-3.5 font-bold text-right w-[180px]">Report</th>
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
                                        {f.description && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.description}</div>}
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="flex items-center justify-center">
                                          <EditUnlockToggle
                                            submission={submission}
                                            isPending={toggleEditUnlockMutation.isPending && toggleEditUnlockMutation.variables?.submissionId === submission?.id}
                                            onToggle={(unlock) => submission && toggleEditUnlockMutation.mutate({ submissionId: submission.id, unlock })}
                                          />
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2"><StatusBadge status={status} /></div>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                        {submission ? (
                                          <Button
                                            variant="outline" size="sm" disabled={zippingId === submission.id}
                                            onClick={() => handleDownloadAttachmentsZip(submission, siteName || "Site", f.title)}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold border-amber-200 text-amber-700 hover:bg-amber-50 rounded-md"
                                          >
                                            {zippingId === submission.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderDown className="h-3.5 w-3.5" />}
                                            ZIP
                                          </Button>
                                        ) : <span className="text-xs text-slate-400 italic">—</span>}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        {submission ? (
                                          <Link to="/authenticated/$submissionId" params={{ submissionId: submission.id }} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-md">
                                            <Eye className="h-3.5 w-3.5" /> View
                                          </Link>
                                        ) : <span className="text-xs font-medium text-slate-400 pr-3">No Record</span>}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium text-sm">No forms assigned to contractors.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {viewMode === "editForm" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Link to="/authenticated/new">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 shadow-sm">
                        <Plus className="h-4 w-4 mr-1.5" /> Create New Form
                      </Button>
                    </Link>
                  </div>
                  <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 border-b">
                          <tr>
                            <th className="px-6 py-3.5 font-bold">Metric Title</th>
                            <th className="px-6 py-3.5 font-bold">Frequency</th>
                            <th className="px-6 py-3.5 font-bold text-center w-[120px]">Status</th>
                            <th className="px-6 py-3.5 font-bold text-right w-[200px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formsLoading ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" /></td></tr>
                          ) : myContractorForms.length > 0 ? (
                            myContractorForms.map((f: any) => (
                              <tr key={f.id} className="transition-colors hover:bg-slate-50/40">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-800 text-sm">{f.title}</div>
                                  {f.description && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.description}</div>}
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-600 capitalize">{f.frequency || "monthly"}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${f.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                                    {f.is_active ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="inline-flex gap-2">
                                    <Link to="/authenticated/new" search={{ edit: f.id }} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-md">
                                      <Pencil className="h-3.5 w-3.5" /> Edit
                                    </Link>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteForm(f.id, f.title)} className="h-8 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium text-sm">No contractor forms created yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </AppShell>
  );
}