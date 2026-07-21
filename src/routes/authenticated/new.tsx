import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Plus, Trash2, GripVertical, Loader2, ArrowLeft, Check,
  Save, Settings2, ListChecks, Users, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { formsService, sitesService } from "@/services";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/authenticated/new")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { edit?: string } => {
    return {
      edit: typeof search.edit === "string" ? search.edit : undefined,
    };
  },
  component: NewForm,
});

const ICON_OPTIONS = [
  "Activity", "AlertTriangle", "Beaker", "CloudRain", "Droplet", 
  "Factory", "Flame", "Fuel", "Gauge", "Leaf", "MapPinned", 
  "Microscope", "Radiation", "Recycle", "Sun", "Thermometer", 
  "Trash2", "Trees", "Truck", "Volume2", "Wallet", "Waves", "Wind", "Zap"
];

const FIELD_TYPES = [
  { value: "number", label: "Number (with unit)" },
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Yes / No" },
];

const COMMON_UNITS = [
  "mg/L", "mg/m³", "µg/m³", "KL", "kL/day", "m³", "m³/day",
  "kg", "tonnes", "tCO2e", "dB", "dB(A)", "%", "ppm", "°C", "kWh", "INR",
];

type FieldOption = { label: string; value: string };
type CustomMetaAttribute = { key: string; label: string; type: "text" | "select" | "number" | "date"; options?: string };

type FormField = {
  key: string;
  label: string;
  type: string;
  unit?: string;
  required: boolean;
  options?: FieldOption[];
  metaAttributes?: CustomMetaAttribute[];
};

type QuestionBlock = {
  blockId: string;
  blockType: "question";
  field: FormField;
};

type SectionBlock = {
  blockId: string;
  blockType: "section";
  title: string;
  description: string;
  children: QuestionBlock[];
};

type RepeatableRowField = FormField;

// TODO: RepeatableGroupBlock is intentionally root-level only (never
// nested inside SectionBlock.children) so that SectionBlock's
// contract (children: QuestionBlock[]) stays untouched. Full nesting
// support (a section containing a mix of questions and repeatable
// groups) requires widening SectionBlock.children to
// (QuestionBlock | RepeatableGroupBlock)[] — that's a deliberate
// follow-up task, not an oversight here.
type RepeatableGroupBlock = {
  blockId: string;
  blockType: "repeatable_group";
  groupKey: string;
  label: string;
  minRows: number;
  rowFields: RepeatableRowField[];
};

type FormBlock = QuestionBlock | SectionBlock | RepeatableGroupBlock;

type SiteRow = { id: string; name: string; code: string };

let fieldCounter = 0;
function newFieldKey() {
  fieldCounter += 1;
  return `field_${Date.now()}_${fieldCounter}`;
}

function slugifyKey(label: string) {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || newFieldKey()
  );
}

// ==========================================================
// SHARED TRAVERSAL LAYER
// One place that understands the shape of the block tree
// (root blocks, some of which are sections containing question
// children). Compiler, deserializer, validator, and renderer all
// build on top of these two functions instead of re-walking the
// tree themselves.
// ==========================================================

type BlockLocation =
  | { scope: "root"; index: number }
  | { scope: "section"; sectionIndex: number; index: number };

/**
 * Visits every block in the tree — every root block, and every
 * child of every section — calling `visit` once per block with
 * enough positional context to address that exact block again
 * later (same (blockIndex, childIndex) addressing the existing
 * state handlers already use).
 *
 * Pure iteration only: this function has no idea what a question
 * "means," what it compiles to, or how it renders. That's what
 * makes it safe for every consumer to share.
 */
function walkBlocks(blocks: FormBlock[], visit: (block: FormBlock, location: BlockLocation) => void): void {
  blocks.forEach((block, index) => {
    visit(block, { scope: "root", index });
    if (block.blockType === "section") {
      block.children.forEach((child, childIndex) => {
        visit(child, { scope: "section", sectionIndex: index, index: childIndex });
      });
    }
  });
}

/**
 * Flattens every block of a given blockType out of the tree,
 * root and section children alike, discarding position info the
 * caller doesn't need. Replaces every hand-rolled
 * "forEach + if question push + if section push children" pattern
 * that used to be duplicated across compileFields, validateStep2,
 * etc.
 */
function collectBlocksByType<T extends FormBlock["blockType"]>(
  blocks: FormBlock[],
  blockType: T
): Extract<FormBlock, { blockType: T }>[] {
  const results: Extract<FormBlock, { blockType: T }>[] = [];
  walkBlocks(blocks, (block) => {
    if (block.blockType === blockType) {
      results.push(block as Extract<FormBlock, { blockType: T }>);
    }
  });
  return results;
}

// ==========================================================
// FORM SCHEMA COMPILER LAYER
// Converts visual block builder state into runtime JSON schema
// ==========================================================

export function compileFields(blocks: FormBlock[]): any[] {
  const allQuestions = collectBlocksByType(blocks, "question");

  return allQuestions.map((q) => {
    const f = q.field;
    return {
      key: f.key,
      label: f.label.trim(),
      type: f.type,
      required: f.required,
      ...(f.type === "number" && f.unit?.trim() ? { unit: f.unit.trim() } : {}),
      ...(f.type === "select"
        ? { options: (f.options || []).filter((o) => o.label.trim() && o.value.trim()) }
        : {}),
      ...(f.metaAttributes && f.metaAttributes.length > 0 ? { metaAttributes: f.metaAttributes } : {}),
    };
  });
}

export function compileLayout(blocks: FormBlock[]): any[] | undefined {
  const hasSections = blocks.some(b => b.blockType !== "question");
  if (!hasSections) return undefined;

  const layout: any[] = [];
  const rootQuestions: string[] = [];

  // Group root questions together, push everything else to layout normally
  blocks.forEach(b => {
    if (b.blockType === "question") {
      rootQuestions.push(b.field.key);
    } else if (b.blockType === "section") {
      layout.push({
        type: "section",
        title: b.title.trim(),
        description: b.description.trim(),
        children: b.children.length > 0 ? [{
          type: "field_group",
          children: b.children.map(c => c.field.key)
        }] : []
      });
    } else if (b.blockType === "repeatable_group") {
      layout.push({
        type: "repeatable_table",
        groupKey: b.groupKey,
        title: b.label,
      });
    }
  });

  // Bundle all standalone root questions into a single wizard step
  if (rootQuestions.length > 0) {
    layout.unshift({
      type: "section",
      title: "General Questions",
      description: "",
      children: [{
        type: "field_group",
        children: rootQuestions
      }]
    });
  }

  return layout;
}

/**
 * Translates a single root-level content block into the layout node
 * it compiles to. This is the mirror image of deserializeLayoutNode:
 * for every content block type, deserializeLayoutNode(compileLayoutNode(b))
 * should reconstruct an equivalent block. Only QuestionBlock exists
 * today, so there's one branch — adding RepeatableGroupBlock later
 * means adding one more branch here, nothing else in this function
 * changes.
 */
function compileLayoutNode(block: QuestionBlock | RepeatableGroupBlock): any {
  if (block.blockType === "repeatable_group") {
    return {
      type: "repeatable_table",
      groupKey: block.groupKey,
      title: block.label,
    };
  }
  return {
    type: "field_group",
    children: [block.field.key],
  };
}

