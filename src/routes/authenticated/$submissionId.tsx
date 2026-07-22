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
      // Reporting month is stored as a UTC timestamp (e.g. midnight IST on the
      // 1st serializes as "...T18:30:00.000Z" the evening before in UTC), so it
      // must be reformatted in the site's own timezone (Asia/Kolkata) rather
      // than printed as the raw ISO string — otherwise July shows up as June.
      const monthLabel = (() => {
        try {
          return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" }).format(
            new Date(data.reporting_month)
          );
        } catch {
          return data.reporting_month;
        }
      })();

autoTable(pdf, {
  startY: dividerY + 40,
  body: [
    ["Site", `${data.sites?.name ?? ""} (${data.sites?.code ?? ""})`],
    ["Reporting Month", monthLabel],
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

      // ---- shared layout constants + small drawing helpers for the redesigned body ----
      const contentWidth = 500;
      const marginX = (pageWidth - contentWidth) / 2;

      // Solid rounded bar used for every section heading — keeps the "one month, one clean sheet"
      // data-sheet feel instead of the old plain grid table.
      const drawSectionBar = (y: number, title: string, rightLabel?: string, height = 26) => {
        pdf.setFillColor(0, 78, 138);
        pdf.roundedRect(marginX, y, contentWidth, height, 4, 4, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(height >= 26 ? 11 : 9.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(title, marginX + 12, y + height / 2 + 3.5);
        if (rightLabel) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.5);
          pdf.setTextColor(200, 220, 240);
          pdf.text(rightLabel, marginX + contentWidth - 12, y + height / 2 + 3.5, { align: "right" });
        }
      };

      // 6. Reported parameters — section-aware, schema-driven renderer.
      // Mirrors the "generic schema-driven engine" already used by the Excel export
      // (reads schema.layout + schema.fields directly), so a brand-new form with
      // sections defined in the form builder needs ZERO extra PDF code — it just works.
      // Forms without any sections defined fall back to a single flat sheet, same as before.
      let cursorY = (pdf as any).lastAutoTable.finalY + 26;
      const fieldByKey = new Map<string, any>(fields.map((f: any) => [f.key, f]));
      const layout: any[] | undefined = data?.forms?.schema?.layout;

      const ensureSpace = (neededHeight: number) => {
        const pageHeight = pdf.internal.pageSize.getHeight();
        if (cursorY + neededHeight > pageHeight - 60) {
          pdf.addPage();
          cursorY = 50;
        }
      };

      // Renders one titled sub-section: navy bar + its own "Field Parameter / Reported
      // Value" table, so every question sits under the sub-form heading it actually
      // belongs to (e.g. "303-1 Total water withdrawal by source", "Water recycled",
      // "Water Discharged") instead of one long undifferentiated list.
      const renderFieldSection = (title: string, sectionFields: any[], rightLabel?: string) => {
        if (!sectionFields || sectionFields.length === 0) return;
        ensureSpace(60);
        drawSectionBar(cursorY, (title || "Section").toUpperCase(), rightLabel, 24);
        cursorY += 24;

        const body = sectionFields.map((field: any) => {
          const label = field.unit ? `${field.label} (${field.unit})` : field.label || "";
          return [label, formatFieldValue(field, values[field.key])];
        });

        autoTable(pdf, {
          startY: cursorY,
          head: [["Field Parameter", "Reported Value"]],
          body,
          theme: "striped",
          headStyles: {
            fillColor: [0, 78, 138],
            textColor: 255,
            fontStyle: "bold",
            halign: "left",
            fontSize: 9.5,
          },
          alternateRowStyles: { fillColor: [244, 248, 252] },
          styles: {
            font: "helvetica",
            fontSize: 10,
            cellPadding: { top: 7, bottom: 7, left: 12, right: 10 },
            lineColor: [225, 230, 238],
            lineWidth: 0.4,
            textColor: [55, 60, 70],
            valign: "middle",
          },
          columnStyles: {
            0: { cellWidth: 300, fontStyle: "bold", textColor: [40, 55, 80] },
            1: { cellWidth: 200, fontStyle: "bold", textColor: [0, 78, 138] },
          },
          margin: { left: marginX, right: pageWidth - marginX - contentWidth },
          didDrawCell: (hookData: any) => {
            // slim navy accent bar on every parameter row — sits in the padding gutter, never over text
            if (hookData.section === "body" && hookData.column.index === 0) {
              pdf.setFillColor(0, 78, 138);
              pdf.rect(hookData.cell.x, hookData.cell.y, 2.5, hookData.cell.height, "F");
            }
          },
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 24;
      };

      const renderGroupTable = (group: any) => {
        const groupRows = getGroupRows(group.key);
        if (groupRows.length === 0) return;

        const headers = ["#", ...group.rowFields.map((rf: any) => rf.label + (rf.unit ? ` (${rf.unit})` : ""))];
        const rows = groupRows.map((rowVal: any, rIdx: number) => [
          rIdx + 1,
          ...group.rowFields.map((rf: any) => formatFieldValue(rf, rowVal[rf.key]))
        ]);

        ensureSpace(70);
        drawSectionBar(
          cursorY,
          (group.label || "Repeatable Group Data").toUpperCase(),
          `${groupRows.length} ${groupRows.length === 1 ? "entry" : "entries"}`,
          22
        );
        cursorY += 22;

        autoTable(pdf, {
          startY: cursorY,
          head: [headers],
          body: rows,
          theme: "striped",
          headStyles: {
            fillColor: [230, 236, 245],
            textColor: [0, 78, 138],
            fontStyle: "bold",
            halign: "center",
            fontSize: 8.5,
            lineColor: [200, 210, 225],
            lineWidth: 0.4,
          },
          alternateRowStyles: { fillColor: [248, 250, 253] },
          styles: {
            font: "helvetica",
            fontSize: 8.5,
            cellPadding: 6,
            lineColor: [225, 230, 238],
            lineWidth: 0.4,
            halign: "center",
            textColor: [70, 75, 85],
          },
          columnStyles: {
            0: { cellWidth: 24, fontStyle: "bold", textColor: [0, 78, 138], fillColor: [244, 248, 252] },
          },
          margin: { left: marginX, right: pageWidth - marginX - contentWidth },
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 24;
      };

      // ---- Renders a "table"-type section child: a real grid exactly like the
      // one shown in the form-fill wizard (e.g. S.No / Source / Unit / External-
      // On-site / Reported Value), reading child.columns + child.rows directly
      // from the schema. Cells of type "label" print as-is; cells of type
      // "field" resolve fieldKey against the submitted values (through
      // formatFieldValue, so selects/checkboxes still render their option
      // labels). If the schema defines a summaryRow (e.g. "TOTAL WATER
      // WITHDRAWAL"), it's appended as a highlighted final row, honoring any
      // colSpan on its label cells.
      const renderTableSectionChild = (child: any) => {
        if (!child.columns || !child.rows) return;
        ensureSpace(60);

        const resolveCell = (cell: any) =>
          cell?.type === "field"
            ? formatFieldValue(fieldByKey.get(cell.fieldKey), values[cell.fieldKey])
            : cell?.value ?? "";

        const body = child.rows.map((row: any[]) => row.map(resolveCell));

        let summaryRowIndex = -1;
        if (child.summaryRow) {
          const summaryBody = child.summaryRow.map((cell: any) => {
            const text = resolveCell(cell);
            return cell.colSpan ? { content: text, colSpan: cell.colSpan } : text;
          });
          body.push(summaryBody);
          summaryRowIndex = body.length - 1;
        }

        autoTable(pdf, {
          startY: cursorY,
          head: [child.columns],
          body,
          theme: "grid",
          headStyles: {
            fillColor: [230, 236, 245],
            textColor: [0, 78, 138],
            fontStyle: "bold",
            halign: "center",
            fontSize: 8.5,
            lineColor: [200, 210, 225],
            lineWidth: 0.4,
          },
          alternateRowStyles: { fillColor: [248, 250, 253] },
          styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 6,
            lineColor: [225, 230, 238],
            lineWidth: 0.4,
            halign: "center",
            valign: "middle",
            textColor: [60, 65, 75],
          },
          didParseCell: (hookData: any) => {
            if (hookData.section === "body" && hookData.row.index === summaryRowIndex) {
              hookData.cell.styles.fillColor = [0, 78, 138];
              hookData.cell.styles.textColor = 255;
              hookData.cell.styles.fontStyle = "bold";
            }
          },
          margin: { left: marginX, right: pageWidth - marginX - contentWidth },
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 16;
      };

      // ---- Renders a "field_group"-type section child: a short label/value
      // list for a handful of standalone questions inside an otherwise
      // table-driven section (e.g. "Other Source (Specify)" sitting alongside
      // the withdrawal-by-source table). An optional child.title prints as a
      // small heading above the list.
      const renderFieldGroupChild = (child: any) => {
        const keys: string[] = child.children || [];
        const groupFields = keys.map((k) => fieldByKey.get(k)).filter(Boolean);
        if (groupFields.length === 0) return;

        if (child.title) {
          ensureSpace(24);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9.5);
          pdf.setTextColor(0, 78, 138);
          pdf.text(child.title, marginX, cursorY + 9);
          cursorY += 16;
        }

        const body = groupFields.map((field: any) => {
          const label = field.unit ? `${field.label} (${field.unit})` : field.label || "";
          return [label, formatFieldValue(field, values[field.key])];
        });

        ensureSpace(40);
        autoTable(pdf, {
          startY: cursorY,
          body,
          theme: "striped",
          alternateRowStyles: { fillColor: [244, 248, 252] },
          styles: {
            font: "helvetica",
            fontSize: 9.5,
            cellPadding: { top: 6, bottom: 6, left: 12, right: 10 },
            lineColor: [225, 230, 238],
            lineWidth: 0.4,
            textColor: [55, 60, 70],
            valign: "middle",
          },
          columnStyles: {
            0: { cellWidth: 300, fontStyle: "bold", textColor: [40, 55, 80] },
            1: { cellWidth: 200, fontStyle: "bold", textColor: [0, 78, 138] },
          },
          margin: { left: marginX, right: pageWidth - marginX - contentWidth },
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 16;
      };

      // ---- Renders a "repeatable_table"-type section child inline, in the
      // exact position the schema places it — instead of only at the very end
      // of the document, disconnected from the section it actually belongs to.
      const renderedGroupKeys = new Set<string>();
      const renderRepeatableTableChild = (child: any) => {
        const group = repeatableGroups.find((g: any) => g.key === child.groupKey);
        if (!group) return;
        renderedGroupKeys.add(group.key);
        renderGroupTable(group);
      };

      // Recursively collects every field key referenced anywhere inside a
      // section's children, regardless of which child type carries it (table
      // rows, table summaryRow, or field_group), so "did this field get shown
      // somewhere" is answered correctly instead of only checking field_group.
      const collectPlacedKeys = (section: any, placedKeys: Set<string>) => {
        (section.children || []).forEach((child: any) => {
          if (child.type === "table") {
            (child.rows || []).forEach((row: any[]) =>
              row.forEach((cell: any) => {
                if (cell?.type === "field") placedKeys.add(cell.fieldKey);
              })
            );
            (child.summaryRow || []).forEach((cell: any) => {
              if (cell?.type === "field") placedKeys.add(cell.fieldKey);
            });
          } else if (child.type === "field_group") {
            (child.children || []).forEach((k: string) => placedKeys.add(k));
          }
          // repeatable_table fields live in repeatable_groups/values, not in
          // schema.fields, so they never need to count toward leftovers.
        });
      };

      const renderSection = (section: any) => {
        const hasContent = (section.children || []).some((child: any) => {
          if (child.type === "table") return (child.rows || []).length > 0;
          if (child.type === "field_group")
            return (child.children || []).some((k: string) => fieldByKey.has(k));
          if (child.type === "repeatable_table")
            return getGroupRows(child.groupKey).length > 0;
          return false;
        });
        if (!hasContent) return;

        ensureSpace(40);
        drawSectionBar(cursorY, (section.title || "Section").toUpperCase());
        cursorY += 26;

        (section.children || []).forEach((child: any) => {
          if (child.type === "table") renderTableSectionChild(child);
          else if (child.type === "field_group") renderFieldGroupChild(child);
          else if (child.type === "repeatable_table") renderRepeatableTableChild(child);
        });

        cursorY += 8;
      };

      if (layout && Array.isArray(layout) && layout.length > 0) {
        // Schema defines sub-forms/sections — walk them in the order they were
        // built, exactly like the Excel generic engine does. Every child type a
        // section can actually contain (table, field_group, repeatable_table) is
        // handled here, in place, instead of only field_group being recognized.
        const placedKeys = new Set<string>();

        layout.forEach((node: any) => {
          if (node?.type === "section") {
            collectPlacedKeys(node, placedKeys);
            renderSection(node);
          } else if (node?.type === "field_group") {
            // Standalone ungrouped questions at the root of the layout
            const keys: string[] = node.children || [];
            keys.forEach((k) => placedKeys.add(k));
            const groupFields = keys.map((k) => fieldByKey.get(k)).filter(Boolean);
            renderFieldSection(node.title || "General Questions", groupFields);
          }
          // metadata / instruction nodes are informational only and are
          // already covered by the report header — nothing to render here.
        });

        // Any field never referenced by a layout node — e.g. added to the form
        // after its sections were last saved — still needs to show up somewhere.
        const leftoverFields = fields.filter((f: any) => !placedKeys.has(f.key));
        renderFieldSection("Additional Parameters", leftoverFields);

        // Any repeatable group not already rendered inline via a
        // repeatable_table node still needs to appear.
        repeatableGroups.forEach((group: any) => {
          if (!renderedGroupKeys.has(group.key)) renderGroupTable(group);
        });
      } else {
        // No sections defined on this form — single flat data sheet, same as before.
        renderFieldSection("Reported Parameters", fields, monthLabel);
        repeatableGroups.forEach((group: any) => renderGroupTable(group));
      }

      // 7. Consistent footer on every page — page count + generation context, brand rule above it
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
        pdf.text(`SJVN Limited  •  ${monthLabel} Environmental Report`, 40, footerY + 14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 78, 138);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 40, footerY + 14, { align: "right" });
      }

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
      const sheet = workbook.addWorksheet((data?.forms?.title || "Submission Data").slice(0, 31));

      // ---- palette / constants lifted from the master FY annual template ----
      const NAVY = "FF002060";
      const GREY_HEADER = "FFA5A5A5";
      const TAN_ROW = "FFEEECE1";
      const TOTAL_FILL = "FFF2F2F2";
      const WHITE = "FFFFFFFF";
      const thin = { style: "thin" as const, color: { argb: "FF000000" } };
      const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

      const FISCAL_MONTHS = ["April", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

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

      const toNumericIfPossible = (v: any) => {
        if (typeof v === "number") return v;
        if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
        return v;
      };

      type SectionRowDef = {
        fieldKey?: string; // Use the direct schema key to fetch the data
        label?: string; // Only used for displaying the text in the row
        unit?: string;
        kind?: "data" | "header" | "total"; // default "data"
        totalOf?: [number, number]; // row-def indices (within this section's rows[]) to SUM per month
      };
      type SectionDef = { title: string; columnHeader: string; rows: SectionRowDef[] };
      type FormConfig = {
        monthStartCol: number; // 5 = column E, 4 = column D, etc. — read off the actual template
        hasTotalCol: boolean;  // false when the template has no annual "Total" column
        sections: SectionDef[];
      };

      const FORM_CONFIGS: Record<string, FormConfig> = {
        "energy consumption": {
          monthStartCol: 5,
          hasTotalCol: true,
          sections: [
            {
              title: "A. Fuel consumption by fuel type",
              columnHeader: "Sources of Energy",
              rows: [
                { fieldKey: "field_1784010543765_2", label: "Diesel - DG onsite", unit: "KL" },
                { fieldKey: "field_1784010715087_3", label: "Diesel (Vehicles)", unit: "KL" },
                { fieldKey: "field_1784010812990_5", label: "Light Diesel Oil (LDO)", unit: "KL" },
                { fieldKey: "field_1784010833341_7", label: "Petrol", unit: "KL" },
                { fieldKey: "field_1784010840024_9", label: "LPG", unit: "KL" },
                { fieldKey: "field_1784010876696_11", label: "CNG/PNG", unit: "KL" },
                { fieldKey: "field_1784010887803_13", label: "Other fuel (Specify)", unit: "KL" },
              ],
            },
            {
              title: "B. Electricity purchased (Renewable and Non renewable Sources)",
              columnHeader: "Sources of Energy",
              rows: [
                { fieldKey: "field_1784010907586_15", label: "Electricity Purchased from Grid (Non renewable)", unit: "kwh" },
                { fieldKey: "field_1784010929847_17", label: "Renewable Electricity Purchased from Grid", unit: "kwh" },
                { fieldKey: "field_1784010944207_19", label: "Solar/ Wind/ Hydropower", unit: "kwh" },
              ],
            },
          ],
        },
        "other air emissions": {
          monthStartCol: 4, 
          hasTotalCol: true,
          sections: [
            {
              title: "305-7 NOx, SOx, and other significant air emissions by type & weight",
              columnHeader: "Emission substances",
              rows: [
                { label: "Ambient Air Emissions", kind: "header" },
                { fieldKey: "ambient_pm10", label: "PM10", unit: "kg" },
                { fieldKey: "ambient_nox", label: "NOx", unit: "kg" },
                { fieldKey: "ambient_sox", label: "SOx", unit: "kg" },
                { fieldKey: "ambient_co", label: "CO", unit: "kg" },
                { fieldKey: "ambient_total", label: "Total Emissions", kind: "total", totalOf: [1, 4] },
                { label: "Stack Emission (average for multiple stacks)", kind: "header" },
                { fieldKey: "field_1784011888284_63", label: "PM10", unit: "kg" },
                { fieldKey: "field_1784011897052_65", label: "NOx", unit: "kg" },
                { fieldKey: "field_1784011907020_67", label: "SOx", unit: "kg" },
                { fieldKey: "field_1784011916956_69", label: "CO", unit: "kg" },
                { fieldKey: "field_1784011927794_71", label: "Total Emissions", kind: "total", totalOf: [8, 11] },
              ],
            },
          ],
        },
        "water withdrawal": {
          monthStartCol: 5,
          hasTotalCol: true,
          sections: [
            {
              title: "303-1 Total water withdrawal by source",
              columnHeader: "Water withdrawal by source",
              rows: [
                { fieldKey: "wd_surface_value", label: "Surface water", unit: "KL" },
                { fieldKey: "wd_ground_value", label: "Groundwater", unit: "KL" },
                { fieldKey: "wd_third_value", label: "Third party water", unit: "KL" },
                { fieldKey: "wd_other_value", label: "Other sources - specify", unit: "KL" },
                { fieldKey: "wd_total_withdrawal", label: "Total Water Withdrawal", kind: "total", totalOf: [0, 3] },
              ],
            },
            {
              title: "Water recycled",
              columnHeader: "Parameters",
              rows: [
                { fieldKey: "wd_recycled_total", label: "Total Water Recycled", unit: "KL" },
              ],
            },
            {
              title: "Water Discharged",
              columnHeader: "Water discharge by destination and level of treatment to Surface Water",
              rows: [
                { fieldKey: "wd_disch_notreat_value", label: "No treatment", unit: "KL" },
                { fieldKey: "wd_disch_treat_value", label: "With treatment – please specify level of treatment", unit: "KL" },
              ],
            },
          ],
        },
        "waste disposal": {
          monthStartCol: 5,
          hasTotalCol: true,
          sections: [
            {
              title: "306-3 Waste Generated",
              columnHeader: "Type of Waste",
              rows: [
                { fieldKey: "wd_plastic_qty", label: "Plastic waste (Hazardous)", unit: "Metric Tons" },
                { fieldKey: "wd_ewaste_qty", label: "E-waste (Hazardous)", unit: "Metric Tons" },
                { fieldKey: "wd_biomed_qty", label: "Bio-medical waste (Hazardous)", unit: "Metric Tons" },
                { fieldKey: "wd_cd_qty", label: "Construction & Demolition (Non-hazardous)", unit: "Metric Tons" },
                { fieldKey: "wd_battery_qty", label: "Battery waste (Hazardous)", unit: "Metric Tons" },
                { fieldKey: "wd_otherhaz_qty", label: "Other hazardous waste", unit: "Metric Tons" },
                { fieldKey: "wd_othernonhaz_qty", label: "Other non-hazardous waste", unit: "Metric Tons" },
                { fieldKey: "wd_total_produced", label: "TOTAL WASTE GENERATED", kind: "total", totalOf: [0, 6] },
              ],
            },
            {
              title: "306-4 Waste diverted from disposal",
              columnHeader: "Category of Waste",
              rows: [
                { fieldKey: "wd_recov_recycled", label: "Recycled", unit: "Metric Tons" },
                { fieldKey: "wd_recov_reused", label: "Re-used", unit: "Metric Tons" },
                { fieldKey: "wd_recov_other", label: "Other recovery operations", unit: "Metric Tons" },
                { fieldKey: "wd_recov_total", label: "TOTAL RECOVERED", kind: "total", totalOf: [0, 2] },
              ],
            },
            {
              title: "306-5 Waste directed to disposal",
              columnHeader: "Category of Waste",
              rows: [
                { fieldKey: "wd_disp_incin", label: "Incineration", unit: "Metric Tons" },
                { fieldKey: "wd_disp_landfill", label: "Landfilling", unit: "Metric Tons" },
                { fieldKey: "wd_disp_other", label: "Other disposal operations", unit: "Metric Tons" },
                { fieldKey: "wd_disp_total", label: "TOTAL DISPOSED", kind: "total", totalOf: [0, 2] },
              ],
            },
          ],
        }
      };

      const formKey = (data?.forms?.title || "").trim().toLowerCase();
      const formConfig = FORM_CONFIGS[formKey];
      const sectionDefs = formConfig?.sections;

      if (formKey.includes("refrigerant") || formKey.includes("ozone")) {
        const lastCol = "H";
        
        sheet.columns = [
          { width: 5 },   // A margin
          { width: 10 },  // B S.No.
          { width: 25 },  // C Source
          { width: 25 },  // D Location
          { width: 20 },  // E Manufacturer
          { width: 20 },  // F Year
          { width: 25 },  // G Name
          { width: 15 },  // H Quantity
        ];

        sheet.getRow(2).height = 24;
        sheet.mergeCells(`B2:${lastCol}2`);
        const titleCell = sheet.getCell("B2");
        titleCell.value = (data?.forms?.title ?? "Refrigerant & ODS Report").toUpperCase();
        titleCell.font = { name: "Inter", size: 14, bold: true, color: { argb: WHITE } };
        titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };

        const addMetaRow = (rowNum: number, label: string, value: string) => {
          sheet.mergeCells(`B${rowNum}:D${rowNum}`);
          sheet.mergeCells(`E${rowNum}:${lastCol}${rowNum}`);
          const lbl = sheet.getCell(`B${rowNum}`);
          lbl.value = label;
          lbl.font = { name: "Inter", bold: true };
          lbl.alignment = { horizontal: "right" };
          const val = sheet.getCell(`E${rowNum}`);
          val.value = value;
          val.alignment = { horizontal: "left" };
        };

        addMetaRow(4, "Financial Year:", fyLabel);
        addMetaRow(5, "Location / Site:", `${data?.sites?.name ?? ""} (${data?.sites?.code ?? ""})`);
        addMetaRow(6, "Reporting Month:", istMonthName);
        addMetaRow(7, "Data sheets filled by:", submittedByName ?? "—");

        let cursor = 11;
        sheet.mergeCells(`B${cursor}:${lastCol}${cursor}`);
        const bar = sheet.getCell(`B${cursor}`);
        bar.value = "Refrigerant Equipment & Quantities";
        bar.font = { name: "Inter", bold: true, color: { argb: WHITE } };
        bar.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        bar.alignment = { vertical: "middle" };
        cursor++;

        const headerRowNum = cursor;
        const headers = ["S. No.", "Source of Emission", "Location", "Manufacturer", "Year Installed", "Refrigerant Name", "Quantity (Tons)"];
        const headerCols = ["B", "C", "D", "E", "F", "G", "H"];
        
        headers.forEach((h, i) => {
          const cell = sheet.getCell(`${headerCols[i]}${headerRowNum}`);
          cell.value = h;
          cell.font = { name: "Inter", bold: true, color: { argb: WHITE } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY_HEADER } };
          cell.border = allBorders;
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        });
        cursor++;

        const groupRows = getGroupRows("refrigerants");
        if (groupRows.length === 0) {
           sheet.mergeCells(`B${cursor}:${lastCol}${cursor}`);
           const cell = sheet.getCell(`B${cursor}`);
           cell.value = "No refrigerants reported for this period.";
           cell.border = allBorders;
           cell.alignment = { horizontal: "center" };
        } else {
           groupRows.forEach((rowVal: any, rIdx: number) => {
              const r = cursor;
              const rowFill = rIdx % 2 === 0 ? WHITE : TAN_ROW;
              
              const sourceField = repeatableGroups.find((g:any) => g.key === "refrigerants")?.rowFields?.find((rf:any) => rf.key === "source");
              const sourceLabel = sourceField?.options?.find((o:any) => o.value === rowVal.source)?.label || rowVal.source || "—";
              
              let yearStr = rowVal.year_installed || "—";
              if (yearStr !== "—" && yearStr.includes("-")) {
                 yearStr = new Date(yearStr).getFullYear().toString();
              }

              const rowData = [
                rIdx + 1,
                sourceLabel,
                rowVal.location || "—",
                rowVal.manufacturer || "—",
                yearStr,
                rowVal.name || "—",
                Number(rowVal.quantity) || 0
              ];

              rowData.forEach((val, i) => {
                 const cell = sheet.getCell(`${headerCols[i]}${r}`);
                 cell.value = val;
                 if (i === 6) cell.numFmt = "0.00";
                 cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } };
                 cell.border = allBorders;
                 cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
              });
              cursor++;
           });
        }
      }
      else if (sectionDefs && formConfig) {
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

        // ---- Row 2: main title, merged across full width ----
        sheet.getRow(2).height = 24;
        sheet.mergeCells(`B2:${lastCol}2`);
        const titleCell = sheet.getCell("B2");
        titleCell.value = (data?.forms?.title ?? "Environmental Compliance Form").toUpperCase();
        titleCell.font = { name: "Inter", size: 14, bold: true, color: { argb: WHITE } };
        titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };

        // ---- Rows 4-7: meta block ----
        const addMetaRow = (rowNum: number, label: string, value: string) => {
          if (MONTH_COL_START === 5) {
            sheet.mergeCells(`B${rowNum}:D${rowNum}`);
            sheet.mergeCells(`E${rowNum}:${lastCol}${rowNum}`);
            const lbl = sheet.getCell(`B${rowNum}`);
            lbl.value = label;
            lbl.font = { name: "Inter", bold: true };
            lbl.alignment = { horizontal: "right" };
            const val = sheet.getCell("E" + rowNum);
            val.value = value;
            val.alignment = { horizontal: "left" };
          } else {
            sheet.mergeCells(`B${rowNum}:C${rowNum}`);
            sheet.mergeCells(`D${rowNum}:${lastCol}${rowNum}`);
            const lbl = sheet.getCell(`B${rowNum}`);
            lbl.value = label;
            lbl.font = { name: "Inter", bold: true };
            lbl.alignment = { horizontal: "right" };
            const val = sheet.getCell("D" + rowNum);
            val.value = value;
            val.alignment = { horizontal: "left" };
          }
        };

        addMetaRow(4, "Financial Year:", fyLabel);
        addMetaRow(5, "Location / Site:", `${data?.sites?.name ?? ""} (${data?.sites?.code ?? ""})`);
        addMetaRow(6, "Reporting Month:", istMonthName);
        addMetaRow(7, "Data sheets filled by:", submittedByName ?? "—");

        // ---- Section blocks ----
        const sectionStartRows = [11, 21, 31, 41]; // extend if a form ever needs more blocks
        const usedFieldKeys = new Set<string>();

        sectionDefs.forEach((section, sIdx) => {
          let cursor = sectionStartRows[sIdx] ?? 11;

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
          FISCAL_MONTHS.forEach((m, i) => {
            sheet.getCell(`${monthColLetter(i)}${headerRowNum}`).value = m;
          });
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
            cell.border = allBorders;
            cell.alignment = { horizontal: "center", vertical: "middle" };
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
              cell.value = rowDef.label;
              cell.font = { name: "Inter", bold: true, italic: true };
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TAN_ROW } };
              cell.alignment = { vertical: "middle" };
              cursor++;
              return;
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
              const fromRow = rowNumberByIndex[fromIdx];
              const toRow = rowNumberByIndex[toIdx];
              FISCAL_MONTHS.forEach((_, i) => {
                const col = monthColLetter(i);
                const cell = sheet.getCell(`${col}${r}`);
                let colSum = 0;
                for (let currRow = fromRow; currRow <= toRow; currRow++) {
                  const val = sheet.getCell(`${col}${currRow}`).value;
                  if (typeof val === "number") colSum += val;
                  else if (val && typeof (val as any).result === "number") colSum += (val as any).result;
                }
                cell.value = { formula: `SUM(${col}${fromRow}:${col}${toRow})`, result: colSum };
                cell.numFmt = "0.00";
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
                cell.border = allBorders;
                cell.alignment = { horizontal: "center", vertical: "middle" };
              });
            } else {
              // Fetch the value directly using the fieldKey
              const rawVal = rowDef.fieldKey ? values[rowDef.fieldKey] : undefined;
              const numericVal = toNumericIfPossible(rawVal);

              FISCAL_MONTHS.forEach((_, i) => {
                const cell = sheet.getCell(`${monthColLetter(i)}${r}`);
                if (i <= fiscalColIndex) {
                  const monthVals = valuesByFiscalIndex[i];
                  const monthNumericVal = toNumericIfPossible(rowDef.fieldKey && monthVals ? monthVals[rowDef.fieldKey] : undefined);
                  cell.value = monthNumericVal !== undefined && monthNumericVal !== "" ? monthNumericVal : 0;
                }
                cell.numFmt = "0.00";
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } };
                cell.border = allBorders;
                cell.alignment = { horizontal: "center", vertical: "middle" };
              });
            }

            if (formConfig.hasTotalCol) {
              const totalCell = sheet.getCell(`${totalColLetter}${r}`);
              let rowSum = 0;
              for (let i = 0; i < 12; i++) {
                const val = sheet.getCell(`${monthColLetter(i)}${r}`).value;
                if (typeof val === "number") rowSum += val;
                else if (val && typeof (val as any).result === "number") rowSum += (val as any).result;
              }
              totalCell.value = { formula: `SUM(${monthColLetter(0)}${r}:${monthColLetter(11)}${r})`, result: rowSum };
              totalCell.numFmt = "0.00";
              totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
              totalCell.border = allBorders;
              totalCell.alignment = { horizontal: "center", vertical: "middle" };
            }

            ["B", "C"].forEach((col) => {
              const cell = sheet.getCell(`${col}${r}`);
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } };
              cell.border = allBorders;
              cell.alignment = { vertical: "middle", wrapText: true };
            });

            cursor++;
          });
        });
      }
      else if (data?.forms?.schema?.layout && Array.isArray(data.forms.schema.layout)) {
        // ---- Generic schema-driven engine: reads schema.layout + schema.fields
        // directly, so a brand-new form needs ZERO export code added here ----
        const layout: any[] = data.forms.schema.layout;
        const fieldByKey = new Map<string, any>(fields.map((f: any) => [f.key, f]));

        const MONTH_COL_START = 5; // column E
        const monthColLetter = (i: number) => String.fromCharCode(64 + MONTH_COL_START + i);

        sheet.columns = [
          { width: 5 },
          { width: 42 },
          { width: 8 },
          { width: 8 },
          ...FISCAL_MONTHS.map(() => ({ width: 9 })),
          { width: 12 },
        ];

        sheet.getRow(2).height = 24;
        sheet.mergeCells("B2:Q2");
        const titleCell = sheet.getCell("B2");
        titleCell.value = (data?.forms?.title ?? "Environmental Compliance Form").toUpperCase();
        titleCell.font = { name: "Inter", size: 14, bold: true, color: { argb: WHITE } };
        titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };

        const addMetaRow = (rowNum: number, label: string, value: string) => {
          sheet.mergeCells(`B${rowNum}:D${rowNum}`);
          const lbl = sheet.getCell(`B${rowNum}`);
          lbl.value = label;
          lbl.font = { name: "Inter", bold: true };
          lbl.alignment = { horizontal: "right" };
          sheet.mergeCells(`E${rowNum}:Q${rowNum}`);
          const val = sheet.getCell(`E${rowNum}`);
          val.value = value;
          val.alignment = { horizontal: "left" };
        };
        addMetaRow(4, "Financial Year:", fyLabel);
        addMetaRow(5, "Location / Site:", `${data?.sites?.name ?? ""} (${data?.sites?.code ?? ""})`);
        addMetaRow(6, "Reporting Month:", istMonthName);
        addMetaRow(7, "Data sheets filled by:", submittedByName ?? "—");

        let cursor = 9;
        const standaloneRows: { label: string; value: string }[] = [];

        layout.forEach((node: any) => {
          if (node?.type === "section") {
            const keys: string[] = (node.children || []).flatMap((c: any) =>
              c?.type === "field_group" ? c.children || [] : []
            );
            const sectionFields = keys.map((k) => fieldByKey.get(k)).filter(Boolean);
            if (sectionFields.length === 0) return;

            cursor += 2; // gap before the section
            sheet.mergeCells(`B${cursor}:Q${cursor}`);
            const bar = sheet.getCell(`B${cursor}`);
            bar.value = node.title || "Section";
            bar.font = { name: "Inter", bold: true, color: { argb: WHITE } };
            bar.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
            bar.alignment = { vertical: "middle" };
            cursor++;

            const headerRowNum = cursor;
            sheet.getCell(`B${headerRowNum}`).value = "Sources / Parameters";
            sheet.mergeCells(`C${headerRowNum}:D${headerRowNum}`);
            sheet.getCell(`C${headerRowNum}`).value = "Unit";
            FISCAL_MONTHS.forEach((m, i) => {
              sheet.getCell(`${monthColLetter(i)}${headerRowNum}`).value = m;
            });
            sheet.getCell(`Q${headerRowNum}`).value = "Total";
            ["B", "C", ...FISCAL_MONTHS.map((_, i) => monthColLetter(i)), "Q"].forEach((col) => {
              const cell = sheet.getCell(`${col}${headerRowNum}`);
              cell.font = { name: "Inter", bold: true, color: { argb: WHITE } };
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY_HEADER } };
              cell.border = allBorders;
              cell.alignment = { horizontal: "center", vertical: "middle" };
            });
            cursor++;

            sectionFields.forEach((field: any, rIdx: number) => {
              const r = cursor;
              sheet.getCell(`B${r}`).value = field.label;
              sheet.mergeCells(`C${r}:D${r}`);
              sheet.getCell(`C${r}`).value = field.unit ?? "";

              const rawVal = values[field.key];
              const numericVal = toNumericIfPossible(rawVal);
              const rowFill = rIdx % 2 === 0 ? WHITE : TAN_ROW;

              FISCAL_MONTHS.forEach((_, i) => {
                const cell = sheet.getCell(`${monthColLetter(i)}${r}`);
                if (i <= fiscalColIndex) {
                  const monthVals = valuesByFiscalIndex[i];
                  const monthNumericVal = toNumericIfPossible(monthVals ? monthVals[field.key] : undefined);
                  cell.value = monthNumericVal !== undefined && monthNumericVal !== "" ? monthNumericVal : 0;
                }
                if (typeof cell.value === "number") cell.numFmt = "0.00";
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } };
                cell.border = allBorders;
                cell.alignment = { horizontal: "center", vertical: "middle" };
              });

              const totalCell = sheet.getCell(`Q${r}`);
              let rowSum = 0;
              for (let i = 0; i < 12; i++) {
                const val = sheet.getCell(`${monthColLetter(i)}${r}`).value;
                if (typeof val === "number") rowSum += val;
                else if (val && typeof (val as any).result === "number") rowSum += (val as any).result;
              }
              totalCell.value = { formula: `SUM(E${r}:P${r})`, result: rowSum };
              totalCell.numFmt = "0.00";
              totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
              totalCell.border = allBorders;
              totalCell.alignment = { horizontal: "center", vertical: "middle" };

              ["B", "C"].forEach((col) => {
                const cell = sheet.getCell(`${col}${r}`);
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowFill } };
                cell.border = allBorders;
                cell.alignment = { vertical: "middle", wrapText: true };
              });

              cursor++;
            });
          } else if (node?.type === "field_group") {
            const key = (node.children || [])[0];
            const field = key ? fieldByKey.get(key) : null;
            if (field) {
              standaloneRows.push({ label: field.label, value: `${formatFieldValue(field, values[field.key])}` });
            }
          }
          // repeatable_table nodes render via the existing repeatableGroups
          // loop further down in this function — nothing to do here.
        });

        if (standaloneRows.length > 0) {
          cursor += 1;
          standaloneRows.forEach((row) => {
            const r = cursor;
            sheet.mergeCells(`B${r}:D${r}`);
            sheet.getCell(`B${r}`).value = row.label;
            sheet.getCell(`B${r}`).font = { name: "Inter", bold: true };
            sheet.mergeCells(`E${r}:Q${r}`);
            sheet.getCell(`E${r}`).value = row.value;
            cursor++;
          });
        }
      }
      else{
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
            const filesCount = values[`${field.key}_files`]?.length || 0;
            const attachmentText = filesCount > 0 ? ` [Has ${filesCount} Attachment(s)]` : '';
            const val = `${formatFieldValue(field, values[field.key])}${attachmentText}`;
            const row = sheet.addRow(["", label, val]);

            ['B', 'C'].forEach(col => {
              const cell = sheet.getCell(`${col}${row.number}`);
              cell.border = {
                top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
              };
              cell.alignment = { vertical: 'middle', wrapText: true };
            });
          });
        }

      if (!formKey.includes("refrigerant") && !formKey.includes("ozone")) {
        repeatableGroups.forEach((group: any) => {
          const groupRows = getGroupRows(group.key);
        if (groupRows.length === 0) return;

        sheet.addRow([]);
        const groupHeader = sheet.addRow(["", (group.label || "Repeatable Entries").toUpperCase()]);
        groupHeader.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF004E8A" } };

        const rowHeaders = ["S. No.", ...group.rowFields.map((rf: any) => rf.label + (rf.unit ? ` (${rf.unit})` : ""))];
        const tblHeaderRow = sheet.addRow(["", ...rowHeaders]);
        tblHeaderRow.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };

        rowHeaders.forEach((_, idx) => {
          const cell = tblHeaderRow.getCell(idx + 2);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004E8A' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        groupRows.forEach((rowVal: any, rIdx: number) => {
          const rowData = [rIdx + 1, ...group.rowFields.map((rf: any) => formatFieldValue(rf, rowVal[rf.key]))];
          const dataRow = sheet.addRow(["", ...rowData]);

          rowHeaders.forEach((_, idx) => {
            const cell = dataRow.getCell(idx + 2);
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          });
        });
      });
      } // Closes the refrigerant guard check

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