import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { formsService, submissionsService, sitesService } from "@/services";
import { uploadFile } from "@/lib/apiClient";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Loader2, 
  FileText, 
  CheckCircle2, 
  Paperclip, 
  File as FileIcon, 
  X,
  Lock,
  Plus,
  Trash2,
  Wind,
  BarChart3,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

import sjvnLogo from "@/assets/sjvn-logo.jpeg";
import { FormStepper, type WizardStep } from "@/components/form-stepper";

export const Route = createFileRoute("/authenticated/site/forms/$formId")({
  ssr: false,
  component: FillForm,
});

// --- shared animation variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

function FillForm() {
  const { formId } = Route.useParams();
  const search = Route.useSearch() as { period?: string };
  const period = search.period || new Date().toISOString().slice(0, 7);
  const reportingMonth = `${period}-01`;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { data: formResult } = useQuery({
    queryKey: ["form-def", formId],
    queryFn: () => formsService.getFormById(formId),
  });
  const formDef = formResult?.data;
  const fields = formDef?.schema?.fields || [];

  // FIXED: Query using "site_user" instead of "site" to align with database & admin dashboard
  const { data: existingResult } = useQuery({
    queryKey: ["submission-for-form", formId, currentUser?.site_id, reportingMonth, "site"],
    queryFn: () =>
      submissionsService.getSubmissionForForm(
        formId, 
        currentUser?.site_id || "", 
        reportingMonth, 
        "site" // 👈 Fixed from "site_user"
      ),
    enabled: !!currentUser?.site_id,
  });
  const existing = existingResult?.data;

  const { data: siteData, isLoading: isSiteDataLoading } = useQuery({
    queryKey: ["site-access-verification", currentUser?.site_id],
    queryFn: async () => {
      const { data, error } = await sitesService.getSiteAccess(currentUser?.site_id || "");
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!currentUser?.site_id,
  });

  const { data: allSitesResult } = useQuery({
    queryKey: ["my-sites"],
    queryFn: () => sitesService.getSites(),
    enabled: !!currentUser?.site_id,
  });

  const resolvedSiteName =
    siteData?.name ||
    allSitesResult?.data?.find((s: any) => s.id === currentUser?.site_id)?.name;

  const isMonthUnlocked = siteData?.unlocked_months?.includes(period) || false;

  const isSubmitted = existing?.status === "submitted" && !existing?.edit_unlocked;

  const repeatableGroups = formDef?.schema?.repeatable_groups || [];

  // --- Split the layout into "global" nodes (instructions/metadata —
  // shown on every step) and "step" nodes (the actual sections to fill in) ---
  const allLayoutNodes: any[] = formDef?.schema?.layout || [];
  const GLOBAL_NODE_TYPES = ["instruction", "metadata"];

  const globalNodes = allLayoutNodes.filter((node: any) => GLOBAL_NODE_TYPES.includes(node.type));
  const layoutNodes = allLayoutNodes.filter((node: any) => !GLOBAL_NODE_TYPES.includes(node.type));

  function iconForNode(node: any) {
    const t = (node.title || "").toLowerCase();
    if (t.includes("ambient")) return Wind;
    if (t.includes("stack") || t.includes("emission")) return BarChart3;
    return FileText;
  }

  const wizardSteps: WizardStep[] =
    layoutNodes.length > 1
      ? [
          ...layoutNodes.map((node, i) => ({
            id: node.id || `section-${i}`,
            title: node.title || `Section ${i + 1}`,
            subtitle: "",
            Icon: iconForNode(node),
          })),
          { id: "__review", title: "Review & Submit", subtitle: "", Icon: ShieldCheck },
        ]
      : [];

  const [currentStep, setCurrentStep] = useState(0);
  const isWizardMode = wizardSteps.length > 0;
  const isReviewStep = isWizardMode && currentStep === wizardSteps.length - 1;

  const [values, setValues] = useState<Record<string, any>>({});
  const [localFilesToUpload, setLocalFilesToUpload] = useState<Record<string, File[]>>({});
  const [groupRows, setGroupRows] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (existing?.data) setValues(existing.data);

    const groups = formDef?.schema?.repeatable_groups || [];
    if (groups.length > 0) {
      const initialGroups: Record<string, any[]> = {};
      groups.forEach((g: any) => {
        const existingRows = existing?.data?.[g.key];
        initialGroups[g.key] =
          Array.isArray(existingRows) && existingRows.length > 0
            ? existingRows
            : Array.from({ length: g.minRows || 1 }, () => ({}));
      });
      setGroupRows(initialGroups);
    }
  }, [existing, formDef]);

  // --- Generic Auto-Total Calculator ---
  // Works for EVERY form: finds any table that has a summary row,
  // sums the numeric field values in that table's rows, and writes
  // the result into whatever field the summary row points to.
  useEffect(() => {
    const layout = formDef?.schema?.layout;
    if (!layout) return;

    const tableNodes: any[] = [];
    const walk = (nodes: any[]) => {
      (nodes || []).forEach((node: any) => {
        if (node.type === "table" && node.summaryRow) {
          tableNodes.push(node);
        }
        if (node.children) walk(node.children);
      });
    };
    walk(layout);

    tableNodes.forEach((table) => {
      const rowFieldKeys: string[] = [];
      (table.rows || []).forEach((row: any[]) => {
        row.forEach((cell: any) => {
          if (cell.type === "field") rowFieldKeys.push(cell.fieldKey);
        });
      });

      const total = rowFieldKeys.reduce((sum, key) => {
        const num = parseFloat(values[key]);
        return sum + (isNaN(num) ? 0 : num);
      }, 0);

      table.summaryRow.forEach((cell: any) => {
        if (cell.type === "field" && values[cell.fieldKey] !== total) {
          setField(cell.fieldKey, total);
        }
      });
    });
  }, [values, formDef]);



  const setField = (key: string, val: any) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const setGroupField = (groupKey: string, rowIndex: number, fieldKey: string, val: any) => {
    setGroupRows((prev) => {
      const rows = [...(prev[groupKey] || [])];
      rows[rowIndex] = { ...rows[rowIndex], [fieldKey]: val };
      return { ...prev, [groupKey]: rows };
    });
  };

  const addGroupRow = (groupKey: string) => {
    setGroupRows((prev) => ({ ...prev, [groupKey]: [...(prev[groupKey] || []), {}] }));
  };

  const removeGroupRow = (groupKey: string, rowIndex: number) => {
    setGroupRows((prev) => {
      const rows = (prev[groupKey] || []).filter((_: any, i: number) => i !== rowIndex);
      return { ...prev, [groupKey]: rows.length > 0 ? rows : [{}] };
    });
  };

  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      if (!currentUser?.site_id || !currentUser?.id) {
        throw new Error("User session details missing. Please reload the page.");
      }

      const toastId = toast.loading("Processing form items and attachments...");
      let updatedValues = { ...values };

      try {
        // 1. Scan fields to verify if any question has local files that need uploading
        for (const field of fields) {
          const filesToUpload = localFilesToUpload[field.key] || [];
          
          if (filesToUpload.length > 0) {
            toast.loading(`Uploading attachments for: ${field.label}...`, { id: toastId });
            
            const batchTimestamp = Date.now();
            
            // Map local files to concurrent parallel upload promises
            const uploadPromises = filesToUpload.map(async (file, i) => {
              const fileExt = file.name.split('.').pop();
              const safeFileName = file.name.replace(/\s+/g, "_");
              
              const uniquePath = `${formId}_${currentUser.site_id || 'site'}_${batchTimestamp}_${i}/${field.key}_${safeFileName}`;

              const { url } = await uploadFile(uniquePath, file);

              return { url, name: file.name, storagePath: uniquePath };
            });

            // Resolve all concurrent uploads for this question field together
            const uploadedResults = await Promise.all(uploadPromises);
            
            const existingFiles = updatedValues[`${field.key}_files`] || [];
            updatedValues[`${field.key}_files`] = [...existingFiles, ...uploadedResults];
          }
        }

        // 2. Submit or Save the full payload configuration using 'site_user' role
        const result = await submissionsService.saveOrSubmit({
          formId,
          siteId: currentUser.site_id,
          userId: currentUser.id,
          reportingMonth,
          data: { ...updatedValues, ...groupRows },
          submit,
          submittedByRole: "site", // 👈 FIXED: Reverted back to "site" to satisfy DB constraint
        });

        if (result.error) throw result.error;

        setLocalFilesToUpload({});
        toast.dismiss(toastId);
        return result;

      } catch (err: any) {
        toast.error(err.message || "Failed to process form submission workflow.", { id: toastId });
        throw err;
      }
    },
    onSuccess: (result, submit) => {
      toast.success(submit ? "Form submitted successfully!" : "Draft configuration saved!");
      queryClient.invalidateQueries({ queryKey: ["submissions-by-month"] });
      queryClient.invalidateQueries({ queryKey: ["submission-for-form"] });
      if (submit) navigate({ to: "/authenticated/site" });
    },
  });

  // --- NEW: Strict Validation Handler ---
  const handleAction = (isSubmit: boolean) => {
    if (isSubmit) {
      // Scan all fields to ensure no column is left completely blank
      const emptyFields = fields.filter((field: any) => {
        // Checkboxes default to false, which is a valid answer, so we skip them
        if (field.type === "checkbox") return false; 
        
        const val = values[field.key];
        // Flag as empty if undefined, null, or a blank string
        return val === undefined || val === null || val === "";
      });

      const emptyGroupFields = repeatableGroups.some((g: any) =>
        (groupRows[g.key] || []).some((row: any) =>
          g.rowFields.some(
            (rf: any) => rf.required && (row[rf.key] === undefined || row[rf.key] === null || row[rf.key] === "")
          )
        )
      );

      if (emptyFields.length > 0 || emptyGroupFields) {
        toast.error(`Cannot submit incomplete report.`);
        return; // Stop execution, do not trigger the database save
      }
    }
    
    // If validation passes (or if saving a draft), proceed to the mutation
    save.mutate(isSubmit);
  };

  if (!formDef) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="-mt-6 -mb-6 w-[100vw] relative left-1/2 -translate-x-1/2">
        <motion.div
          initial="hidden"
          animate="show"
          variants={containerVariants}
          className="w-full"
        >
          <div className="bg-card">
            <motion.div
              variants={fadeUp}
              className="px-6 pt-8 sm:px-10 sm:pt-10"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="inline-block rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-5 shadow-sm">
                  <h2 className="mt-1 font-display text-2xl font-bold text-white">
                    {formDef.title}
                  </h2>
                </div>
                
                {isSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="shrink-0"
                  >
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Submitted
                    </span>
                  </motion.div>
                )}
                {existing?.status === "submitted" && existing?.edit_unlocked && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="shrink-0"
                  >
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      Reopened for Editing — please review and resubmit
                    </span>
                  </motion.div>
                )}
              </div>
            </motion.div>

            <div className="p-6 sm:p-10">
              {/* --- NEW RENDER ENGINE START --- */}
              {(() => {
                // 1. Shared Field Renderer (handles both standard cards and bare table inputs)
                console.log(JSON.stringify(formDef.schema, null, 2))

                // Collect every field key that's a summary/total field, across
                // the whole layout (works for every form automatically)
                const calculatedFieldKeys = new Set<string>();
                const collectCalculated = (nodes: any[]) => {
                  (nodes || []).forEach((node: any) => {
                    if (node.type === "table" && node.summaryRow) {
                      node.summaryRow.forEach((cell: any) => {
                        if (cell.type === "field") calculatedFieldKeys.add(cell.fieldKey);
                      });
                    }
                    if (node.children) collectCalculated(node.children);
                  });
                };
                collectCalculated(formDef.schema?.layout || []);

                const renderFieldUI = (fieldKey: string, inTable: boolean = false) => {
                  const field = fields.find((f: any) => f.key === fieldKey);
                  const effectiveType = field?.key === "field_1784010887803_13" ? "text" : field?.type;
                  const isCalculated = calculatedFieldKeys.has(field?.key);

                  if (!field) return <span className="text-red-500 text-xs">Missing Field: {fieldKey}</span>;

                  const dynamicPlaceholder = `Enter ${field.label.toLowerCase()}`;
                  const attachedFiles = values[`${field.key}_files`] || [];
                  const localFiles = localFilesToUpload[field.key] || [];

                  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const selectedFiles = e.target.files;
                    if (!selectedFiles || selectedFiles.length === 0) return;
                    const newFiles = Array.from(selectedFiles);
                    setLocalFilesToUpload(prev => ({ ...prev, [field.key]: [...(prev[field.key] || []), ...newFiles] }));
                    toast.success(`Staged ${newFiles.length} file(s) for upload.`);
                  };

                  const removeAttachment = (idx: number, isLocal: boolean) => {
                    if (isLocal) {
                      setLocalFilesToUpload(prev => ({ ...prev, [field.key]: (prev[field.key] || []).filter((_, i) => i !== idx) }));
                    } else {
                      const updatedArray = attachedFiles.filter((_: any, i: number) => i !== idx);
                      setValues(prev => ({ ...prev, [`${field.key}_files`]: updatedArray }));
                    }
                  };

                  // The actual input components stripped of padding for tables
                  const InputComponent = (
                    <div className="w-full space-y-2">
                      {["text", "number", "date"].includes(field.type) && (
                        <Input type={effectiveType} disabled={isSubmitted || field.readOnly || isCalculated} value={values[field.key] ?? ""} onChange={(e) => setField(field.key, e.target.value)} placeholder={dynamicPlaceholder} className={`h-11 rounded-md border bg-background shadow-sm ${isCalculated ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''} ${inTable ? 'min-w-[120px]' : ''}`} />
                      )}
                      {field.type === "textarea" && (
                        <Textarea disabled={isSubmitted || field.readOnly} value={values[field.key] ?? ""} onChange={(e) => setField(field.key, e.target.value)} placeholder={dynamicPlaceholder} className={`min-h-[100px] resize-none rounded-md border bg-background shadow-sm ${inTable ? 'min-w-[200px]' : ''}`} />
                      )}
                      {field.type === "select" && (
                        <Select disabled={isSubmitted || field.readOnly} value={values[field.key] ?? ""} onValueChange={(v) => setField(field.key, v)}>
                          <SelectTrigger className={`h-11 rounded-md border bg-background shadow-sm ${inTable ? 'min-w-[150px]' : ''}`}>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((opt: any) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.type === "checkbox" && (
                        <div className="flex items-center gap-5 pt-1.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              disabled={isSubmitted || field.readOnly || isCalculated} 
                              checked={values[field.key] === true} 
                              onCheckedChange={() => setField(field.key, true)} 
                            />
                            <span className={inTable ? "text-xs text-slate-600" : "text-sm font-medium text-slate-700"}>Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              disabled={isSubmitted || field.readOnly || isCalculated} 
                              checked={values[field.key] === false} 
                              onCheckedChange={() => setField(field.key, false)} 
                            />
                            <span className={inTable ? "text-xs text-slate-600" : "text-sm font-medium text-slate-700"}>No</span>
                          </label>
                        </div>
                      )}
                      
                      {/* Attachments Section */}
                      <div className="flex flex-col gap-1.5 mt-1">
                        {attachedFiles.map((fileObj: any, idx: number) => (
                          <div key={`live-${idx}`} className="flex items-center justify-between rounded bg-[#eaf3f6] p-1.5 text-[11px] border border-[#b4d6e2]">
                            <a href={fileObj.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold text-[#095a7d] hover:underline truncate max-w-[120px]"><FileText className="h-3 w-3 shrink-0" /> {fileObj.name}</a>
                            {!isSubmitted && <button type="button" onClick={() => removeAttachment(idx, false)} className="text-red-500 hover:text-red-700 p-0.5"><X className="h-3 w-3" /></button>}
                          </div>
                        ))}
                        {localFiles.map((file: File, idx: number) => (
                          <div key={`local-${idx}`} className="flex items-center justify-between rounded bg-amber-50 p-1.5 text-[11px] border border-amber-200">
                            <span className="truncate text-amber-900 max-w-[120px] flex items-center gap-1"><FileText className="h-3 w-3 shrink-0 text-amber-600" /> {file.name}</span>
                            {!isSubmitted && <button type="button" onClick={() => removeAttachment(idx, true)} className="text-red-500 p-0.5"><X className="h-3 w-3" /></button>}
                          </div>
                        ))}
                        {!isSubmitted && (
                          <label className="inline-flex items-center gap-1 cursor-pointer text-[10px] font-bold text-gray-500 hover:text-[#095a7d] transition-colors mt-0.5">
                            <Paperclip className="h-3 w-3" /> Attach File
                            <input type="file" className="hidden" accept="application/pdf,image/*" multiple onChange={handleFileUpload} />
                          </label>
                        )}
                      </div>
                    </div>
                  );

                  if (inTable) return InputComponent;

                  // Standard Card Wrapper for non-table fields
                  return (
                    <motion.div key={field.key} variants={fadeUp} className="space-y-1.5 p-4 rounded-xl border border-neutral-100 bg-white/50 shadow-sm">
                      <Label className="text-sm font-semibold text-muted-foreground">{field.label} {field.required && "*"}</Label>
                      {InputComponent}
                    </motion.div>
                  );
                };

                // 2. Recursive Layout Renderer
                const renderLayoutNode = (node: any, idx: number) => {
                  if (node.type === "instruction") {
                    return (
                      <div key={idx} className="mb-6 rounded-lg bg-blue-50/50 border border-blue-100 p-4 text-sm text-blue-900 shadow-sm">
                        <strong className="block mb-1 text-blue-950 font-bold">Instructions</strong>
                        <p className="whitespace-pre-wrap leading-relaxed">{node.content}</p>
                      </div>
                    );
                  }
                  
                  if (node.type === "metadata") {
                    return (
                      <div key={idx} className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs">
                        {node.display.includes("reporting_month") && <div><span className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Reporting Month</span><span className="font-semibold text-slate-900">{new Date(reportingMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</span></div>}
                        {node.display.includes("site_name") && <div><span className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Site Location</span><span className="font-semibold text-slate-900">{isSiteDataLoading ? "Loading…" : (resolvedSiteName || "Unknown Site")}</span></div>}
                        {node.display.includes("user_name") && <div><span className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Filled By</span><span className="font-semibold text-slate-900">{currentUser?.full_name || "Unknown"}</span></div>}
                        {node.display.includes("date_filled") && <div><span className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Date Logged</span><span className="font-semibold text-slate-900">{new Date().toLocaleDateString()}</span></div>}
                      </div>
                    );
                  }

                  if (node.type === "section") {
                    return (
                      <div key={idx} className="mb-8 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3.5">
                          <h3 className="text-base font-bold text-slate-900">{node.title}</h3>
                          {node.description && <p className="text-xs text-slate-500 mt-1">{node.description}</p>}
                        </div>
                        <div className="p-5">
                          {node.children?.map((child: any, cIdx: number) => renderLayoutNode(child, cIdx))}
                        </div>
                      </div>
                    );
                  }

                  if (node.type === "table") {
                    return (
                      <div key={idx} className="overflow-x-auto w-full mb-6 rounded-lg border border-slate-200">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-100/50 text-slate-700 text-xs uppercase font-bold tracking-wider">
                            <tr>
                              {node.columns.map((col: string, i: number) => <th key={i} className="px-4 py-3 border-b border-slate-200">{col}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {node.rows.map((row: any[], rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-slate-50/30 transition-colors">
                                {row.map((cell: any, cIdx: number) => (
                                  <td key={cIdx} colSpan={cell.colSpan || 1} className="px-4 py-3 align-top">
                                    {cell.type === "label" ? <span className="font-medium text-slate-700">{cell.value}</span> : null}
                                    {cell.type === "field" ? renderFieldUI(cell.fieldKey, true) : null}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {node.summaryRow && (
                              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                {node.summaryRow.map((cell: any, cIdx: number) => (
                                  <td key={`sum-${cIdx}`} colSpan={cell.colSpan || 1} className="px-4 py-3 align-middle">
                                    {cell.type === "label" ? <span className="text-slate-900 uppercase">{cell.value}</span> : null}
                                    {cell.type === "field" ? renderFieldUI(cell.fieldKey, true) : null}
                                  </td>
                                ))}
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                 if (node.type === "field_group") {
                    return (
                      <div key={idx} className="overflow-x-auto w-full mb-6 rounded-lg border border-slate-200">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-100/50 text-slate-700 text-xs uppercase font-bold tracking-wider">
                            <tr>
                              <th className="px-4 py-3 border-b border-slate-200">S. No.</th>
                              <th className="px-4 py-3 border-b border-slate-200">Substance</th>
                              <th className="px-4 py-3 border-b border-slate-200">Unit</th>
                              <th className="px-4 py-3 border-b border-slate-200">Reported Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {node.children.map((fieldKey: string, rIdx: number) => {
                              const field = fields.find((f: any) => f.key === fieldKey);
                              return (
                                <tr key={fieldKey} className="hover:bg-slate-50/30 transition-colors">
                                  <td className="px-4 py-3 align-top font-medium text-slate-700">{rIdx + 1}</td>
                                  <td className="px-4 py-3 align-top font-medium text-slate-700">{field?.label || fieldKey}</td>
                                  <td className="px-4 py-3 align-top text-slate-700">{field?.unit || "—"}</td>
                                  <td className="px-4 py-3 align-top">{renderFieldUI(fieldKey, true)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  if (node.type === "repeatable_table") {
                    const group = repeatableGroups.find((g: any) => g.key === node.groupKey);
                    if (!group) return <span key={idx} className="text-red-500 text-xs">Missing group: {node.groupKey}</span>;
                    const rows = groupRows[group.key] || [];

                    const renderGroupFieldUI = (rowIndex: number, rowField: any) => {
                      const value = rows[rowIndex]?.[rowField.key] ?? "";
                      if (["text", "number", "date"].includes(rowField.type)) {
                        return (
                          <Input
                            type={rowField.type}
                            disabled={isSubmitted}
                            value={value}
                            onChange={(e) => setGroupField(group.key, rowIndex, rowField.key, e.target.value)}
                            placeholder={`Enter ${rowField.label.toLowerCase()}`}
                            className="h-11 rounded-md border bg-background shadow-sm min-w-[120px]"
                          />
                        );
                      }
                      if (rowField.type === "select") {
                        return (
                          <Select disabled={isSubmitted} value={value} onValueChange={(v) => setGroupField(group.key, rowIndex, rowField.key, v)}>
                            <SelectTrigger className="h-11 rounded-md border bg-background shadow-sm min-w-[150px]">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {rowField.options?.map((opt: any) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        );
                      }
                      return null;
                    };

                    return (
                      <div key={idx} className="mb-6">
                        {node.title && <h4 className="text-sm font-bold text-slate-800 mb-2">{node.title}</h4>}
                        <div className="overflow-x-auto w-full rounded-lg border border-slate-200">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100/50 text-slate-700 text-xs uppercase font-bold tracking-wider">
                              <tr>
                                <th className="px-4 py-3 border-b border-slate-200">S. No.</th>
                                {group.rowFields.map((rf: any, i: number) => (
                                  <th key={i} className="px-4 py-3 border-b border-slate-200">{rf.label}{rf.unit ? ` (${rf.unit})` : ""}</th>
                                ))}
                                {!isSubmitted && <th className="px-4 py-3 border-b border-slate-200 w-10"></th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {rows.map((_: any, rIdx: number) => (
                                <tr key={rIdx} className="hover:bg-slate-50/30 transition-colors">
                                  <td className="px-4 py-3 align-top font-medium text-slate-700">{rIdx + 1}</td>
                                  {group.rowFields.map((rf: any, cIdx: number) => (
                                    <td key={cIdx} className="px-4 py-3 align-top">
                                      {renderGroupFieldUI(rIdx, rf)}
                                    </td>
                                  ))}
                                  {!isSubmitted && (
                                    <td className="px-4 py-3 align-top">
                                      <button
                                        type="button"
                                        onClick={() => removeGroupRow(group.key, rIdx)}
                                        disabled={rows.length <= 1}
                                        title="Remove row"
                                        className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed p-1.5"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {!isSubmitted && (
                          <button
                            type="button"
                            onClick={() => addGroupRow(group.key)}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add {group.label || "Row"}
                          </button>
                        )}
                      </div>
                    );
                  }

                  return null;
                };

                // 3. Fallback to Legacy Render if no layout schema exists
                // 3. Wizard-aware render: global nodes always shown first,
                // then the tab bar, then the current section (or Review)
                if (isWizardMode) {
                  return (
                    <>
                      {globalNodes.map((node: any, idx: number) => renderLayoutNode(node, `global-${idx}`))}

                      <div className="mb-8">
                        <FormStepper
                          steps={wizardSteps}
                          currentIndex={currentStep}
                          onStepClick={setCurrentStep}
                        />
                      </div>

                      {isReviewStep ? (
                        <ReviewStep
                          layoutNodes={layoutNodes}
                          values={values}
                          fields={fields}
                          repeatableGroups={repeatableGroups}
                          groupRows={groupRows}
                        />
                      ) : (
                        <motion.div variants={containerVariants} className="w-full space-y-2">
                          {renderLayoutNode(layoutNodes[currentStep], currentStep)}
                        </motion.div>
                      )}
                    </>
                  );
                }

                // Fallback: forms with only one section (or none) keep the old look
                if (formDef.schema?.layout) {
                  return (
                    <motion.div variants={containerVariants} className="w-full space-y-2">
                      {formDef.schema.layout.map((node: any, idx: number) => renderLayoutNode(node, idx))}
                    </motion.div>
                  );
                } else {
                  return (
                    <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {fields.map((field: any) => renderFieldUI(field.key))}
                    </motion.div>
                  );
                }
              })()}

              <AnimatePresence>
              {/* --- NEW RENDER ENGINE END --- */}
                  {isWizardMode && (
                    <motion.div
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 mt-4 border-t border-border/50"
                    >
                      <Button
                        variant="outline"
                        disabled={currentStep === 0}
                        onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                        className="w-full sm:w-auto"
                      >
                        Back
                      </Button>

                      <div className="flex w-full sm:w-auto items-center justify-end gap-4">
                        {!isSubmitted && isMonthUnlocked && (
                          <Button
                            variant="ghost"
                            onClick={() => handleAction(false)}
                            disabled={save.isPending}
                            className="w-full sm:w-auto px-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            Save Draft
                          </Button>
                        )}

                        {!isReviewStep ? (
                          <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                            <Button
                              onClick={() => setCurrentStep((s) => Math.min(wizardSteps.length - 1, s + 1))}
                              className="h-12 w-full sm:w-auto px-10 rounded-md bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[15px] font-bold shadow-md"
                            >
                              Continue
                            </Button>
                          </motion.div>
                        ) : (
                          !isSubmitted && isMonthUnlocked && (
                            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                              <Button
                                onClick={() => handleAction(true)}
                                disabled={save.isPending}
                                className="h-12 w-full sm:w-auto px-10 rounded-md bg-primary text-[15px] font-bold text-primary-foreground shadow-card transition-shadow hover:shadow-glow"
                              >
                                {save.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Submit Form"
                                )}
                              </Button>
                            </motion.div>
                          )
                        )}
                      </div>
                    </motion.div>
                  )}

                  {!isWizardMode && !isSubmitted && isMonthUnlocked && (
                    <motion.div
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                      className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row items-center justify-end gap-4 pt-8 mt-4 border-t border-border/50"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => handleAction(false)}
                        disabled={save.isPending}
                        className="w-full sm:w-auto px-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Save Draft
                      </Button>

                      <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                        <Button
                          onClick={() => handleAction(true)}
                          disabled={save.isPending}
                          className="h-12 w-full sm:w-auto px-10 rounded-md bg-primary text-[15px] font-bold text-primary-foreground shadow-card transition-shadow hover:shadow-glow"
                        >
                          {save.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Submit Form"
                          )}
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}

                  {!isSubmitted && !isMonthUnlocked && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8 rounded-xl bg-rose-50 p-5 text-center border border-rose-200">
                      <p className="text-sm font-bold text-rose-700">
                        <Lock className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
                        This reporting period is currently locked by the Administrator. You cannot save or submit records.
                      </p>
                    </div>
                  )}
                </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}

// Walks a layout node (table, section, field_group — nested any depth)
// and pulls out every field key inside it, regardless of how deeply
// it's wrapped. This is what makes Review work for every form's shape.
// Formats a value for read-only display the same way the submission
// detail page does: checkboxes as Yes/No, selects show their label.
function formatReviewValue(field: any, value: any) {
  if (value === undefined || value === null || value === "") return "—";
  if (field?.type === "checkbox") return value ? "Yes" : "No";
  if (field?.type === "select") {
    const opt = field.options?.find((o: any) => o.value === value);
    return opt?.label ?? value;
  }
  return String(value);
}

// Renders one layout node read-only, reusing the SAME table shape
// (same columns, same rows) as the fill-in view — just with plain
// text instead of inputs. Works for any node type, any form.
function renderReviewNode(
  node: any,
  idx: number,
  values: Record<string, any>,
  fields: any[],
  repeatableGroups: any[],
  groupRows: Record<string, any[]>
) {
  const findField = (fieldKey: string) => fields.find((f: any) => f.key === fieldKey);

  if (node.type === "section") {
    return (
      <div key={idx} className="mb-6">
        {node.title && <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{node.title}</h5>}
        {node.children?.map((child: any, cIdx: number) =>
          renderReviewNode(child, cIdx, values, fields, repeatableGroups, groupRows)
        )}
      </div>
    );
  }

  if (node.type === "table") {
    return (
      <div key={idx} className="overflow-x-auto w-full mb-4 rounded-lg border border-slate-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100/50 text-slate-700 text-xs uppercase font-bold tracking-wider">
            <tr>
              {node.columns.map((col: string, i: number) => (
                <th key={i} className="px-4 py-3 border-b border-slate-200">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {node.rows.map((row: any[], rIdx: number) => (
              <tr key={rIdx}>
                {row.map((cell: any, cIdx: number) => (
                  <td key={cIdx} colSpan={cell.colSpan || 1} className="px-4 py-3 align-top">
                    {cell.type === "label" && <span className="font-medium text-slate-700">{cell.value}</span>}
                    {cell.type === "field" && (
                      <span className="font-semibold text-slate-900">
                        {formatReviewValue(findField(cell.fieldKey), values[cell.fieldKey])}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {node.summaryRow && (
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                {node.summaryRow.map((cell: any, cIdx: number) => (
                  <td key={`sum-${cIdx}`} colSpan={cell.colSpan || 1} className="px-4 py-3 align-middle">
                    {cell.type === "label" && <span className="text-slate-900 uppercase">{cell.value}</span>}
                    {cell.type === "field" && (
                      <span className="text-slate-900">
                        {formatReviewValue(findField(cell.fieldKey), values[cell.fieldKey])}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (node.type === "field_group") {
    return (
      <div key={idx} className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {node.children.map((fieldKey: string) => {
          const field = findField(fieldKey);
          return (
            <div key={fieldKey} className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-500">{field?.label || fieldKey}</div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">
                {formatReviewValue(field, values[fieldKey])}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (node.type === "repeatable_table") {
    const group = repeatableGroups.find((g: any) => g.key === node.groupKey);
    if (!group) return null;
    const rows = groupRows[group.key] || [];

    return (
      <div key={idx} className="mb-4">
        {node.title && <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{node.title}</h5>}
        <div className="overflow-x-auto w-full rounded-lg border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100/50 text-slate-700 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3 border-b border-slate-200">S. No.</th>
                {group.rowFields.map((rf: any, i: number) => (
                  <th key={i} className="px-4 py-3 border-b border-slate-200">
                    {rf.label}{rf.unit ? ` (${rf.unit})` : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row: any, rIdx: number) => (
                <tr key={rIdx}>
                  <td className="px-4 py-3 align-top font-medium text-slate-700">{rIdx + 1}</td>
                  {group.rowFields.map((rf: any, cIdx: number) => (
                    <td key={cIdx} className="px-4 py-3 align-top font-semibold text-slate-900">
                      {row?.[rf.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null; // instruction / metadata are already shown globally, skip here
}

function ReviewStep({
  layoutNodes,
  values,
  fields,
  repeatableGroups,
  groupRows,
}: {
  layoutNodes: any[];
  values: Record<string, any>;
  fields: any[];
  repeatableGroups: any[];
  groupRows: Record<string, any[]>;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {layoutNodes.map((node: any, i: number) => {
        const isOpen = expanded.has(i);
        // A step's top-level node is usually a "section" wrapping the real
        // table(s) — show its children here so we don't print the title twice.
        const bodyNodes = node.type === "section" ? node.children || [] : [node];

        return (
          <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between bg-slate-50 px-5 py-3.5 text-left hover:bg-slate-100 transition-colors"
            >
              <h4 className="text-sm font-bold text-slate-800">{node.title || `Section ${i + 1}`}</h4>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="p-5 border-t border-slate-200">
                {bodyNodes.length === 0 && (
                  <div className="text-sm text-slate-400 italic">No fields in this section.</div>
                )}
                {bodyNodes.map((child: any, cIdx: number) =>
                  renderReviewNode(child, cIdx, values, fields, repeatableGroups, groupRows)
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}