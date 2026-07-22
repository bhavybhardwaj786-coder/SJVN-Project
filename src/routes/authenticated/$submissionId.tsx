import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Download, 
  Loader2, 
  FileText, 
  MapPin, 
  Calendar, 
  User, 
  Clock, 
  ExternalLink 
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";

import { submissionsService } from "@/services";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

// Make sure your logo is correctly placed in your assets folder
import sjvnLogo from "@/assets/sjvn-logo.jpeg";
import { buildFormWorksheet, FISCAL_MONTHS } from "@/lib/buildFormWorksheet";

export const Route = createFileRoute("/authenticated/$submissionId")({
  ssr: false,

  validateSearch: (search: Record<string, unknown>) => ({
    site: (search.site as string) || "",
  }),

  loader: async ({ context, params }) => {
    const { queryClient } = context;
    const { submissionId } = params;

    await queryClient.ensureQueryData({
      queryKey: ["submission-detail", submissionId],
      queryFn: async () => {
        const { data, error } = await submissionsService.getSubmissionById(submissionId);
        if (error) throw new Error(error);
        return data;
      },
    });
  },
  component: SubmissionDetail,
});

export interface FormOption {
  label: string;
  value: string;
}

export interface FormFieldSchema {
  key: string;
  label: string;
  type: string;
  unit?: string;
  required?: boolean;
  options?: FormOption[];
}

export interface RepeatableGroupSchema {
  key: string;
  label: string;
  minRows?: number;
  rowFields: FormFieldSchema[];
}

export interface FormSchema {
  icon?: string;
  fields?: FormFieldSchema[];
  layout?: any[];
  repeatable_groups?: RepeatableGroupSchema[];
}

// Extend existing SubmissionDetailRow
type SubmissionDetailRow = {
  id: string;
  status: string;
  data: Record<string, unknown>;
  submitted_at: string | null;
  updated_at: string;
  reporting_month: string;
  user_id: string;
  form_id: string;
  site_id: string;
  submitted_by_role: 'site' | 'contractor';
  submitted_by_name?: string | null;
  forms: { id: string; title: string; description: string | null; schema: FormSchema } | null;
  sites: { id: string; name: string; code: string } | null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};


const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

