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
} from "lucide-react";

export const Route = createFileRoute("/authenticated/contractor/forms/$formId")({
  ssr: false,
  component: FillForm,
});

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

  const { data: existingResult } = useQuery({
    queryKey: ["submission-for-form", formId, currentUser?.site_id, reportingMonth, currentUser?.id],
    queryFn: async () => {
      const { data, error } = await submissionsService.getSubmissionForUser(
        formId,
        currentUser?.site_id || "",
        reportingMonth,
        currentUser?.id || ""
      );
      if (error) throw new Error(error);
      return { data };
    },
    enabled: !!currentUser?.site_id && !!currentUser?.id,
  });
  const existing = existingResult?.data;

  const { data: siteData } = useQuery({
    queryKey: ["site-access-verification", currentUser?.site_id],
    queryFn: async () => {
      const { data, error } = await sitesService.getSiteAccess(currentUser?.site_id || "");
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!currentUser?.site_id,
  });

const isMonthUnlocked = siteData?.unlocked_months?.includes(period) || false;
  const isSubmitted = existing?.status === "submitted" && !existing?.edit_unlocked;

  const [values, setValues] = useState<Record<string, any>>({});
  const [localFilesToUpload, setLocalFilesToUpload] = useState<Record<string, File[]>>({});

  useEffect(() => {
    if (existing?.data) setValues(existing.data);
  }, [existing]);

  const setField = (key: string, val: any) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      const toastId = toast.loading("Processing form items and contractor attachments...");
      let updatedValues = { ...values };

      try {
        for (const field of fields) {
          const filesToUpload = localFilesToUpload[field.key] || [];
          
          if (filesToUpload.length > 0) {
            toast.loading(`Uploading attachments for: ${field.label}...`, { id: toastId });
            const batchTimestamp = Date.now();
            
            const uploadPromises = filesToUpload.map(async (file, i) => {
              const fileExt = file.name.split('.').pop();
              const safeFileName = file.name.replace(/\s+/g, "_");
              
              const uniquePath = `${formId}_${currentUser?.site_id || 'site'}_${batchTimestamp}_${i}/${field.key}_${safeFileName}`;

              const { url } = await uploadFile(uniquePath, file);

              return { url, name: file.name, storagePath: uniquePath };
            });

            const uploadedResults = await Promise.all(uploadPromises);
            const existingFiles = updatedValues[`${field.key}_files`] || [];
            updatedValues[`${field.key}_files`] = [...existingFiles, ...uploadedResults];
          }
        }

        const result = await submissionsService.saveOrSubmit({
          formId,
          siteId: currentUser?.site_id || "",
          userId: currentUser?.id || "",
          reportingMonth,
          data: updatedValues,
          submit,
          submittedByRole: "contractor", // 👈 Verified: This perfectly aligns with our dashboard setup
        });

        if (result.error) throw result.error;

        setLocalFilesToUpload({});
        toast.dismiss(toastId);
        return result;

      } catch (err: any) {
        toast.error(err.message || "Failed to process contractor form submission workflow.", { id: toastId });
        throw err;
      }
    },
    onSuccess: (result, submit) => {
      toast.success(submit ? "Contractor report submitted successfully!" : "Draft configurations saved!");
      queryClient.invalidateQueries({ queryKey: ["submissions-by-month"] });
      queryClient.invalidateQueries({ queryKey: ["submission-for-form"] });
      if (submit) navigate({ to: "/authenticated/contractor" });
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

      if (emptyFields.length > 0) {
        const missingNames = emptyFields.map((f: any) => f.label).join(", ");
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
        <motion.div initial="hidden" animate="show" variants={containerVariants} className="w-full">
          <div className="bg-card">
            <motion.div variants={fadeUp} className="px-6 pt-8 sm:px-10 sm:pt-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Contractor Monthly Compliance Report
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
                    {formDef.title}
                  </h2>
                </div>
                {isSubmitted && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                    </span>
                  </motion.div>
                )}
              </div>
            </motion.div>

            <div className="p-6 sm:p-10">
              {/* --- NEW RENDER ENGINE START --- */}
              {(() => {
                console.log(JSON.stringify(formDef.schema, null, 2))
                // 1. Shared Field Renderer (handles both standard cards and bare table inputs)
                const renderFieldUI = (fieldKey: string, inTable: boolean = false) => {
                  const field = fields.find((f: any) => f.key === fieldKey);
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
                        <Input type={field.type} disabled={isSubmitted || field.readOnly} value={values[field.key] ?? ""} onChange={(e) => setField(field.key, e.target.value)} placeholder={dynamicPlaceholder} className={`h-11 rounded-md border bg-background shadow-sm ${inTable ? 'min-w-[120px]' : ''}`} />
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
                        <div className="flex items-center gap-2 pt-2">
                          <Checkbox id={field.key} disabled={isSubmitted || field.readOnly} checked={!!values[field.key]} onCheckedChange={(v) => setField(field.key, v)} />
                          {inTable && <label htmlFor={field.key} className="text-xs text-muted-foreground">{field.label}</label>}
                        </div>
                      )}
                      
                      {/* Attachments Section */}
                      <div className="flex flex-col gap-1.5 mt-1">
                        {attachedFiles.map((fileObj: any, idx: number) => (
                          <div key={`live-${idx}`} className="flex items-center justify-between rounded bg-[#eaf3f6] p-1.5 text-[11px] border border-[#b4d6e2]">
                            <a href={fileObj.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold text-[#095a7d] hover:underline truncate max-w-[120px]"><FileIcon className="h-3 w-3 shrink-0" /> {fileObj.name}</a>
                            {!isSubmitted && <button type="button" onClick={() => removeAttachment(idx, false)} className="text-red-500 hover:text-red-700 p-0.5"><X className="h-3 w-3" /></button>}
                          </div>
                        ))}
                        {localFiles.map((file: File, idx: number) => (
                          <div key={`local-${idx}`} className="flex items-center justify-between rounded bg-amber-50 p-1.5 text-[11px] border border-amber-200">
                            <span className="truncate text-amber-900 max-w-[120px] flex items-center gap-1"><FileIcon className="h-3 w-3 shrink-0 text-amber-600" /> {file.name}</span>
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
                      {field.type !== "checkbox" && (
                        <Label className="text-sm font-semibold text-muted-foreground">{field.label} {field.required && "*"}</Label>
                      )}
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
                        {node.display.includes("site_name") && <div><span className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Site Location</span><span className="font-semibold text-slate-900">{siteData?.name || "Unknown Site"}</span></div>}
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
                      <div key={idx} className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {node.children.map((fieldKey: string) => renderFieldUI(fieldKey))}
                      </div>
                    );
                  }

                  return null;
                };

                // 3. Fallback to Legacy Render if no layout schema exists
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

              {/* --- NEW RENDER ENGINE END --- */}

              <AnimatePresence>
                {!isSubmitted && isMonthUnlocked && (
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