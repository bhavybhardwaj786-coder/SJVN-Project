// src/lib/renderFormBody.ts
//
// Schema-driven PDF body renderer, extracted out of the single-submission
// report (`_submissionId.tsx`) so it can be reused by ANY place that needs
// to print a form's data — right now that's the single report and the
// Combined Report. One renderer, one design, no drift between the two.
//
// This file does NOT draw the SJVN header/logo/title block — callers are
// responsible for that (single report draws it once per document; combined
// report draws it once at the top, then calls this once per form). What
// this file draws is everything below that: the navy form-title bar, every
// schema-driven section/table/field-group, and repeatable-group tables.
//
// Usage:
//   const finalY = renderFormBody({
//     pdf, autoTable, pageWidth,
//     startY: cursorY,
//     formTitle: form.title,
//     fields: sub.forms.schema.fields || [],
//     layout: sub.forms.schema.layout,
//     repeatableGroups: sub.forms.schema.repeatable_groups || [],
//     values: sub.data || {},
//   });

export interface RenderFormBodyOptions {
  pdf: any;
  autoTable: any;
  pageWidth: number;
  /** Y position to start drawing at (e.g. current cursor on the page). */
  startY: number;
  formTitle: string;
  fields: any[];
  layout?: any[] | null;
  repeatableGroups?: any[];
  values: Record<string, unknown>;
  /**
   * If false, skips drawing the navy "form title" bar at the top — useful if
   * the caller already printed a title for this form some other way.
   * Defaults to true.
   */
  drawTitleBar?: boolean;
}

function formatFieldValue(field: any, value: any) {
  if (value === undefined || value === null || value === "") return "—";
  if (field?.type === "checkbox") return value ? "Yes" : "No";
  if (field?.type === "select") {
    const opt = field?.options?.find((o: any) => o.value === value);
    return opt?.label ?? value;
  }
  return String(value);
}

/**
 * Renders one form's full body (title bar + every section/table/group it
 * defines) starting at `startY`, paginating with `pdf.addPage()` as needed.
 * Returns the Y position immediately after the last thing drawn, so the
 * caller can keep stacking content (or start the next form) from there.
 */
export function renderFormBody(opts: RenderFormBodyOptions): number {
  const {
    pdf,
    autoTable,
    pageWidth,
    formTitle,
    fields = [],
    layout,
    repeatableGroups = [],
    values,
    drawTitleBar = true,
  } = opts;

  let cursorY = opts.startY;

  const contentWidth = 500;
  const marginX = (pageWidth - contentWidth) / 2;

  const getGroupRows = (groupKey: string): Record<string, unknown>[] => {
    const raw = (values as any)[groupKey];
    return Array.isArray(raw) ? raw : [];
  };

  const fieldByKey = new Map<string, any>(fields.map((f: any) => [f.key, f]));

  const ensureSpace = (neededHeight: number) => {
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (cursorY + neededHeight > pageHeight - 60) {
      pdf.addPage();
      cursorY = 50;
    }
  };

  // Solid rounded bar used for every section heading — same "navy pill"
  // treatment as the single-submission report.
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

  // Form-level title bar — slightly larger than a section bar so each form
  // clearly reads as its own report inside the combined document.
  if (drawTitleBar) {
    ensureSpace(40);
    pdf.setFillColor(0, 78, 138);
    pdf.roundedRect(marginX, cursorY, contentWidth, 30, 5, 5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(255, 255, 255);
    pdf.text((formTitle || "Form").toUpperCase(), pageWidth / 2, cursorY + 20, { align: "center" });
    cursorY += 30 + 18;
  }

  const renderFieldSection = (title: string, sectionFields: any[], rightLabel?: string) => {
    if (!sectionFields || sectionFields.length === 0) return;
    ensureSpace(60);
    drawSectionBar(cursorY, (title || "Section").toUpperCase(), rightLabel, 24);
    cursorY += 24;

    const body = sectionFields.map((field: any) => {
      const label = field.unit ? `${field.label} (${field.unit})` : field.label || "";
      return [label, formatFieldValue(field, (values as any)[field.key])];
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
      ...group.rowFields.map((rf: any) => formatFieldValue(rf, rowVal[rf.key])),
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

  const renderTableSectionChild = (child: any) => {
    if (!child.columns || !child.rows) return;
    ensureSpace(60);

    const resolveCell = (cell: any) =>
      cell?.type === "field"
        ? formatFieldValue(fieldByKey.get(cell.fieldKey), (values as any)[cell.fieldKey])
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
      return [label, formatFieldValue(field, (values as any)[field.key])];
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

  const renderedGroupKeys = new Set<string>();
  const renderRepeatableTableChild = (child: any) => {
    const group = repeatableGroups.find((g: any) => g.key === child.groupKey);
    if (!group) return;
    renderedGroupKeys.add(group.key);
    renderGroupTable(group);
  };

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
    });
  };

  const renderSection = (section: any) => {
    const hasContent = (section.children || []).some((child: any) => {
      if (child.type === "table") return (child.rows || []).length > 0;
      if (child.type === "field_group")
        return (child.children || []).some((k: string) => fieldByKey.has(k));
      if (child.type === "repeatable_table") return getGroupRows(child.groupKey).length > 0;
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
    const placedKeys = new Set<string>();

    layout.forEach((node: any) => {
      if (node?.type === "section") {
        collectPlacedKeys(node, placedKeys);
        renderSection(node);
      } else if (node?.type === "field_group") {
        const keys: string[] = node.children || [];
        keys.forEach((k) => placedKeys.add(k));
        const groupFields = keys.map((k) => fieldByKey.get(k)).filter(Boolean);
        renderFieldSection(node.title || "General Questions", groupFields);
      }
    });

    const leftoverFields = fields.filter((f: any) => !placedKeys.has(f.key));
    renderFieldSection("Additional Parameters", leftoverFields);

    repeatableGroups.forEach((group: any) => {
      if (!renderedGroupKeys.has(group.key)) renderGroupTable(group);
    });
  } else {
    renderFieldSection("Reported Parameters", fields);
    repeatableGroups.forEach((group: any) => renderGroupTable(group));
  }

  return cursorY;
}