function SubmissionDetail() {
  const { submissionId } = Route.useParams();
  const { site } = Route.useSearch();
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Fetch submission data, making sure to grab 'submitted_by_role'
  const { data, isLoading, error } = useQuery({
    queryKey: ["submission-detail", submissionId],
    queryFn: async () => {
      const { data, error } = await submissionsService.getSubmissionById(submissionId);
      if (error) throw new Error(error);
      return data as unknown as SubmissionDetailRow;
    },
  });

  // Submitter's name now comes directly from the joined submission fetch
  // (submissionsService.getSubmissionById) instead of a separate lookup —
  // avoids a second request and an auth-scope mismatch (the users API is
  // admin-only, but site_users/contractors view their own submissions too).
  const submittedByName = (data as any)?.submitted_by_name ?? null;

  const fields = data?.forms?.schema?.fields || [];
  const repeatableGroups: any[] = data?.forms?.schema?.repeatable_groups || [];
  const values = data?.data || {};

  const getGroupRows = useCallback((groupKey: string): Record<string, unknown>[] => {
  const raw = values[groupKey];
  return Array.isArray(raw) ? raw : [];
}, [values]);

  // --- REFINED PDF GENERATOR (RIGHT-ALIGNED METADATA & CENTERED TABLE) ---
  const handleDownloadPdf = async () => {
    if (!data) return;
    setDownloading(true);
    const fileName = `${data.forms?.title ?? "form"}-${data.sites?.code ?? "site"}-${data.reporting_month}.pdf`.replace(/\s+/g, "_");

    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();

      // 1. Logo placement on the left
      pdf.addImage(sjvnLogo, "JPEG", 40, 40, 70, 92);

      // 2. Top rule line, spanning the full page width
      const topRuleY = 30;
      pdf.setDrawColor(0, 78, 138);
      pdf.setLineWidth(1.5);
      pdf.line(40, topRuleY, pageWidth - 40, topRuleY);

      // 3. Header text block, right-aligned against the right margin
      const rightMarginX = pageWidth - 40;
      let headerY = 55;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(0, 78, 138);
      pdf.text("SJVN LIMITED", rightMarginX, headerY, { align: "right" });

      headerY += 16;
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(90, 90, 90);
      pdf.text("(A Joint Venture of Govt. of India & Govt. of Himachal Pradesh)", rightMarginX, headerY, { align: "right" });

      headerY += 14;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(110, 110, 110);
      pdf.text("ISO 9001:2015 Certified  ·  CIN: L40101HP1988GOI008409", rightMarginX, headerY, { align: "right" });

      headerY += 14;
      pdf.text("Corporate Headquarter, Shimla, HP, 171006", rightMarginX, headerY, { align: "right" });

      headerY += 14;
      pdf.text("Website: www.sjvn.nic.in", rightMarginX, headerY, { align: "right" });

      // 4. Divider line under the header block
      const dividerY = 148;
      pdf.setDrawColor(0, 78, 138);
      pdf.setLineWidth(1.2);
      pdf.line(40, dividerY, pageWidth - 40, dividerY);

// 4. Centered report title below the divider
pdf.setFont("helvetica", "bold");
pdf.setFontSize(15);
pdf.setTextColor(0, 78, 138);
const formTitle = data.forms?.title ?? "Environmental Compliance Form";
pdf.text(formTitle, pageWidth / 2, dividerY + 26, { align: "center" });

// 5. Metadata block below the title, shown as a small bordered table
autoTable(pdf, {
  startY: dividerY + 40,
  body: [
    ["Site", `${data.sites?.name ?? ""} (${data.sites?.code ?? ""})`],
    ["Reporting Month", data.reporting_month],
    ["Submitted By", submittedByName ?? "—"],
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

      const tableBody = fields.map((field: any) => {
        const filesCount = values[`${field.key}_files`]?.length || 0;
        const attachmentText = filesCount > 0 ? `(${filesCount} Doc Attached)` : '';
        return [
          field.label || "",
          `${formatFieldValue(field, values[field.key])} ${attachmentText}`.trim()
        ];
      });

      if (fields.length > 0) {
        autoTable(pdf, {
          startY: (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 24 : dividerY + 180,
          head: [['Field Parameter', 'Reported Value']],
          body: tableBody,
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
          margin: { left: (pageWidth - 500) / 2 }
        });
      }

      repeatableGroups.forEach((group: any) => {
        const groupRows = getGroupRows(group.key);
        if (groupRows.length === 0) return;

        const headers = ["#", ...group.rowFields.map((rf: any) => rf.label + (rf.unit ? ` (${rf.unit})` : ""))];
        const rows = groupRows.map((rowVal: any, rIdx: number) => [
          rIdx + 1,
          ...group.rowFields.map((rf: any) => formatFieldValue(rf, rowVal[rf.key]))
        ]);

        const pageHeight = pdf.internal.pageSize.getHeight();
        let startY = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 28 : dividerY + 180;

        if (startY + 50 > pageHeight) {
          pdf.addPage();
          startY = 40;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(0, 78, 138);
        pdf.text(group.label || "Repeatable Group Data", (pageWidth - 500) / 2, startY);

        autoTable(pdf, {
          startY: startY + 8,
          head: [headers],
          body: rows,
          theme: 'grid',
          headStyles: {
            fillColor: [0, 78, 138],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
          },
          styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 6,
            lineColor: [200, 200, 200],
            lineWidth: 0.5,
            halign: 'center',
          },
          margin: { left: (pageWidth - 500) / 2 }
        });
      });

      pdf.save(fileName);
      toast.success("Report PDF generated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate PDF document.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const ExcelJSModule = await import("exceljs");
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;

      const workbook = new ExcelJS.Workbook();

      const reportingDate = data?.reporting_month ? new Date(data.reporting_month) : new Date();
      const istParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        month: "long",
        year: "numeric",
      }).formatToParts(reportingDate);
      const istMonthName = istParts.find((p) => p.type === "month")?.value || "";
      const istYear = parseInt(istParts.find((p) => p.type === "year")?.value || `${reportingDate.getFullYear()}`, 10);
      const istMonthNum = parseInt(
        new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", month: "numeric" }).format(reportingDate),
        10
      ); // 1 = Jan ... 12 = Dec

      const fiscalColIndex = FISCAL_MONTHS.findIndex((m) => istMonthName.startsWith(m.slice(0, 3)));
      // FY must now be derived from the real calendar month, not array position,
      // since the columns are Jan→Dec instead of Apr→Mar
      const fyStartYear = istMonthNum >= 4 ? istYear : istYear - 1;
      const fyLabel = `FY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`;

      // Pull every other submitted month for this form+site so past months
      // aren't left blank — current month's own `values` always wins its column.
      const { data: historyRows } = await submissionsService.getSiteSubmissions(data?.site_id as string, data?.form_id as string);
      const valuesByFiscalIndex: Record<number, Record<string, any>> = {};
      (historyRows || []).forEach((row: any) => {
        const rowDate = new Date(row.reporting_month);
        const rowParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" }).formatToParts(rowDate);
        const rowMonthName = rowParts.find((p) => p.type === "month")?.value || "";
        const rowYear = parseInt(rowParts.find((p) => p.type === "year")?.value || `${rowDate.getFullYear()}`, 10);
        const rowMonthNum = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", month: "numeric" }).format(rowDate), 10);
        const rowFyStartYear = rowMonthNum >= 4 ? rowYear : rowYear - 1;
        if (rowFyStartYear !== fyStartYear) return; // ignore rows outside this fiscal year
        const idx = FISCAL_MONTHS.findIndex((m) => rowMonthName.startsWith(m.slice(0, 3)));
        if (idx !== -1) valuesByFiscalIndex[idx] = row.data || {};
      });
      valuesByFiscalIndex[fiscalColIndex] = values; // current submission's own data wins its own column

      buildFormWorksheet({
        workbook,
        formTitle: data?.forms?.title || "Submission Data",
        schema: {
          fields,
          repeatable_groups: repeatableGroups,
          layout: data?.forms?.schema?.layout,
        },
        values,
        siteName: data?.sites?.name ?? "",
        siteCode: data?.sites?.code ?? "",
        fyLabel,
        reportingMonthLabel: istMonthName,
        metaRow7Label: "Data sheets filled by:",
        metaRow7Value: submittedByName ?? "—",
        cutoffFiscalIndex: fiscalColIndex,
        resolveMonthlyValue: (fiscalIndex, rowDef) => {
          const monthVals = valuesByFiscalIndex[fiscalIndex];
          return rowDef.fieldKey && monthVals ? monthVals[rowDef.fieldKey] : undefined;
          },
        });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const fileName = `${data?.forms?.title ?? "form"}-${data?.sites?.code ?? "site"}-${data?.reporting_month}.xlsx`.replace(/\s+/g, "_");

      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Excel downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate Excel file");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <p className="text-destructive">Submission not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
      >
        <motion.div
          variants={fadeUp}
          className="mb-6 flex items-center justify-between border-b pb-4"
        >
          <Link
            to="/authenticated/app"
            search={{ site }}
            className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <motion.span
              className="inline-flex"
              whileHover={{ x: -3 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowLeft className="h-4 w-4" />
            </motion.span>
            Back to dashboard
          </Link>

          <div className="flex items-center gap-2">
            <Select
              value=""
              onValueChange={(value) => {
                if (value === "pdf") handleDownloadPdf();
                if (value === "excel") handleDownloadExcel();
              }}
            >
              <SelectTrigger
                className="
                  flex h-9 w-44 items-center justify-between
                  rounded-lg border border-[#6BB6E8] bg-[#3A9BDC] px-3
                  text-xs font-semibold text-white shadow-md transition-all duration-300
                  hover:bg-[#2F8FD1] hover:shadow-lg focus:ring-2 focus:ring-[#8FD3FF]
                "
              >
                <div className="flex items-center gap-1.5">
                  {downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-white" />
                  )}
                  <span className="text-white">
                    {downloading ? "Exporting..." : "Export Options"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent align="end" className="border bg-card text-foreground shadow-elevated">
                <SelectItem value="pdf" disabled={downloading} className="cursor-pointer text-xs font-medium">
                  Download PDF Document
                </SelectItem>
                <SelectItem value="excel" className="cursor-pointer text-xs font-medium">
                  Download Excel Spreadsheet
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <motion.div
          ref={printRef}
          variants={fadeUp}
          className="-mt-2 -mb-6 w-[100vw] relative left-1/2 -translate-x-1/2 bg-card min-h-screen border-t"
        >
          <div className="px-6 pt-8 sm:px-10 sm:pt-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  Monthly Compliance Report
                </div>
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {data.forms?.title}
                </h1>
                {data.forms?.description && (
                  <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                    {data.forms.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase border rounded px-2.5 py-1 bg-slate-100">
                  {data.submitted_by_role}
                </span>
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <StatusBadgeLocal status={data.status} />
                </motion.div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              <motion.div
                variants={fadeUp}
                whileHover={{ y: -2 }}
                className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> Site
                </div>
                <div className="truncate text-sm font-semibold" title={`${data.sites?.name} (${data.sites?.code})`}>
                  {data.sites?.name} <span className="text-xs font-normal text-muted-foreground">({data.sites?.code})</span>
                </div>
              </motion.div>

              <motion.div
                variants={fadeUp}
                whileHover={{ y: -2 }}
                className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Reporting Month
                </div>
                <div className="text-sm font-semibold">
                  {new Date(data.reporting_month).toLocaleString("default", { month: "long", year: "numeric" })}
                </div>
              </motion.div>

              <motion.div
                variants={fadeUp}
                whileHover={{ y: -2 }}
                className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> Submitted By
                </div>
                <div className="truncate text-sm font-semibold" title={submittedByName ?? "—"}>
                  {submittedByName ?? "—"}
                </div>
              </motion.div>

              <motion.div
                variants={fadeUp}
                whileHover={{ y: -2 }}
                className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Submitted On
                </div>
                <div className="font-mono-figures text-sm font-semibold">
                  {data.submitted_at ? new Date(data.submitted_at).toLocaleDateString() : "—"}
                </div>
              </motion.div>
            </motion.div>

            <div className="overflow-hidden rounded-xl border bg-background shadow-card">
              <div className="hidden sm:flex border-b bg-muted/10 px-5 py-2.5 text-xs uppercase tracking-wider select-none">
                <div className="w-1/3">
                  <span className="font-bold text-black">Parameter Type</span>
                </div>
                <div className="w-1/3 text-center">
                  <span className="font-bold text-black">Verification Attachments</span>
                </div>
                <div className="w-1/3 text-right">
                  <span className="font-bold text-black">Reported Value</span>
                </div>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="divide-y"
              >
                {fields.map((field: any, index: number) => {
                  const attachedFilesArray = values[`${field.key}_files`] || [];

                  return (
                    <motion.div
                      key={field.key}
                      variants={rowVariants}
                      className={`flex flex-col gap-4 p-5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between ${
                        index % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                      }`}
                    >
                      {/* Column 1: Field Parameter Title */}
                      <dt className="text-sm font-medium leading-relaxed text-slate-800 sm:w-1/3">
                        {field.label}
                      </dt>
                      
                      {/* Column 2: Vertically Stacked Attachments Section */}
                      <div className="flex flex-col gap-1.5 sm:w-1/3 sm:items-center sm:justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:hidden mb-0.5">
                          Attachments:
                        </span>
                        
                        {attachedFilesArray.length > 0 ? (
                          <div className="flex flex-col gap-1.5 items-stretch sm:items-center w-full">
                            {attachedFilesArray.map((fileObj: { url: string; name: string }, fIdx: number) => (
                              <a 
                                key={fIdx}
                                href={fileObj.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold rounded bg-slate-100 hover:bg-[#eaf3f6] border border-slate-200 px-3 py-1.5 text-[#095a7d] transition-all max-w-[245px] w-full"
                                title={fileObj.name}
                              >
                                <ExternalLink className="h-3 w-3 shrink-0 text-[#095a7d]/70" />
                                <span className="truncate">{fileObj.name || `File ${fIdx + 1}`}</span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground/50 text-left sm:text-center w-full">— No Attachments —</span>
                        )}
                      </div>
                      
                      {/* Column 3: Value Output Label Section */}
                      <dd className="flex flex-col sm:w-1/3 sm:text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:hidden mb-0.5">
                          Value:
                        </span>
                        <span className="text-sm font-semibold text-slate-900 font-mono-figures">
                          {formatFieldValue(field, values[field.key])}
                        </span>
                      </dd>
                    </motion.div>
                  );
                })}

                {fields.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    This form has no flat fields defined.
                  </div>
                )}
              </motion.div>
            </div>

            {repeatableGroups.length > 0 && (
              <div className="mt-8 space-y-6">
                {repeatableGroups.map((group: any) => {
                  const groupRows = getGroupRows(group.key);

                  return (
                    <div key={group.key} className="overflow-hidden rounded-xl border bg-background shadow-card">
                      <div className="border-b bg-muted/20 px-5 py-3">
                        <h3 className="font-bold text-slate-800 text-sm">{group.label || "Repeatable Entries"}</h3>
                      </div>

                      {groupRows.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted/10 text-xs uppercase tracking-wider select-none text-slate-700 border-b">
                              <tr>
                                <th className="px-4 py-3 font-bold">#</th>
                                {group.rowFields.map((rf: any) => (
                                  <th key={rf.key} className="px-4 py-3 font-bold">
                                    {rf.label}
                                    {rf.unit ? ` (${rf.unit})` : ""}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {groupRows.map((rowVal: any, rIdx: number) => (
                                <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-transparent" : "bg-muted/10"}>
                                  <td className="px-4 py-3 font-medium text-slate-600 align-top">{rIdx + 1}</td>
                                  {group.rowFields.map((rf: any) => (
                                    <td key={rf.key} className="px-4 py-3 font-semibold text-slate-900 font-mono-figures align-top">
                                      {formatFieldValue(rf, rowVal[rf.key])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-muted-foreground italic">
                          No entries submitted for this group.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}

function formatFieldValue(field: any, value: any) {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "checkbox") return value ? "Yes" : "No";
  if (field.type === "select") {
    const opt = field.options?.find((o: any) => o.value === value);
    return opt?.label ?? value;
  }
  return String(value);
}

function StatusBadgeLocal({ status }: { status: string }) {
  const cls =
    status === "submitted"
      ? "bg-success/15 text-success"
      : status === "draft"
      ? "bg-blue-500/15 text-blue-600"
      : "bg-muted text-muted-foreground";
      
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize backdrop-blur-sm ${cls}`}>
      {status}
    </span>
  );
}