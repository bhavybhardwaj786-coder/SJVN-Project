import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Loader2, FileText, MapPin, Calendar, User, Clock, ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

// Make sure your logo is correctly placed in your assets folder
import sjvnLogo from "@/assets/sjvn-logo.jpeg";

export const Route = createFileRoute("/authenticated/$submissionId")({
  ssr: false,
  component: SubmissionDetail,
});

type SubmissionDetailRow = {
  id: string;
  status: string;
  data: Record<string, any>;
  submitted_at: string | null;
  updated_at: string;
  reporting_month: string;
  user_id: string;
  form_id: string;
  site_id: string;
  forms: { id: string; title: string; description: string | null; schema: any } | null;
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
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["submission-detail", submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          id, status, data, submitted_at, updated_at, reporting_month, user_id, form_id, site_id,
          forms(id, title, description, schema),
          sites(id, name, code)
        `)
        .eq("id", submissionId)
        .single();
      if (error) throw error;
      return data as unknown as SubmissionDetailRow;
    },
  });

  const { data: submittedByName } = useQuery({
    queryKey: ["submission-user-name", data?.user_id],
    queryFn: async () => {
      if (!data?.user_id) return null;
      const { data: u, error } = await supabase
        .from("site_users")
        .select("full_name")
        .eq("id", data.user_id)
        .maybeSingle();
      if (error) throw error;
      return u?.full_name ?? null;
    },
    enabled: !!data?.user_id,
  });

  const fields = data?.forms?.schema?.fields || [];
  const values = data?.data || {};

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
      pdf.addImage(sjvnLogo, "JPEG", 40, 40, 75, 100);

      // 2. Text layout shifts fully to the right side of the page
      const rightSideX = pageWidth - 230; 

      // Main Header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(0, 78, 138);
      pdf.text("SJVN Limited", rightSideX, 60);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14); // Reduced font size for the Form Title
      pdf.setTextColor(0, 78, 138);
      const formTitle = data.forms?.title ?? "Environmental Compliance Form";
      pdf.text(formTitle, rightSideX, 80);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);

      // Tightly spaced metadata lines
      pdf.text(`Site: ${data.sites?.name ?? ""} (${data.sites?.code ?? ""})`, rightSideX, 100);
      pdf.text(`Reporting Month: ${data.reporting_month}`, rightSideX, 115);
      pdf.text(`Submitted By: ${submittedByName ?? "—"}`, rightSideX, 130);


      const tableBody = fields.map((field: any) => [
        field.label || "",
        formatFieldValue(field, values[field.key])
      ]);

      // 4. Center table headers, data columns, and entire table wrapper
      autoTable(pdf, {
        startY: 190,
        head: [['Field Parameter', 'Reported Value']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 78, 138],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center' // Centers Header Texts
        },
        styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: 8,
          lineColor: [200, 200, 200],
          lineWidth: 0.5,
        },
        columnStyles: {
          0: { cellWidth: 250, halign: 'center' }, // Centers parameter text
          1: { cellWidth: 250, halign: 'center' }  // Centers number values
        },
        margin: { left: (pageWidth - 500) / 2 } // Centers the entire table body horizontally on the page
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
      const sheet = workbook.addWorksheet("Submission Data");

      sheet.columns = [
        { width: 5 },
        { width: 45 },
        { width: 35 },
      ];

      const titleRow = sheet.addRow(["", (data?.forms?.title ?? "Environmental Compliance Form").toUpperCase()]);
      titleRow.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF004E8A" } };

      sheet.addRow([]);

      const addMeta = (label: string, value: string) => {
        const row = sheet.addRow(["", label, value]);
        row.getCell(2).font = { name: "Arial", bold: true };
        row.getCell(2).alignment = { horizontal: "right" };
        row.getCell(3).alignment = { horizontal: "left" };
      };

      addMeta("Reporting Month:", data?.reporting_month ?? "—");
      addMeta("Date of Reporting:", data?.submitted_at ? new Date(data.submitted_at).toLocaleDateString() : "—");
      addMeta("Location / Site:", `${data?.sites?.name ?? ""} (${data?.sites?.code ?? ""})`);
      addMeta("Data sheets filled by:", submittedByName ?? "—");

      sheet.addRow([]);
      sheet.addRow([]);

      const headerRow = sheet.addRow(["", "Parameter / Question", "Reported Value"]);
      headerRow.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };

      ['B', 'C'].forEach(col => {
        const cell = sheet.getCell(`${col}${headerRow.number}`);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004E8A' } };
        cell.border = {
          top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      fields.forEach((field: any) => {
        const label = field.label || "";
        const val = formatFieldValue(field, values[field.key]);
        const row = sheet.addRow(["", label, val]);

        ['B', 'C'].forEach(col => {
          const cell = sheet.getCell(`${col}${row.number}`);
          cell.border = {
            top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
          };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
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
          // 1. Removed mx-auto, max-w-3xl, and rounded-xl to allow it to stretch fully.
          // 2. Added the same w-[100vw] breakout trick used on the form fill page.
          className="-mt-2 -mb-6 w-[100vw] relative left-1/2 -translate-x-1/2 bg-card min-h-screen border-t"
        >
          {/* We removed the bg-gradient-hero to match the clean white look of the 3rd screenshot */}
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
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="shrink-0"
              >
                <StatusBadgeLocal status={data.status} />
              </motion.div>
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
              <div className="border-b bg-muted/40 px-5 py-3.5">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Reported Data Overview
                </h3>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="divide-y"
              >
                {fields.map((field: any, index: number) => (
                  <motion.div
                    key={field.key}
                    variants={rowVariants}
                    className={`flex flex-col justify-between gap-2 p-5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-6 ${
                      index % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                    }`}
                  >
                    <dt className="text-sm font-medium leading-relaxed text-muted-foreground sm:w-1/2">
                      {field.label}
                    </dt>
                    <dd className="break-words text-sm font-semibold text-foreground sm:w-1/2 sm:text-right">
                      {formatFieldValue(field, values[field.key])}
                    </dd>
                  </motion.div>
                ))}

                {fields.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    This form has no fields defined yet.
                  </div>
                )}
              </motion.div>
            </div>
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
      : "bg-muted text-muted-foreground"; // Changed from white text so it is visible on the new white background!
      
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize backdrop-blur-sm ${cls}`}>
      {status}
    </span>
  );
}