export function compileRepeatableGroups(blocks: FormBlock[]): any[] | undefined {
  const groups = collectBlocksByType(blocks, "repeatable_group");
  if (groups.length === 0) return undefined;

  return groups.map((g) => ({
    key: g.groupKey,
    label: g.label,
    minRows: g.minRows,
    rowFields: g.rowFields,
  }));
}

export function compileSchema(blocks: FormBlock[], icon: string): any {
  const fields = compileFields(blocks);
  const layout = compileLayout(blocks);
  const repeatable_groups = compileRepeatableGroups(blocks);

  return {
    icon,
    fields,
    ...(layout && { layout }),
    ...(repeatable_groups && { repeatable_groups }),
  };
}

/**
 * Translates a single layout node into the content block(s) it
 * represents. Mirrors compileLayoutNode in the opposite direction.
 *
 * Used identically whether the node sits at the root of the layout
 * array or inside a section's `children` — before this helper
 * existed, buildBlocksFromSchema had two separately-written copies
 * of this exact same field_group -> QuestionBlock lookup (one for
 * root nodes, one for section children), and they had already
 * started drifting apart. Centralizing it here is what guarantees
 * they can't diverge again.
 *
 * Returns an array (not a single block) because one field_group node
 * can list more than one field key.
 */
function deserializeLayoutNode(
  node: any,
  fieldMap: Map<string, FormField>,
  groupMap: Map<string, any>
): (QuestionBlock | RepeatableGroupBlock)[] {
  if (node?.type === "repeatable_table") {
    const g = groupMap.get(node.groupKey);
    if (!g) return [];
    return [{
      blockId: `repeatable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockType: "repeatable_group",
      groupKey: g.key,
      label: g.label,
      minRows: g.minRows,
      rowFields: g.rowFields || [],
    }];
  }

  if (node?.type !== "field_group" || !Array.isArray(node.children)) return [];

  const questions: QuestionBlock[] = [];
  node.children.forEach((key: string) => {
    const f = fieldMap.get(key);
    if (f) {
      questions.push({
        blockId: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        blockType: "question",
        field: f,
      });
    }
  });
  return questions;
}

export function buildBlocksFromSchema(schema: any): FormBlock[] {
  const rawFields: FormField[] = schema?.fields || [];
  const fieldMap = new Map<string, FormField>();
  rawFields.forEach((f) => fieldMap.set(f.key, f));

  const rawGroups: any[] = schema?.repeatable_groups || [];
  const groupMap = new Map<string, any>();
  rawGroups.forEach((g) => groupMap.set(g.key, g));

  const layout: any[] = schema?.layout || [];

  // Fallback: If no layout exists, return flat questions (plus any
  // repeatable groups, which have no layout to be found through here).
  if (layout.length === 0) {
    const flatQuestions: FormBlock[] = rawFields.map((f) => ({
      blockId: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockType: "question",
      field: f,
    }));
    const flatGroups: FormBlock[] = rawGroups.map((g) => ({
      blockId: `repeatable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockType: "repeatable_group",
      groupKey: g.key,
      label: g.label,
      minRows: g.minRows,
      rowFields: g.rowFields || [],
    }));
    return [...flatQuestions, ...flatGroups];
  }

  const reconstructedBlocks: FormBlock[] = [];
  const usedKeys = new Set<string>();
  const usedGroupKeys = new Set<string>();

  layout.forEach((node) => {
    if (node.type === "section") {
      const sectionChildren: QuestionBlock[] = [];

      // Every child node of a section goes through the exact same
      // per-node translator root-level nodes use below. A repeatable
      // group nested inside a section's children is intentionally
      // pushed to the root reconstructedBlocks array below, not into
      // sectionChildren — RepeatableGroupBlock is root-level only.
      (node.children || []).forEach((c: any) => {
        const parsed = deserializeLayoutNode(c, fieldMap, groupMap);
        parsed.forEach((block) => {
          if (block.blockType === "question") {
            usedKeys.add(block.field.key);
            sectionChildren.push(block);
          } else {
            usedGroupKeys.add(block.groupKey);
            reconstructedBlocks.push(block);
          }
        });
      });

      reconstructedBlocks.push({
        blockId: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        blockType: "section",
        title: node.title || "",
        description: node.description || "",
        children: sectionChildren,
      });

    } else {
      const parsed = deserializeLayoutNode(node, fieldMap, groupMap);
      parsed.forEach((block) => {
        if (block.blockType === "question") usedKeys.add(block.field.key);
        else usedGroupKeys.add(block.groupKey);
      });
      reconstructedBlocks.push(...parsed);
    }
  });

  // Sweep up any leftover fields not explicitly placed in the layout
  rawFields.forEach((f) => {
    if (!usedKeys.has(f.key)) {
      reconstructedBlocks.push({
        blockId: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        blockType: "question",
        field: f,
      });
    }
  });

  // Sweep up any leftover repeatable groups not explicitly placed in the layout
  rawGroups.forEach((g) => {
    if (!usedGroupKeys.has(g.key)) {
      reconstructedBlocks.push({
        blockId: `repeatable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        blockType: "repeatable_group",
        groupKey: g.key,
        label: g.label,
        minRows: g.minRows,
        rowFields: g.rowFields || [],
      });
    }
  });

  return reconstructedBlocks;
}

const STEPS = [
  { id: 1, label: "Form Details", desc: "Name and describe the form" },
  { id: 2, label: "Questions", desc: "What data should sites log?" },
  { id: 3, label: "Site Visibility", desc: "Who can see this form" },
] as const;

const EDIT_SECTIONS = [
  { id: "details", label: "Details", icon: Settings2 },
  { id: "questions", label: "Questions", icon: ListChecks },
  { id: "visibility", label: "Visibility", icon: Users },
] as const;

// ==========================================================
// FORM BUILDER UI COMPONENTS
// ==========================================================

interface QuestionRowProps {
  block: QuestionBlock;
  blockIndex: number;
  childIndex: number | null;
  onUpdateField: (blockIndex: number, childIndex: number | null, patch: Partial<FormField>) => void;
  onRemoveBlock: (blockIndex: number, childIndex: number | null) => void;
  onAddOption: (blockIndex: number, childIndex: number | null) => void;
  onUpdateOption: (blockIndex: number, childIndex: number | null, optIndex: number, patch: Partial<FieldOption>) => void;
  onRemoveOption: (blockIndex: number, childIndex: number | null, optIndex: number) => void;
}

function QuestionRow({
  block,
  blockIndex,
  childIndex,
  onUpdateField,
  onRemoveBlock,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: QuestionRowProps) {
  const field = block.field;

  return (
    <div className={`border-b border-neutral-200 py-5 first:pt-0 last:border-b-0 ${childIndex !== null ? 'pl-2' : ''}`}>
      <div className="flex items-start gap-3">
        <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-neutral-300" />
        <div className="flex-1 space-y-3">
          <span className="text-xs font-medium text-neutral-500">Question {childIndex !== null ? childIndex + 1 : blockIndex + 1}</span>
          <Input
            value={field.label}
            onChange={(e) => onUpdateField(blockIndex, childIndex, { label: e.target.value })}
            placeholder="e.g. Total Water Withdrawn"
            className="text-sm font-medium"
          />

          <div className={`grid gap-3 sm:max-w-md ${field.type === "number" ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Answer Type</Label>
              <Select value={field.type} onValueChange={(v) => onUpdateField(blockIndex, childIndex, { type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {field.type === "number" && (
              <div className="space-y-1">
                <Label className="text-xs text-neutral-500">Unit</Label>
                <Select 
                  value={COMMON_UNITS.includes(field.unit || "") ? field.unit : (field.unit ? "custom" : "none")} 
                  onValueChange={(v) => {
                    if (v === "custom") onUpdateField(blockIndex, childIndex, { unit: " " });
                    else if (v === "none") onUpdateField(blockIndex, childIndex, { unit: "" });
                    else onUpdateField(blockIndex, childIndex, { unit: v });
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Unit</SelectItem>
                    {COMMON_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    <SelectItem value="custom">Add Manually...</SelectItem>
                  </SelectContent>
                </Select>
                {(!COMMON_UNITS.includes(field.unit || "") && field.unit !== undefined && field.unit !== "") && (
                  <Input
                    placeholder="Type custom unit..."
                    value={field.unit.trim()}
                    onChange={(e) => onUpdateField(blockIndex, childIndex, { unit: e.target.value || " " })}
                    className="mt-2 h-10 bg-white"
                    autoFocus
                  />
                )}
              </div>
            )}
          </div>

          {field.type === "select" && (
            <div className="max-w-md space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <Label className="text-xs text-neutral-500">Dropdown Options</Label>
              {(field.options || []).map((opt, optIndex) => (
                <div key={optIndex} className="flex gap-2">
                  <Input
                    className="h-8 text-xs"
                    placeholder="Option label"
                    value={opt.label}
                    onChange={(e) =>
                      onUpdateOption(blockIndex, childIndex, optIndex, { label: e.target.value, value: slugifyKey(e.target.value) })
                    }
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => onRemoveOption(blockIndex, childIndex, optIndex)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAddOption(blockIndex, childIndex)}>
                <Plus className="mr-1 h-3 w-3" />
                Add Option
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id={`required-${field.key}`}
              checked={field.required}
              onCheckedChange={(v) => onUpdateField(blockIndex, childIndex, { required: !!v })}
            />
            <Label htmlFor={`required-${field.key}`} className="cursor-pointer text-xs">Required</Label>
          </div>

          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <button
              type="button"
              className="text-xs font-bold text-teal-600 underline-offset-2 transition-colors hover:text-teal-800 hover:underline flex items-center gap-1"
              onClick={() => {
                const newMeta = { key: `meta_${Date.now()}`, label: "", type: "text" as const, options: "" };
                onUpdateField(blockIndex, childIndex, { metaAttributes: [...(field.metaAttributes || []), newMeta] });
              }}
            >
              <Plus className="h-3 w-3" /> Add Name (e.g., Classification, Disposal Method)
            </button>

            {field.metaAttributes?.map((meta, mIdx) => (
              <div key={meta.key} className="ml-1 flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 sm:flex-row sm:items-start shadow-sm">
                
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Name</Label>
                  <Input
                    placeholder="e.g. Classification"
                    value={meta.label}
                    onChange={(e) => {
                      const newMetas = [...field.metaAttributes!];
                      newMetas[mIdx].label = e.target.value;
                      onUpdateField(blockIndex, childIndex, { metaAttributes: newMetas });
                    }}
                    className="h-9 bg-white text-xs"
                  />
                </div>
                
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Answer Type</Label>
                  <Select
                    value={meta.type}
                    onValueChange={(v) => {
                      const newMetas = [...field.metaAttributes!];
                      newMetas[mIdx].type = v as any;
                      onUpdateField(blockIndex, childIndex, { metaAttributes: newMetas });
                    }}
                  >
                    <SelectTrigger className="h-9 bg-white text-xs border-neutral-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Field</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="select">Dropdown Choice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {meta.type === "select" && (
                  <div className="flex-[1.5] space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Dropdown Choices</Label>
                    <Input
                      placeholder="e.g. High, Medium, Low"
                      value={meta.options || ""}
                      onChange={(e) => {
                        const newMetas = [...field.metaAttributes!];
                        newMetas[mIdx].options = e.target.value;
                        onUpdateField(blockIndex, childIndex, { metaAttributes: newMetas });
                      }}
                      className="h-9 bg-white text-xs border-teal-200"
                    />
                  </div>
                )}
                
                <div className="pt-5 sm:pt-6">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      const newMetas = field.metaAttributes!.filter((_, i) => i !== mIdx);
                      onUpdateField(blockIndex, childIndex, { metaAttributes: newMetas });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => onRemoveBlock(blockIndex, childIndex)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

interface SectionBlockProps {
  section: SectionBlock;
  index: number;
  onUpdateSection: (index: number, patch: Partial<SectionBlock>) => void;
  onRemoveBlock: (blockIndex: number, childIndex: number | null) => void;
  onAddQuestion: (sectionIndex: number | null) => void;
  onUpdateField: (blockIndex: number, childIndex: number | null, patch: Partial<FormField>) => void;
  onAddOption: (blockIndex: number, childIndex: number | null) => void;
  onUpdateOption: (blockIndex: number, childIndex: number | null, optIndex: number, patch: Partial<FieldOption>) => void;
  onRemoveOption: (blockIndex: number, childIndex: number | null, optIndex: number) => void;
}

function SectionBlock({
  section,
  index,
  onUpdateSection,
  onRemoveBlock,
  onAddQuestion,
  onUpdateField,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: SectionBlockProps) {
  return (
    <div className="border-b border-neutral-200 py-6 first:pt-0 last:border-b-0">
      <div className="flex items-start gap-3">
        <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-neutral-300" />
        <div className="flex-1 rounded-xl border border-teal-200 bg-teal-50/30 overflow-hidden shadow-sm">
          <div className="bg-teal-50 border-b border-teal-100 p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">Section {index + 1}</span>
              <Button size="sm" variant="ghost" className="h-7 text-destructive hover:bg-red-50 hover:text-red-700" onClick={() => onRemoveBlock(index, null)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Section
              </Button>
            </div>
            <div className="space-y-3">
              <Input
                value={section.title}
                onChange={(e) => onUpdateSection(index, { title: e.target.value })}
                placeholder="Section Title (e.g., A. Fuel Consumption)"
                className="font-bold border-teal-200 bg-white"
              />
              <Textarea
                value={section.description}
                onChange={(e) => onUpdateSection(index, { description: e.target.value })}
                placeholder="Optional section description or instructions"
                className="text-sm border-teal-200 bg-white min-h-[60px]"
              />
            </div>
          </div>
          <div className="p-4">
            {section.children.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">No questions in this section yet.</p>
            )}
            <div className="space-y-2 divide-y divide-neutral-100">
              {section.children.map((child, cIdx) => (
                <QuestionRow
                  key={child.blockId}
                  block={child}
                  blockIndex={index}
                  childIndex={cIdx}
                  onUpdateField={onUpdateField}
                  onRemoveBlock={onRemoveBlock}
                  onAddOption={onAddOption}
                  onUpdateOption={onUpdateOption}
                  onRemoveOption={onRemoveOption}
                />
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-4 bg-white" onClick={() => onAddQuestion(index)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Question to Section
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RepeatableGroupEditorProps {
  group: RepeatableGroupBlock;
  index: number;
  onUpdateGroup: (index: number, patch: Partial<RepeatableGroupBlock>) => void;
  onRemoveBlock: (blockIndex: number, childIndex: number | null) => void;
  onAddRowField: (groupIndex: number) => void;
  onUpdateRowField: (groupIndex: number, rowFieldIndex: number, patch: Partial<RepeatableRowField>) => void;
  onRemoveRowField: (groupIndex: number, rowFieldIndex: number) => void;
  onAddRowFieldOption: (groupIndex: number, rowFieldIndex: number) => void;
  onUpdateRowFieldOption: (groupIndex: number, rowFieldIndex: number, optIndex: number, patch: Partial<FieldOption>) => void;
  onRemoveRowFieldOption: (groupIndex: number, rowFieldIndex: number, optIndex: number) => void;
}

function RepeatableGroupEditor({
  group,
  index,
  onUpdateGroup,
  onRemoveBlock,
  onAddRowField,
  onUpdateRowField,
  onRemoveRowField,
  onAddRowFieldOption,
  onUpdateRowFieldOption,
  onRemoveRowFieldOption,
}: RepeatableGroupEditorProps) {
  return (
    <div className="border-b border-neutral-200 py-6 first:pt-0 last:border-b-0">
      <div className="flex items-start gap-3">
        <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-neutral-300" />
        <div className="flex-1 rounded-xl border border-blue-200 bg-blue-50/30 overflow-hidden shadow-sm">
          <div className="bg-blue-50 border-b border-blue-100 p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-sm font-extrabold uppercase tracking-wider text-blue-800">Dynamic Table (User adds rows)</span>
                <p className="text-xs text-blue-600/80 mt-1 max-w-lg leading-relaxed">
                  Creates a spreadsheet-like table where site operators can click "+ Add Row" to log multiple entries. Define your columns below.
                </p>
              </div>
              <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-red-50 hover:text-red-700 shrink-0" onClick={() => onRemoveBlock(index, null)}>
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete Table
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Table Title *</Label>
                <Input
                  value={group.label}
                  onChange={(e) => onUpdateGroup(index, { label: e.target.value })}
                  placeholder="e.g., Location-wise Sound Sampling Logs"
                  className="font-bold border-blue-200 bg-white shadow-sm"
                />
              </div>
              <div className="w-full sm:w-32 space-y-1.5">
                <Label className="text-xs font-bold text-slate-700" title="How many empty rows to show by default">Starting Rows</Label>
                <Input
                  type="number"
                  min={0}
                  value={group.minRows}
                  onChange={(e) => onUpdateGroup(index, { minRows: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="border-blue-200 bg-white text-sm shadow-sm"
                />
              </div>
            </div>
          </div>
          <div className="p-4">
            {group.rowFields.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">No row fields in this group yet.</p>
            )}
            <div className="space-y-2 divide-y divide-neutral-100">
              {group.rowFields.map((rowField, rIdx) => (
                <div key={rowField.key} className="py-5 first:pt-0 last:pb-0 pl-2">
                  <div className="flex items-start gap-3">
                    <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-neutral-300" />
                    <div className="flex-1 space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Column {rIdx + 1}</span>
                      <Input
                        value={rowField.label}
                        onChange={(e) => onUpdateRowField(index, rIdx, { label: e.target.value })}
                        placeholder="e.g. Refrigerant Name"
                        className="text-sm font-medium"
                      />

                      <div className={`grid gap-3 sm:max-w-md ${rowField.type === "number" ? "grid-cols-2" : "grid-cols-1"}`}>
                        <div className="space-y-1">
                          <Label className="text-xs text-neutral-500">Answer Type</Label>
                          <Select value={rowField.type} onValueChange={(v) => onUpdateRowField(index, rIdx, { type: v as FormField["type"] })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {rowField.type === "number" && (
                          <div className="space-y-1">
                            <Label className="text-xs text-neutral-500">Unit</Label>
                            <Select 
                              value={COMMON_UNITS.includes(rowField.unit || "") ? rowField.unit : (rowField.unit ? "custom" : "none")} 
                              onValueChange={(v) => {
                                if (v === "custom") onUpdateRowField(index, rIdx, { unit: " " });
                                else if (v === "none") onUpdateRowField(index, rIdx, { unit: "" });
                                else onUpdateRowField(index, rIdx, { unit: v });
                              }}
                            >
                              <SelectTrigger className="h-10 bg-white">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Unit</SelectItem>
                                {COMMON_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                <SelectItem value="custom">Add Manually...</SelectItem>
                              </SelectContent>
                            </Select>
                            {(!COMMON_UNITS.includes(rowField.unit || "") && rowField.unit !== undefined && rowField.unit !== "") && (
                              <Input
                                placeholder="Type custom unit..."
                                value={rowField.unit.trim()}
                                onChange={(e) => onUpdateRowField(index, rIdx, { unit: e.target.value || " " })}
                                className="mt-2 h-10 bg-white"
                                autoFocus
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {rowField.type === "select" && (
                        <div className="max-w-md space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                          <Label className="text-xs text-neutral-500">Dropdown Options</Label>
                          {(rowField.options || []).map((opt, optIndex) => (
                            <div key={optIndex} className="flex gap-2">
                              <Input
                                className="h-8 text-xs"
                                placeholder="Option label"
                                value={opt.label}
                                onChange={(e) =>
                                  onUpdateRowFieldOption(index, rIdx, optIndex, { label: e.target.value, value: slugifyKey(e.target.value) })
                                }
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => onRemoveRowFieldOption(index, rIdx, optIndex)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAddRowFieldOption(index, rIdx)}>
                            <Plus className="mr-1 h-3 w-3" />
                            Add Option
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`required-${rowField.key}`}
                          checked={rowField.required}
                          onCheckedChange={(v) => onUpdateRowField(index, rIdx, { required: !!v })}
                        />
                        <Label htmlFor={`required-${rowField.key}`} className="cursor-pointer text-xs">Required</Label>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => onRemoveRowField(index, rIdx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-4 bg-white border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => onAddRowField(index)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Table Column
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// FORM BUILDER UI COMPONENTS (continued)
// ==========================================================

interface BlockListProps {
  blocks: FormBlock[];
  onUpdateField: (blockIndex: number, childIndex: number | null, patch: Partial<FormField>) => void;
  onRemoveBlock: (blockIndex: number, childIndex: number | null) => void;
  onAddOption: (blockIndex: number, childIndex: number | null) => void;
  onUpdateOption: (blockIndex: number, childIndex: number | null, optIndex: number, patch: Partial<FieldOption>) => void;
  onRemoveOption: (blockIndex: number, childIndex: number | null, optIndex: number) => void;
  onUpdateSection: (index: number, patch: Partial<SectionBlock>) => void;
  onAddQuestion: (sectionIndex: number | null) => void;
  onUpdateGroup: (index: number, patch: Partial<RepeatableGroupBlock>) => void;
  onAddRowField: (groupIndex: number) => void;
  onUpdateRowField: (groupIndex: number, rowFieldIndex: number, patch: Partial<RepeatableRowField>) => void;
  onRemoveRowField: (groupIndex: number, rowFieldIndex: number) => void;
  onAddRowFieldOption: (groupIndex: number, rowFieldIndex: number) => void;
  onUpdateRowFieldOption: (groupIndex: number, rowFieldIndex: number, optIndex: number, patch: Partial<FieldOption>) => void;
  onRemoveRowFieldOption: (groupIndex: number, rowFieldIndex: number, optIndex: number) => void;
}

function BlockList(props: BlockListProps) {
  return (
    <>
      {props.blocks.map((block, index) =>
        block.blockType === "question"
          ? <QuestionRow
              key={block.blockId}
              block={block}
              blockIndex={index}
              childIndex={null}
              onUpdateField={props.onUpdateField}
              onRemoveBlock={props.onRemoveBlock}
              onAddOption={props.onAddOption}
              onUpdateOption={props.onUpdateOption}
              onRemoveOption={props.onRemoveOption}
            />
          : block.blockType === "section"
          ? <SectionBlock
              key={block.blockId}
              section={block}
              index={index}
              onUpdateSection={props.onUpdateSection}
              onRemoveBlock={props.onRemoveBlock}
              onAddQuestion={props.onAddQuestion}
              onUpdateField={props.onUpdateField}
              onAddOption={props.onAddOption}
              onUpdateOption={props.onUpdateOption}
              onRemoveOption={props.onRemoveOption}
            />
          : <RepeatableGroupEditor
              key={block.blockId}
              group={block}
              index={index}
              onUpdateGroup={props.onUpdateGroup}
              onRemoveBlock={props.onRemoveBlock}
              onAddRowField={props.onAddRowField}
              onUpdateRowField={props.onUpdateRowField}
              onRemoveRowField={props.onRemoveRowField}
              onAddRowFieldOption={props.onAddRowFieldOption}
              onUpdateRowFieldOption={props.onUpdateRowFieldOption}
              onRemoveRowFieldOption={props.onRemoveRowFieldOption}
            />
      )}
    </>
  );
}
// ==========================================================
// MAIN COMPONENT
// ==========================================================

function NewForm() {

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const search = Route.useSearch();
  const editId = search.edit;
  const isEditMode = !!editId;

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [frequency, setFrequency] = useState("monthly");
  const [isActive, setIsActive] = useState(true);
  const [blocks, setBlocks] = useState<FormBlock[]>([]);
  const [visibilityMode, setVisibilityMode] = useState<"all" | "specific">("all");
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());
  const [visibleToSiteUsers, setVisibleToSiteUsers] = useState(true);
  const [visibleToContractors, setVisibleToContractors] = useState(true);

  const {
    data: existingForm,
    isLoading: isFormLoading,
    isError: isFormError,
  } = useQuery({
    queryKey: ["form-to-edit", editId],
    queryFn: async () => {
      if (!editId) return null;
      const res = await formsService.getFormById(editId);
      if (res.error) throw res.error;
      if (!res.data) throw new Error("Form not found");
      return res.data;
    },
    enabled: !!editId,
    retry: false,
  });

  useEffect(() => {
    if (existingForm) {
      setTitle(existingForm.title || "");
      setDescription(existingForm.description || "");
      setFrequency(existingForm.frequency || "monthly");
      setIsActive(existingForm.is_active ?? true);
      setVisibleToSiteUsers(existingForm.visible_to_site_users ?? true);
      setVisibleToContractors(existingForm.visible_to_contractors ?? true);
      
      if (existingForm.schema) {
        setIcon(existingForm.schema.icon || ICON_OPTIONS[0]);
        const loadedBlocks = buildBlocksFromSchema(existingForm.schema);
        setBlocks(loadedBlocks);
      }
      
      if (existingForm.site_ids && existingForm.site_ids.length > 0) {
        setVisibilityMode("specific");
        setSelectedSiteIds(new Set(existingForm.site_ids));
      } else {
        setVisibilityMode("all");
      }
    }
  }, [existingForm]);

  const { data: sitesResult, isLoading: sitesLoading } = useQuery({
    queryKey: ["all-sites"],
    queryFn: async () => {
      const { data, error } = await sitesService.getAllSitesAdmin();
      if (error) throw new Error(error);
      return data as SiteRow[];
    },
    enabled: isEditMode || step === 3,
  });
  const sites = sitesResult || [];

  const validateStep1 = (): string | null => (!title.trim() ? "Form name is required." : null);

  const validateStep2 = (): string | null => {
    if (blocks.length === 0) return "Add at least one question, section, or repeatable group.";

    // Section-level check stays here: it's about the section container
    // itself, not about any content block inside it, so it doesn't
    // belong in collectBlocksByType.
    for (const b of blocks) {
      if (b.blockType === "section" && !b.title.trim()) return "Every section needs a title.";
    }

    const allQuestions = collectBlocksByType(blocks, "question");

    if (allQuestions.length === 0) return "Add at least one question.";

    for (const q of allQuestions) {
      const f = q.field;
      if (!f.label.trim()) return "Every question needs text.";
      if (f.type === "select" && (!f.options || f.options.filter((o) => o.label.trim()).length === 0)) {
        return `Dropdown question "${f.label}" needs at least one option.`;
      }
    }
    const keys = allQuestions.map((q) => q.field.key);
    if (new Set(keys).size !== keys.length) return "Question keys must be unique.";

    // Repeatable groups validate independently of questions/sections above.
    const repeatableGroups = collectBlocksByType(blocks, "repeatable_group");
    for (const g of repeatableGroups) {
      if (!g.label.trim()) return "Every repeatable group needs a label.";
      if (!g.groupKey.trim()) return "Every repeatable group needs a key.";
      if (g.rowFields.length === 0) return `Repeatable group "${g.label}" needs at least one row field.`;

      const rowKeys = g.rowFields.map((rf) => rf.key);
      if (new Set(rowKeys).size !== rowKeys.length) {
        return `Row fields in "${g.label}" must have unique keys.`;
      }

      for (const rf of g.rowFields) {
        if (!rf.label.trim()) return `Every row field in "${g.label}" needs text.`;
        if (rf.type === "select" && (!rf.options || rf.options.filter((o) => o.label.trim()).length === 0)) {
          return `Row field "${rf.label}" in "${g.label}" needs at least one option.`;
        }
      }
    }

    const groupKeys = repeatableGroups.map((g) => g.groupKey);
    if (new Set(groupKeys).size !== groupKeys.length) return "Repeatable group keys must be unique.";
    if (groupKeys.some((gk) => keys.includes(gk))) {
      return "A repeatable group key can't match a question key.";
    }

    return null;
  };

  const validateStep3 = (): string | null => {
    if (!visibleToSiteUsers && !visibleToContractors) {
      return "Select at least one audience: Site Users, Contractors, or both.";
    }
    if (visibilityMode === "specific" && selectedSiteIds.size === 0) {
      return 'Select at least one site, or switch to "All Sites".';
    }
    return null;
  };

  const validateAll = (): string | null => validateStep1() || validateStep2() || validateStep3();

  // --- HIERARCHICAL STATE HANDLERS ---
  const addQuestion = (sectionIndex: number | null = null) => {
    const newQuestion: QuestionBlock = {
      blockId: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockType: "question",
      field: { key: newFieldKey(), label: "", type: "number", unit: "", required: true },
    };

    if (sectionIndex === null) {
      setBlocks((prev) => [...prev, newQuestion]);
    } else {
      setBlocks((prev) => prev.map((b, i) => 
        i === sectionIndex && b.blockType === "section" 
          ? { ...b, children: [...b.children, newQuestion] } 
          : b
      ));
    }
  };

  const addSection = () => {
    setBlocks((prev) => [
      ...prev,
      {
        blockId: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        blockType: "section",
        title: "",
        description: "",
        children: [],
      }
    ]);
  };

  const updateQuestion = (blockIndex: number, childIndex: number | null, updater: (q: QuestionBlock) => QuestionBlock) => {
    setBlocks((prev) => prev.map((b, i) => {
      if (i !== blockIndex) return b;
      if (childIndex === null && b.blockType === "question") return updater(b);
      if (childIndex !== null && b.blockType === "section") {
        const newChildren = [...b.children];
        newChildren[childIndex] = updater(newChildren[childIndex]);
        return { ...b, children: newChildren };
      }
      return b;
    }));
  };

  const updateField = (blockIndex: number, childIndex: number | null, patch: Partial<FormField>) => {
    updateQuestion(blockIndex, childIndex, (q) => ({ ...q, field: { ...q.field, ...patch } }));
  };

  const removeBlock = (blockIndex: number, childIndex: number | null = null) => {
    if (childIndex === null) {
      setBlocks((prev) => prev.filter((_, i) => i !== blockIndex));
    } else {
      setBlocks((prev) => prev.map((b, i) => {
        if (i === blockIndex && b.blockType === "section") {
          return { ...b, children: b.children.filter((_, j) => j !== childIndex) };
        }
        return b;
      }));
    }
  };

  const updateSection = (index: number, patch: Partial<SectionBlock>) => {
    setBlocks((prev) => prev.map((b, i) => i === index && b.blockType === "section" ? { ...b, ...patch } : b));
  };

  // --- REPEATABLE GROUP STATE HANDLERS ---
  // Root-level only, mirroring updateQuestion's updater-function pattern
  // so each handler stays a one-liner instead of repeating the
  // "guard blockType, then spread" boilerplate.
  const updateRepeatableGroupBlock = (groupIndex: number, updater: (g: RepeatableGroupBlock) => RepeatableGroupBlock) => {
    setBlocks((prev) => prev.map((b, i) => (i === groupIndex && b.blockType === "repeatable_group" ? updater(b) : b)));
  };

  const addRepeatableGroup = () => {
    setBlocks((prev) => [
      ...prev,
      {
        blockId: `repeatable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        blockType: "repeatable_group",
        groupKey: newFieldKey(),
        label: "",
        minRows: 0,
        rowFields: [],
      },
    ]);
  };

  const updateRepeatableGroup = (index: number, patch: Partial<RepeatableGroupBlock>) => {
    updateRepeatableGroupBlock(index, (g) => ({ ...g, ...patch }));
  };

  const addRowField = (groupIndex: number) => {
    updateRepeatableGroupBlock(groupIndex, (g) => ({
      ...g,
      rowFields: [...g.rowFields, { key: newFieldKey(), label: "", type: "text", required: true }],
    }));
  };

  const updateRowField = (groupIndex: number, rowFieldIndex: number, patch: Partial<RepeatableRowField>) => {
    updateRepeatableGroupBlock(groupIndex, (g) => {
      const newRowFields = [...g.rowFields];
      newRowFields[rowFieldIndex] = { ...newRowFields[rowFieldIndex], ...patch };
      return { ...g, rowFields: newRowFields };
    });
  };

  const removeRowField = (groupIndex: number, rowFieldIndex: number) => {
    updateRepeatableGroupBlock(groupIndex, (g) => ({
      ...g,
      rowFields: g.rowFields.filter((_, j) => j !== rowFieldIndex),
    }));
  };

  const addRowFieldOption = (groupIndex: number, rowFieldIndex: number) => {
    updateRepeatableGroupBlock(groupIndex, (g) => {
      const newRowFields = [...g.rowFields];
      newRowFields[rowFieldIndex] = {
        ...newRowFields[rowFieldIndex],
        options: [...(newRowFields[rowFieldIndex].options || []), { label: "", value: "" }],
      };
      return { ...g, rowFields: newRowFields };
    });
  };

  const updateRowFieldOption = (groupIndex: number, rowFieldIndex: number, optIndex: number, patch: Partial<FieldOption>) => {
    updateRepeatableGroupBlock(groupIndex, (g) => {
      const newRowFields = [...g.rowFields];
      const newOptions = [...(newRowFields[rowFieldIndex].options || [])];
      newOptions[optIndex] = { ...newOptions[optIndex], ...patch };
      newRowFields[rowFieldIndex] = { ...newRowFields[rowFieldIndex], options: newOptions };
      return { ...g, rowFields: newRowFields };
    });
  };

  const removeRowFieldOption = (groupIndex: number, rowFieldIndex: number, optIndex: number) => {
    updateRepeatableGroupBlock(groupIndex, (g) => {
      const newRowFields = [...g.rowFields];
      newRowFields[rowFieldIndex] = {
        ...newRowFields[rowFieldIndex],
        options: (newRowFields[rowFieldIndex].options || []).filter((_, j) => j !== optIndex),
      };
      return { ...g, rowFields: newRowFields };
    });
  };

  const addOption = (blockIndex: number, childIndex: number | null) => {
    updateQuestion(blockIndex, childIndex, (q) => ({
      ...q, field: { ...q.field, options: [...(q.field.options || []), { label: "", value: "" }] }
    }));
  };

  const updateOption = (blockIndex: number, childIndex: number | null, optIndex: number, patch: Partial<FieldOption>) => {
    updateQuestion(blockIndex, childIndex, (q) => {
      const options = (q.field.options || []).map((o, j) => (j === optIndex ? { ...o, ...patch } : o));
      return { ...q, field: { ...q.field, options } };
    });
  };

  const removeOption = (blockIndex: number, childIndex: number | null, optIndex: number) => {
    updateQuestion(blockIndex, childIndex, (q) => {
      return { ...q, field: { ...q.field, options: (q.field.options || []).filter((_, j) => j !== optIndex) } };
    });
  };

  const goNext = () => {
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
    if (err) { toast.error(err); return; }
    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  };
  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

  const submitMutation = useMutation({
    mutationFn: async () => {
      const compiledSchema = compileSchema(blocks, icon);

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        schema: compiledSchema,
        is_active: isActive,
        frequency,
        site_ids: visibilityMode === "all" ? null : Array.from(selectedSiteIds),
        visible_to_site_users: visibleToSiteUsers,
        visible_to_contractors: visibleToContractors,
      };
      
      return editId ? formsService.updateForm(editId, payload) : formsService.createForm(payload);
    },
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error.message || "Failed to save the form");
        return;
      }
      toast.success(editId ? "Changes saved" : "Form created");
      queryClient.invalidateQueries({ queryKey: ["admin-all-forms"] });
      queryClient.invalidateQueries({ queryKey: ["form-to-edit", editId] });
      navigate({ to: "/authenticated/app" });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save the form"),
  });

  const handleWizardSubmit = () => {
    const err = validateStep3();
    if (err) { toast.error(err); return; }
    submitMutation.mutate();
  };
  const handleEditSave = () => {
    const err = validateAll();
    if (err) { toast.error(err); return; }
    submitMutation.mutate();
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isEditMode && isFormLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading form…</span>
        </div>
      </AppShell>
    );
  }

  if (isEditMode && isFormError) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
          <AlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-sm font-medium">Couldn't load this form</p>
          <p className="text-xs text-muted-foreground">
            It may have been deleted, or you may not have permission to view it.
          </p>
          <Button variant="outline" onClick={() => navigate({ to: "/authenticated/app" })}>
            Back to dashboard
          </Button>
        </div>
      </AppShell>
    );
  }

  // ==========================================================
  // EDIT MODE
  // ==========================================================
  if (isEditMode) {
    return (
      <AppShell>
        <div className="sticky top-0 z-20 -mx-4 mb-8 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
          <button
            onClick={() => navigate({ to: "/authenticated/app" })}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/authenticated/app" })}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 pb-20 lg:grid-cols-[220px_1fr]">
          {/* Left rail */}
          <nav className="hidden lg:block">
            <div className="sticky top-20 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Editing</p>
                <h1 className="mt-1 text-lg font-bold leading-tight text-neutral-900">{title || "Untitled form"}</h1>
                <span className={`mt-2 inline-block rounded-sm border px-1.5 py-0.5 text-xs font-medium ${
                  isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-neutral-200 bg-neutral-50 text-neutral-500"
                }`}>
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <ul className="space-y-0.5">
                {EDIT_SECTIONS.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollToSection(s.id)}
                      className="flex w-full items-center gap-2 border-l-2 border-transparent px-3 py-1.5 text-left text-sm text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                    >
                      <s.icon className="h-3.5 w-3.5" />
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Content */}
          <div className="min-w-0 max-w-3xl space-y-12">
            <div className="lg:hidden">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Editing</p>
              <h1 className="mt-1 text-xl font-bold text-neutral-900">{title || "Untitled form"}</h1>
            </div>

            <section id="details">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">01 — Details</p>
              <h2 className="mt-1 text-lg font-bold text-neutral-900">Form details</h2>
              <div className="mt-4 space-y-5 border-t border-neutral-200 pt-5">
                <div className="space-y-1.5">
                  <Label>Form Name *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Noise Level Monitoring" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this form for? Shown to site users." />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Icon / Custom Image</Label>
                    <Select 
                      value={ICON_OPTIONS.includes(icon) ? icon : (icon ? "custom_image" : ICON_OPTIONS[0])} 
                      onValueChange={(v) => {
                        if (v === "custom_image") setIcon("");
                        else setIcon(v);
                      }}
                    >
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select icon..." /></SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                        <SelectItem value="custom_image" className="font-bold text-teal-700">Custom Image URL...</SelectItem>
                      </SelectContent>
                    </Select>
                    {(!ICON_OPTIONS.includes(icon) && icon !== undefined) && (
                      <Input
                        placeholder="Paste image URL here (https://...)"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        className="mt-2 text-xs bg-white border-teal-200"
                        autoFocus
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>How Often?</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="one_time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-1.5">
                    <Checkbox id="is-active-edit" checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
                    <Label htmlFor="is-active-edit" className="cursor-pointer text-sm">Active</Label>
                  </div>
                </div>
              </div>
            </section>

            <section id="questions">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Step 2 — Questions & Layout</p>
                  <h2 className="mt-1 text-lg font-bold text-neutral-900">
                    {blocks.length} block{blocks.length === 1 ? "" : "s"}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => addQuestion(null)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Question
                  </Button>
                  <Button size="sm" className="bg-teal-700 text-white hover:bg-teal-800" onClick={addSection}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Section
                  </Button>
                  <Button size="sm" variant="outline" onClick={addRepeatableGroup}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Repeatable Group
                  </Button>
                </div>
              </div>
              <div className="mt-4 border-t border-neutral-200">
                {blocks.length === 0 && (
                  <p className="py-8 text-center text-sm text-neutral-500">No content yet. Click "Add Question" or "Add Section" to start.</p>
                )}
                <BlockList
                  blocks={blocks}
                  onUpdateField={updateField}
                  onRemoveBlock={removeBlock}
                  onAddOption={addOption}
                  onUpdateOption={updateOption}
                  onRemoveOption={removeOption}
                  onUpdateSection={updateSection}
                  onAddQuestion={addQuestion}
                  onUpdateGroup={updateRepeatableGroup}
                  onAddRowField={addRowField}
                  onUpdateRowField={updateRowField}
                  onRemoveRowField={removeRowField}
                  onAddRowFieldOption={addRowFieldOption}
                  onUpdateRowFieldOption={updateRowFieldOption}
                  onRemoveRowFieldOption={removeRowFieldOption}
                />
              </div>
              <datalist id="unit-suggestions">
                {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
              </datalist>
            </section>

            <section id="visibility">
  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">03 — Visibility</p>
  <h2 className="mt-1 text-lg font-bold text-neutral-900">Who can see this form?</h2>
  <div className="mt-4 space-y-4 border-t border-neutral-200 pt-5">
    <div className="space-y-2">
      <Label className="text-sm font-medium text-neutral-900">Who can fill this out?</Label>
      <div className="flex gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={visibleToSiteUsers}
            onCheckedChange={(v) => setVisibleToSiteUsers(!!v)}
          />
          Site Users
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={visibleToContractors}
            onCheckedChange={(v) => setVisibleToContractors(!!v)}
          />
          Contractors
        </label>
      </div>
    </div>

    <div className="flex gap-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="radio" name="visibility-mode-edit" checked={visibilityMode === "all"} onChange={() => setVisibilityMode("all")} />
        All Sites
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="radio" name="visibility-mode-edit" checked={visibilityMode === "specific"} onChange={() => setVisibilityMode("specific")} />
        Specific Sites
      </label>
    </div>

    {visibilityMode === "specific" && (
      <div>
        <div className="mb-2 flex justify-end gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedSiteIds(new Set(sites.map((s) => s.id)))}>Select All</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedSiteIds(new Set())}>Clear</Button>
        </div>
        {sitesLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sites.map((site) => (
              <label key={site.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 p-2 text-sm transition-colors hover:bg-neutral-50">
                <Checkbox
                  checked={selectedSiteIds.has(site.id)}
                  onCheckedChange={() => {
                    setSelectedSiteIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(site.id)) next.delete(site.id); else next.add(site.id);
                      return next;
                    });
                  }}
                />
                <span>{site.name} <span className="text-xs text-neutral-500">({site.code})</span></span>
              </label>
            ))}
          </div>
        )}
      </div>
    )}

    <p className="text-xs text-neutral-500">
      {visibilityMode === "all" ? "This form appears on every site's dashboard." : "This form only appears on the dashboards of the sites you select."}
    </p>
  </div>
</section>

            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-6">
              <Button variant="outline" onClick={() => navigate({ to: "/authenticated/app" })}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ==========================================================
  // CREATE MODE
  // ==========================================================
  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/authenticated/app" })}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </button>

      <div className="grid grid-cols-1 gap-10 pb-16 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block">
          <div className="sticky top-6 space-y-1">
            {STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => (s.id < step || step === 3 ? setStep(s.id) : undefined)}
                disabled={s.id > step}
                className={`flex w-full items-start gap-3 border-l-2 px-3 py-2.5 text-left transition-colors ${
                  step === s.id ? "border-teal-700" : "border-transparent"
                } ${s.id > step ? "cursor-default opacity-40" : "hover:border-neutral-300"}`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    step === s.id
                      ? "border-teal-700 bg-teal-700 text-white"
                      : step > s.id
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-neutral-300 text-neutral-400"
                  }`}
                >
                  {step > s.id ? <Check className="h-3 w-3" /> : s.id}
                </span>
                <span>
                  <span className={`block text-sm ${step === s.id ? "font-semibold text-neutral-900" : "text-neutral-500"}`}>{s.label}</span>
                  <span className="block text-xs text-neutral-400">{s.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 max-w-2xl">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex flex-1 items-center gap-2">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  step === s.id ? "border-teal-700 bg-teal-700 text-white" : step > s.id ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-neutral-300 text-neutral-400"
                }`}>
                  {step > s.id ? <Check className="h-3 w-3" /> : s.id}
                </div>
                {i < STEPS.length - 1 && <div className="h-px flex-1 bg-neutral-200" />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Step 1</p>
              <h2 className="mt-1 text-xl font-bold text-neutral-900">Name the Form</h2>
              <p className="mt-1 text-sm text-neutral-500">Start with what this form is for. You'll add the actual questions next.</p>
              <div className="mt-6 space-y-5 border-t border-neutral-200 pt-6">
                <div className="space-y-1.5">
                  <Label>Form Name *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Noise Level Monitoring" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this form for? Shown to site users." />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Icon / Custom Image</Label>
                    <Select 
                      value={ICON_OPTIONS.includes(icon) ? icon : (icon ? "custom_image" : ICON_OPTIONS[0])} 
                      onValueChange={(v) => {
                        if (v === "custom_image") setIcon("");
                        else setIcon(v);
                      }}
                    >
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select icon..." /></SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                        <SelectItem value="custom_image" className="font-bold text-teal-700">Custom Image URL...</SelectItem>
                      </SelectContent>
                    </Select>
                    {(!ICON_OPTIONS.includes(icon) && icon !== undefined) && (
                      <Input
                        placeholder="Paste image URL here (https://...)"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        className="mt-2 text-xs bg-white border-teal-200"
                        autoFocus
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>How Often?</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="one_time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-1.5">
                    <Checkbox id="is-active" checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
                    <Label htmlFor="is-active" className="cursor-pointer text-sm">Active immediately</Label>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* // ✅ REPLACE STEP 2 IN CREATE MODE WITH THIS: */}
          {step === 2 && (
            <section id="questions">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Step 2 — Questions & Layout</p>
                  <h2 className="mt-1 text-lg font-bold text-neutral-900">
                    {blocks.length} block{blocks.length === 1 ? "" : "s"}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => addQuestion(null)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Question
                  </Button>
                  <Button size="sm" className="bg-teal-700 text-white hover:bg-teal-800" onClick={addSection}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Section
                  </Button>
                  <Button size="sm" variant="outline" onClick={addRepeatableGroup}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Repeatable Group
                  </Button>
                </div>
              </div>
              <div className="mt-6 border-t border-neutral-200">
                {blocks.length === 0 && (
                  <p className="py-8 text-center text-sm text-neutral-500">No content yet. Click "Add Question" or "Add Section" to start.</p>
                )}
                <BlockList
                  blocks={blocks}
                  onUpdateField={updateField}
                  onRemoveBlock={removeBlock}
                  onAddOption={addOption}
                  onUpdateOption={updateOption}
                  onRemoveOption={removeOption}
                  onUpdateSection={updateSection}
                  onAddQuestion={addQuestion}
                  onUpdateGroup={updateRepeatableGroup}
                  onAddRowField={addRowField}
                  onUpdateRowField={updateRowField}
                  onRemoveRowField={removeRowField}
                  onAddRowFieldOption={addRowFieldOption}
                  onUpdateRowFieldOption={updateRowFieldOption}
                  onRemoveRowFieldOption={removeRowFieldOption}
                />
              </div>
              <datalist id="unit-suggestions">
                {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
              </datalist>
            </section>
          )}

          {step === 3 && (
            <section>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-teal-700">Step 3</p>
              <h2 className="mt-1 text-xl font-bold text-neutral-900">Who should see this form?</h2>
              <div className="mt-6 space-y-4 border-t border-neutral-200 pt-6">
                
                {/* ADDED: Audience Selector for Create Mode */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-neutral-900">Who can fill this out?</Label>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={visibleToSiteUsers}
                        onCheckedChange={(v) => setVisibleToSiteUsers(!!v)}
                      />
                      Site Users
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={visibleToContractors}
                        onCheckedChange={(v) => setVisibleToContractors(!!v)}
                      />
                      Contractors
                    </label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="radio" name="visibility-mode" checked={visibilityMode === "all"} onChange={() => setVisibilityMode("all")} />
                    All Sites
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="radio" name="visibility-mode" checked={visibilityMode === "specific"} onChange={() => setVisibilityMode("specific")} />
                    Specific Sites
                  </label>
                </div>
                {visibilityMode === "specific" && (
                  <div>
                    <div className="mb-2 flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedSiteIds(new Set(sites.map((s) => s.id)))}>Select All</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedSiteIds(new Set())}>Clear</Button>
                    </div>
                    {sitesLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {sites.map((site) => (
                          <label key={site.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 p-2 text-sm transition-colors hover:bg-neutral-50">
                            <Checkbox
                              checked={selectedSiteIds.has(site.id)}
                              onCheckedChange={() => {
                                setSelectedSiteIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(site.id)) next.delete(site.id); else next.add(site.id);
                                  return next;
                                });
                              }}
                            />
                            <span>{site.name} <span className="text-xs text-neutral-500">({site.code})</span></span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-neutral-500">
                  {visibilityMode === "all" ? "This form will appear on every site's dashboard." : "This form will only appear on the dashboards of the sites you select."}
                </p>
              </div>
            </section>
          )}

          <div className="mt-10 flex justify-between border-t border-neutral-200 pt-6">
            <Button variant="outline" onClick={step === 1 ? () => navigate({ to: "/authenticated/app" }) : goBack}>
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            {step < 3 ? (
              <Button onClick={goNext}>Next</Button>
            ) : (
              <Button onClick={handleWizardSubmit} disabled={submitMutation.isPending}>
                {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create & Publish Form
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}