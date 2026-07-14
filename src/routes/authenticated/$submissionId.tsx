import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
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

  const getExportData = () => {
    if (!data) return [];
    
    const meta = [
      { "Field Name": "Form Title", "Value": data.forms?.title ?? "" },
      { "Field Name": "Site", "Value": `${data.sites?.name ?? ""} (${data.sites?.code ?? ""})` },
      { "Field Name": "Reporting Month", "Value": data.reporting_month },
      { "Field Name": "Submitted By", "Value": submittedByName ?? "—" },
      { "Field Name": "Submitted On", "Value": data.submitted_at ? new Date(data.submitted_at).toLocaleString() : "—" },
      { "Field Name": "Status", "Value": data.status },
      { "Field Name": "", "Value": "" }, 
      { "Field Name": "--- USER SUBMITTED DATA ---", "Value": "" }
    ];

    const dynamicFields = fields.map((field: any) => ({
      "Field Name": field.label,
      "Value": formatFieldValue(field, values[field.key])
    }));

    return [...meta, ...dynamicFields];
  };

  // --- NATIVE PDF GENERATOR WITH AUTOTABLE & LOGO ---
  const handleDownloadPdf = async () => {
    if (!data) return;
    setDownloading(true);
    const fileName = `${data.forms?.title ?? "form"}-${data.sites?.code ?? "site"}-${data.reporting_month}.pdf`.replace(/\s+/g, "_");

    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

      pdf.addImage(sjvnLogo, "JPEG", 40, 40, 50, 75);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(0, 78, 138); 
      pdf.text(data.forms?.title ?? "Environmental Compliance Form", 110, 65);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0); 
      
      pdf.text(`Site: ${data.sites?.name ?? ""} (${data.sites?.code ?? ""})`, 110, 85);
      pdf.text(`Reporting Month: ${data.reporting_month}`, 110, 100);
      pdf.text(`Submitted By: ${submittedByName ?? "—"}`, 110, 115);
      
      pdf.setFont("helvetica", "bold");
      pdf.text(`Status: ${data.status.toUpperCase()}`, 110, 130);

      const tableBody = fields.map((field: any) => [
        field.label || "",
        formatFieldValue(field, values[field.key])
      ]);

      autoTable(pdf, {
        startY: 155, 
        head: [['Field Parameter', 'Reported Value']],
        body: tableBody,
        theme: 'grid', 
        headStyles: {
          fillColor: [0, 78, 138], 
          textColor: 255,          
          fontStyle: 'bold',
        },
        styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: 8,
          lineColor: [200, 200, 200], 
          lineWidth: 0.5,
        },
        columnStyles: {
          0: { cellWidth: 260 }, 
          1: { cellWidth: 250 }  
        },
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

  // --- STYLED EXCEL GENERATOR ---
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
      addMeta("Form Status:", data?.status?.toUpperCase() ?? "—");

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
      
      toast.success("Styled Excel downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate Excel file");
    } finally {
      setDownloading(false);
    }
  };

  // --- CSV GENERATOR ---
  const handleDownloadCsv = () => {
    try {
      const exportRows = getExportData();
      const csvHeaders = ["Field Name", "Value"].join(",");
      const csvRows = exportRows.map(row => {
        const cleanField = String(row["Field Name"]).replace(/"/g, '""');
        const cleanVal = String(row["Value"]).replace(/"/g, '""');
        return `"${cleanField}","${cleanVal}"`;
      });
      
      const csvContent = [csvHeaders, ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      const fileName = `${data?.forms?.title ?? "form"}-${data?.sites?.code ?? "site"}-${data?.reporting_month}.csv`.replace(/\s+/g, "_");
        
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate CSV file");
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
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <Link
          to="/authenticated/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="flex items-center gap-2">
          <Select
            value=""
            onValueChange={(value) => {
              if (value === "pdf") handleDownloadPdf();
              if (value === "excel") handleDownloadExcel();
              if (value === "csv") handleDownloadCsv();
            }}
          >
            <SelectTrigger className="w-44 h-9 bg-primary text-primary-foreground border-none shadow-sm hover:opacity-90 font-medium text-xs rounded-lg transition-opacity flex justify-between items-center px-3">
              <div className="flex items-center gap-1.5">
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-foreground" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-primary-foreground" />
                )}
                {/* This specific line ensures the text remains pure white */}
                <span className="!text-white">{downloading ? "Exporting..." : "Export Options"}</span>
              </div>
            </SelectTrigger>
            <SelectContent align="end" className="bg-card text-foreground border shadow-md">
              <SelectItem value="pdf" disabled={downloading} className="cursor-pointer text-xs font-medium">
                Download PDF Document
              </SelectItem>
              <SelectItem value="excel" className="cursor-pointer text-xs font-medium">
                Download Excel Spreadsheet
              </SelectItem>
              <SelectItem value="csv" className="cursor-pointer text-xs font-medium">
                Download CSV Data Sheet
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* --- BEAUTIFUL FORM LAYOUT --- */}
      <div ref={printRef} className="mx-auto max-w-3xl rounded-xl border bg-card shadow-lg overflow-hidden transition-all">
        
        {/* 1. Styled Header Section with soft gradient */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 border-b">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <ClipboardList className="h-4 w-4" />
                Environmental Compliance Form
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {data.forms?.title}
              </h1>
              {data.forms?.description && (
                <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
                  {data.forms.description}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <StatusBadgeLocal status={data.status} />
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          
          {/* 2. Metadata Mini-Cards Grid */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Site
              </div>
              <div className="text-sm font-semibold truncate" title={`${data.sites?.name} (${data.sites?.code})`}>
                {data.sites?.name} <span className="font-normal text-xs text-muted-foreground">({data.sites?.code})</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Reporting Month
              </div>
              <div className="text-sm font-semibold">
                {new Date(data.reporting_month).toLocaleString("default", { month: "long", year: "numeric" })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Submitted By
              </div>
              <div className="text-sm font-semibold truncate" title={submittedByName ?? "—"}>
                {submittedByName ?? "—"}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Submitted On
              </div>
              <div className="text-sm font-semibold">
                {data.submitted_at ? new Date(data.submitted_at).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>

          {/* 3. Striped Data List */}
          <div className="rounded-xl border shadow-sm overflow-hidden bg-background">
            <div className="bg-muted/40 px-5 py-3.5 border-b">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Reported Data Overview
              </h3>
            </div>
            
            <div className="divide-y">
              {fields.map((field: any, index: number) => (
                <div 
                  key={field.key} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 p-5 transition-colors hover:bg-muted/30 ${index % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'}`}
                >
                  <dt className="text-sm font-medium text-muted-foreground sm:w-1/2 leading-relaxed">
                    {field.label}
                  </dt>
                  <dd className="text-sm font-semibold text-foreground sm:w-1/2 sm:text-right break-words">
                    {formatFieldValue(field, values[field.key])}
                  </dd>
                </div>
              ))}
              
              {fields.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  This form has no fields defined yet.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}