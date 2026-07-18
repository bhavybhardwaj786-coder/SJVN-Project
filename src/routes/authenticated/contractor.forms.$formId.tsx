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
  const isSubmitted = existing?.status === "submitted";

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
              <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {fields.map((field: any) => {
                  const dynamicPlaceholder = `Enter ${field.label.toLowerCase()}`;
                  const attachedFiles = values[`${field.key}_files`] || [];
                  const localFiles = localFilesToUpload[field.key] || [];

                  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const selectedFiles = e.target.files;
                    if (!selectedFiles || selectedFiles.length === 0) return;
                    const newFiles = Array.from(selectedFiles);
                    setLocalFilesToUpload(prev => ({
                      ...prev,
                      [field.key]: [...(prev[field.key] || []), ...newFiles]
                    }));
                    toast.success(`Staged ${newFiles.length} file(s) for upload.`);
                  };

                  const removeAttachment = (idx: number, isLocal: boolean) => {
                    if (isLocal) {
                      setLocalFilesToUpload(prev => ({
                        ...prev,
                        [field.key]: (prev[field.key] || []).filter((_, i) => i !== idx)
                      }));
                    } else {
                      const updatedArray = attachedFiles.filter((_: any, i: number) => i !== idx);
                      setValues(prev => ({ ...prev, [`${field.key}_files`]: updatedArray }));
                    }
                    toast.info("Attachment removed");
                  };

                  return (
                    <motion.div key={field.key} variants={fadeUp} className="space-y-1.5 p-4 rounded-xl border border-neutral-100 bg-white/50 shadow-sm">
                      {field.type !== "checkbox" && (
                        <Label className="text-sm font-semibold text-muted-foreground">
                          {field.label}{field.required && "*"}
                        </Label>
                      )}

                      {["text", "number", "date"].includes(field.type) && (
                        <Input
                          type={field.type}
                          disabled={isSubmitted}
                          value={values[field.key] ?? ""}
                          onChange={(e) => setField(field.key, e.target.value)}
                          placeholder={dynamicPlaceholder}
                          className="h-11 rounded-md border bg-background shadow-card"
                        />
                      )}

                      {field.type === "textarea" && (
                        <Textarea
                          disabled={isSubmitted}
                          value={values[field.key] ?? ""}
                          onChange={(e) => setField(field.key, e.target.value)}
                          placeholder={dynamicPlaceholder}
                          className="min-h-[100px] resize-none rounded-md border bg-background shadow-card"
                        />
                      )}

                      {field.type === "select" && (
                        <Select disabled={isSubmitted} value={values[field.key] ?? ""} onValueChange={(v) => setField(field.key, v)}>
                          <SelectTrigger className="h-11 rounded-md border bg-background shadow-card">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((opt: any) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.type === "checkbox" && (
                        <div className="flex h-11 items-center gap-3 rounded-md border bg-background px-4 shadow-card">
                          <Checkbox id={field.key} disabled={isSubmitted} checked={!!values[field.key]} onCheckedChange={(v) => setField(field.key, v)} />
                          <label htmlFor={field.key} className="cursor-pointer select-none text-sm font-semibold text-muted-foreground">
                            {field.label} {field.required && "*"}
                          </label>
                        </div>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-dashed border-neutral-200 space-y-2">
                        {attachedFiles.map((fileObj: { url: string; name: string }, idx: number) => (
                          <div key={`live-${idx}`} className="flex items-center justify-between rounded-lg bg-[#eaf3f6] p-2 text-xs border border-[#b4d6e2]">
                            <a href={fileObj.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-bold text-[#095a7d] hover:underline truncate max-w-[80%]">
                              <FileIcon className="h-3.5 w-3.5 shrink-0" /> {fileObj.name || `Attachment ${idx + 1}`}
                            </a>
                            {!isSubmitted && (
                              <button type="button" onClick={() => removeAttachment(idx, false)} className="text-red-500 hover:text-red-700 p-1">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        {localFiles.map((file: File, idx: number) => {
                          return (
                            <div key={`local-${idx}`} className="flex items-center justify-between rounded-lg bg-amber-50 p-2 text-xs border border-amber-200">
                              <div className="flex items-center gap-1.5 font-bold text-amber-800 truncate max-w-[80%]">
                                <FileIcon className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                {/* 👈 Fix: Removed object URL here to prevent severe memory leaks on re-renders */}
                                <span className="truncate text-amber-900">{file.name}</span>
                                <span className="text-[10px] font-normal text-amber-500 shrink-0">(Staged)</span>
                              </div>
                              {!isSubmitted && (
                                <button type="button" onClick={() => removeAttachment(idx, true)} className="text-red-500 p-1">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {!isSubmitted && (
                          <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-500 hover:text-[#095a7d] transition-colors">
                            <Paperclip className="h-3.5 w-3.5" />
                            Attach Supporting Documents
                            <input type="file" className="hidden" accept="application/pdf,image/*" multiple onChange={handleFileUpload} />
                          </label>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Replace your current `<AnimatePresence>` block at the bottom of the fields map with this: */}

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
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}