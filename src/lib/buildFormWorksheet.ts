import type ExcelJS from "exceljs";

// ---- palette / constants lifted from the master FY annual template ----
// (identical to what both _submissionId.tsx and app.tsx used to define locally)
export const NAVY = "FF002060";
export const GREY_HEADER = "FFA5A5A5";
export const TAN_ROW = "FFEEECE1";
export const TOTAL_FILL = "FFF2F2F2";
export const WHITE = "FFFFFFFF";
const thin = { style: "thin" as const, color: { argb: "FF000000" } };
const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

export const FISCAL_MONTHS = [
  "April", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
];

export type SectionRowDef = {
  fieldKey?: string;
  matchLabel?: string; // only used by callers that need cross-schema label matching (e.g. combined export)
  label?: string;
  unit?: string;
  kind?: "data" | "header" | "total";
  totalOf?: [number, number];
};
export type SectionDef = { title: string; columnHeader: string; rows: SectionRowDef[] };
export type FormConfig = { monthStartCol: number; hasTotalCol: boolean; sections: SectionDef[] };

// Unchanged from both files — single source of truth now.
export const FORM_CONFIGS: Record<string, FormConfig> = {
  "energy consumption": {
    monthStartCol: 5,
    hasTotalCol: true,
    sections: [
      {
        title: "A. Fuel consumption by fuel type",
        columnHeader: "Sources of Energy",
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
        title: "B. Electricity purchased (Renewable and Non renewable Sources)",
        columnHeader: "Sources of Energy",
        rows: [
          { fieldKey: "field_1784010907586_15", matchLabel: "Electricity Purchased from Grid (Non renewable)", label: "Electricity Purchased from Grid (Non renewable)", unit: "kwh" },
          { fieldKey: "field_1784010929847_17", matchLabel: "Renewable Electricity Purchased from Grid", label: "Renewable Electricity Purchased from Grid", unit: "kwh" },
          { fieldKey: "field_1784010944207_19", matchLabel: "Solar/ Wind/ Hydropower", label: "Solar/ Wind/ Hydropower", unit: "kwh" },
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
    monthStartCol: 5,
    hasTotalCol: true,
    sections: [
      {
        title: "303-1 Total water withdrawal by source",
        columnHeader: "Water withdrawal by source",
        rows: [
          { fieldKey: "wd_surface_value", matchLabel: "Surface Water Withdrawn", label: "Surface water", unit: "KL" },
          { fieldKey: "wd_ground_value", matchLabel: "Groundwater Withdrawn", label: "Groundwater", unit: "KL" },
          { fieldKey: "wd_third_value", matchLabel: "Third Party Water Withdrawn", label: "Third party water", unit: "KL" },
          { fieldKey: "wd_other_value", matchLabel: "Other Sources Withdrawn", label: "Other sources - specify", unit: "KL" },
          { fieldKey: "wd_total_withdrawal", matchLabel: "Total Water Withdrawal", label: "Total Water Withdrawal", kind: "total", totalOf: [0, 3] },
        ],
      },
      {
        title: "Water recycled",
        columnHeader: "Parameters",
        rows: [{ fieldKey: "wd_recycled_total", matchLabel: "Total Water Recycled", label: "Total Water Recycled", unit: "KL" }],
      },
      {
        title: "Water Discharged",
        columnHeader: "Water discharge by destination and level of treatment to Surface Water",
        rows: [
          { fieldKey: "wd_disch_notreat_value", matchLabel: "Water Discharged - No Treatment", label: "No treatment", unit: "KL" },
          { fieldKey: "wd_disch_treat_value", matchLabel: "Water Discharged - With Treatment", label: "With treatment – please specify level of treatment", unit: "KL" },
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
          { fieldKey: "wd_plastic_qty", matchLabel: "Plastic waste (Hazardous)", label: "Plastic waste (Hazardous)", unit: "Metric Tons" },
          { fieldKey: "wd_ewaste_qty", matchLabel: "E-waste (Hazardous)", label: "E-waste (Hazardous)", unit: "Metric Tons" },
          { fieldKey: "wd_biomed_qty", matchLabel: "Bio-medical waste (Hazardous)", label: "Bio-medical waste (Hazardous)", unit: "Metric Tons" },
          { fieldKey: "wd_cd_qty", matchLabel: "Construction & Demolition (Non-hazardous)", label: "Construction & Demolition (Non-hazardous)", unit: "Metric Tons" },
          { fieldKey: "wd_battery_qty", matchLabel: "Battery waste (Hazardous)", label: "Battery waste (Hazardous)", unit: "Metric Tons" },
          { fieldKey: "wd_otherhaz_qty", matchLabel: "Other hazardous waste", label: "Other hazardous waste", unit: "Metric Tons" },
          { fieldKey: "wd_othernonhaz_qty", matchLabel: "Other non-hazardous waste", label: "Other non-hazardous waste", unit: "Metric Tons" },
          { fieldKey: "wd_total_produced", matchLabel: "TOTAL WASTE GENERATED", label: "TOTAL WASTE GENERATED", kind: "total", totalOf: [0, 6] },
        ],
      },
      {
        title: "306-4 Waste diverted from disposal",
        columnHeader: "Category of Waste",
        rows: [
          { fieldKey: "wd_recov_recycled", matchLabel: "Recycled", label: "Recycled", unit: "Metric Tons" },
          { fieldKey: "wd_recov_reused", matchLabel: "Re-used", label: "Re-used", unit: "Metric Tons" },
          { fieldKey: "wd_recov_other", matchLabel: "Other recovery operations", label: "Other recovery operations", unit: "Metric Tons" },
          { fieldKey: "wd_recov_total", matchLabel: "TOTAL RECOVERED", label: "TOTAL RECOVERED", kind: "total", totalOf: [0, 2] },
        ],
      },
      {
        title: "306-5 Waste directed to disposal",
        columnHeader: "Category of Waste",
        rows: [
          { fieldKey: "wd_disp_incin", matchLabel: "Incineration", label: "Incineration", unit: "Metric Tons" },
          { fieldKey: "wd_disp_landfill", matchLabel: "Landfilling", label: "Landfilling", unit: "Metric Tons" },
          { fieldKey: "wd_disp_other", matchLabel: "Other disposal operations", label: "Other disposal operations", unit: "Metric Tons" },
          { fieldKey: "wd_disp_total", matchLabel: "TOTAL DISPOSED", label: "TOTAL DISPOSED", kind: "total", totalOf: [0, 2] },
        ],
      },
    ],
  },
};

export function toNumericIfPossible(v: any) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  return v;
}

export function formatFieldValue(field: any, value: any) {
  if (value === undefined || value === null || value === "") return "—";
  if (field?.type === "checkbox") return value ? "Yes" : "No";
  if (field?.type === "select") {
    const opt = field.options?.find((o: any) => o.value === value);
    return opt?.label ?? value;
  }
  return String(value);
}

export interface BuildFormWorksheetParams {
  workbook: ExcelJS.Workbook;
  formTitle: string;
  schema: { fields?: any[]; repeatable_groups?: any[]; layout?: any[] };
  /** The "current" row of data used by the refrigerant table, the generic
   * schema.layout engine, the plain fallback table, and the repeatable-group
   * appendix. Callers decide what "current" means for them (a single
   * submission's data for the individual export, the latest submission's
   * data for the combined export). */
  values: Record<string, unknown>;
  siteName: string;
  siteCode: string;
  fyLabel: string;
  reportingMonthLabel: string;
  metaRow7Label: string;
  metaRow7Value: string;
  /** Fiscal-index (0=April...11=March) up to which month columns should be
   * populated (later columns are left blank, matching prior behavior). */
  cutoffFiscalIndex: number;
  /** Only needed for FORM_CONFIGS / matrix forms. Given a fiscal-month index
   * and the row definition being rendered, return the raw value for that
   * month (or undefined). This is where each caller's own data-resolution
   * business logic lives — the renderer itself stays identical. */
  resolveMonthlyValue?: (fiscalIndex: number, rowDef: SectionRowDef) => any;
}

/**
 * Renders one worksheet for one form, using the exact same layout, styling,
 * merges, formulas, and branch selection as the original per-submission
 * Excel export. Adds the worksheet to `workbook` and returns it.
 */
export function buildFormWorksheet(params: BuildFormWorksheetParams): ExcelJS.Worksheet {
  const {
    workbook,
    formTitle,
    schema,
    values,
    siteName,
    siteCode,
    fyLabel,
    reportingMonthLabel,
    metaRow7Label,
    metaRow7Value,
    cutoffFiscalIndex,
    resolveMonthlyValue,
  } = params;

  const fields = schema.fields || [];
  const repeatableGroups: any[] = schema.repeatable_groups || [];
  const layout = schema.layout;

  const getGroupRows = (groupKey: string): Record<string, unknown>[] => {
    const raw = (values as any)?.[groupKey];
    return Array.isArray(raw) ? raw : [];
  };

  const safeTitle = formTitle.replace(/[\\\/*?:\[\]]/g, "").slice(0, 31);
  const sheet = workbook.addWorksheet(safeTitle);

  const formKey = formTitle.trim().toLowerCase();
  const formConfig = FORM_CONFIGS[formKey];

  if (formKey.includes("refrigerant") || formKey.includes("ozone")) {
    const lastCol = "H";

    sheet.columns = [
      { width: 5 },
      { width: 10 },
      { width: 25 },
      { width: 25 },
      { width: 20 },
      { width: 20 },
      { width: 25 },
      { width: 15 },
    ];

    sheet.getRow(2).height = 24;
    sheet.mergeCells(`B2:${lastCol}2`);
    const titleCell = sheet.getCell("B2");
    titleCell.value = (formTitle || "Refrigerant & ODS Report").toUpperCase();
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
    addMetaRow(5, "Location / Site:", `${siteName} (${siteCode})`);
    addMetaRow(6, "Reporting Month:", reportingMonthLabel);
    addMetaRow(7, metaRow7Label, metaRow7Value);

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

        const sourceField = repeatableGroups.find((g: any) => g.key === "refrigerants")?.rowFields?.find((rf: any) => rf.key === "source");
        const sourceLabel = sourceField?.options?.find((o: any) => o.value === rowVal.source)?.label || rowVal.source || "—";

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
          Number(rowVal.quantity) || 0,
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
  } else if (formConfig && formConfig.sections) {
    const MONTH_COL_START = formConfig.monthStartCol;
    const TOTAL_COL = MONTH_COL_START + 12;
    const monthColLetter = (i: number) => String.fromCharCode(64 + MONTH_COL_START + i);
    const totalColLetter = String.fromCharCode(64 + TOTAL_COL);
    const lastCol = formConfig.hasTotalCol ? totalColLetter : monthColLetter(11);

    if (MONTH_COL_START === 5) {
      sheet.columns = [
        { width: 5 },
        { width: 42 },
        { width: 8 },
        { width: 8 },
        ...FISCAL_MONTHS.map(() => ({ width: 9 })),
        ...(formConfig.hasTotalCol ? [{ width: 12 }] : []),
      ];
    } else {
      sheet.columns = [
        { width: 5 },
        { width: 42 },
        { width: 12 },
        ...FISCAL_MONTHS.map(() => ({ width: 9 })),
        ...(formConfig.hasTotalCol ? [{ width: 12 }] : []),
      ];
    }

    sheet.getRow(2).height = 24;
    sheet.mergeCells(`B2:${lastCol}2`);
    const titleCell = sheet.getCell("B2");
    titleCell.value = (formTitle || "Environmental Compliance Form").toUpperCase();
    titleCell.font = { name: "Inter", size: 14, bold: true, color: { argb: WHITE } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

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
    addMetaRow(5, "Location / Site:", `${siteName} (${siteCode})`);
    addMetaRow(6, "Reporting Month:", reportingMonthLabel);
    addMetaRow(7, metaRow7Label, metaRow7Value);

    const sectionStartRows = [11, 21, 31, 41];
    const usedFieldKeys = new Set<string>();

    formConfig.sections.forEach((section, sIdx) => {
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
          FISCAL_MONTHS.forEach((_, i) => {
            const cell = sheet.getCell(`${monthColLetter(i)}${r}`);
            if (i <= cutoffFiscalIndex) {
              const rawVal = resolveMonthlyValue ? resolveMonthlyValue(i, rowDef) : undefined;
              const numericVal = toNumericIfPossible(rawVal);
              cell.value = numericVal !== undefined && numericVal !== "" ? numericVal : 0;
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
  } else if (layout && Array.isArray(layout)) {
    const fieldByKey = new Map<string, any>(fields.map((f: any) => [f.key, f]));

    const MONTH_COL_START = 5;
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
    titleCell.value = (formTitle || "Environmental Compliance Form").toUpperCase();
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
    addMetaRow(5, "Location / Site:", `${siteName} (${siteCode})`);
    addMetaRow(6, "Reporting Month:", reportingMonthLabel);
    addMetaRow(7, metaRow7Label, metaRow7Value);

    let cursor = 9;
    const standaloneRows: { label: string; value: string }[] = [];

    layout.forEach((node: any) => {
      if (node?.type === "section") {
        const keys: string[] = (node.children || []).flatMap((c: any) =>
          c?.type === "field_group" ? c.children || [] : []
        );
        const sectionFields = keys.map((k) => fieldByKey.get(k)).filter(Boolean);
        if (sectionFields.length === 0) return;

        cursor += 2;
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

          const rawVal = (values as any)?.[field.key];
          const numericVal = toNumericIfPossible(rawVal);
          const rowFill = rIdx % 2 === 0 ? WHITE : TAN_ROW;

          FISCAL_MONTHS.forEach((_, i) => {
            const cell = sheet.getCell(`${monthColLetter(i)}${r}`);
            if (i <= cutoffFiscalIndex) {
              const monthRawVal = resolveMonthlyValue ? resolveMonthlyValue(i, { fieldKey: field.key }) : undefined;
              const monthNumericVal = toNumericIfPossible(monthRawVal);
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
          standaloneRows.push({ label: field.label, value: `${formatFieldValue(field, (values as any)?.[field.key])}` });
        }
      }
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
  } else {
    // Provide default column widths so the fallback table doesn't squish
    sheet.columns = [
      { width: 5 },   // A: Margin
      { width: 42 },  // B: Parameter / Question
      { width: 30 },  // C: Reported Value
    ];

    const titleRow = sheet.addRow(["", (formTitle || "Environmental Compliance Form").toUpperCase()]);
    titleRow.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF004E8A" } };

    sheet.addRow([]);

    const addMeta = (label: string, value: string) => {
      const row = sheet.addRow(["", label, value]);
      row.getCell(2).font = { name: "Arial", bold: true };
      row.getCell(2).alignment = { horizontal: "right" };
      row.getCell(3).alignment = { horizontal: "left" };
    };

    addMeta("Reporting Month:", reportingMonthLabel ?? "—");
    addMeta("Location / Site:", `${siteName ?? ""} (${siteCode ?? ""})`);
    addMeta(metaRow7Label, metaRow7Value ?? "—");

    sheet.addRow([]);
    sheet.addRow([]);

    const headerRow = sheet.addRow(["", "Parameter / Question", "Reported Value"]);
    headerRow.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };

    ["B", "C"].forEach((col) => {
      const cell = sheet.getCell(`${col}${headerRow.number}`);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF004E8A" } };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    fields.forEach((field: any) => {
      const label = field.label || "";
      const filesCount = (values as any)?.[`${field.key}_files`]?.length || 0;
      const attachmentText = filesCount > 0 ? ` [Has ${filesCount} Attachment(s)]` : "";
      const val = `${formatFieldValue(field, (values as any)?.[field.key])}${attachmentText}`;
      const row = sheet.addRow(["", label, val]);

      ["B", "C"].forEach((col) => {
        const cell = sheet.getCell(`${col}${row.number}`);
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        cell.alignment = { vertical: "middle", wrapText: true };
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
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF004E8A" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      groupRows.forEach((rowVal: any, rIdx: number) => {
        const rowData = [rIdx + 1, ...group.rowFields.map((rf: any) => formatFieldValue(rf, rowVal[rf.key]))];
        const dataRow = sheet.addRow(["", ...rowData]);

        rowHeaders.forEach((_, idx) => {
          const cell = dataRow.getCell(idx + 2);
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        });
      });
    });
  }

  return sheet;
}
