import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { formsService, submissionsService } from "@/services";
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
import { Loader2, FileText, CheckCircle2 } from "lucide-react";

import sjvnLogo from "@/assets/sjvn-logo.jpeg";

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

  const { data: existingResult } = useQuery({
    queryKey: ["submission-for-form", formId, currentUser?.site_id, reportingMonth],
    queryFn: () =>
      submissionsService.getSubmissionForForm(formId, currentUser!.site_id!, reportingMonth),
    enabled: !!currentUser?.site_id,
  });
  const existing = existingResult?.data;
  const isSubmitted = existing?.status === "submitted";

  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (existing?.data) setValues(existing.data);
  }, [existing]);

  const setField = (key: string, val: any) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const save = useMutation({
    mutationFn: (submit: boolean) =>
      submissionsService.saveOrSubmit({
        formId,
        siteId: currentUser!.site_id!,
        userId: currentUser!.id,
        reportingMonth,
        data: values,
        submit,
      }),
    onSuccess: (result, submit) => {
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success(submit ? "Form submitted" : "Draft saved");
      queryClient.invalidateQueries({ queryKey: ["submissions-by-month"] });
      queryClient.invalidateQueries({ queryKey: ["submission-for-form"] });
      if (submit) navigate({ to: "/authenticated/site" });
    },
  });

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
      {/* -mt-6 -mb-6 removes the top and bottom gaps.
        w-[100vw] and translate-x bypasses the AppShell max-width to stretch 100% 
      */}
      <div className="-mt-6 -mb-6 w-[100vw] relative left-1/2 -translate-x-1/2">
        <motion.div
          initial="hidden"
          animate="show"
          variants={containerVariants}
          className="w-full"
        >
          {/* Removed rounded corners and borders so it sits completely flush */}
          <div className="bg-card min-h-screen">
            {/* Header — Plain text, aligned with form fields */}
<motion.div
  variants={fadeUp}
  className="px-6 pt-8 sm:px-10 sm:pt-10"
>
  <div className="flex items-start justify-between gap-4">
    <div>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        Monthly Compliance Report
      </div>
      <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
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
  </div>
</motion.div>

            {/* Fields, staggered in */}
            <div className="p-6 sm:p-10">
              <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {fields.map((field: any) => {
                  const dynamicPlaceholder = `Enter ${field.label.toLowerCase()}`;

                  return (
                    <motion.div key={field.key} variants={fadeUp} className="space-y-1.5">
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
                          className="h-11 rounded-md border bg-background shadow-card transition-colors focus-visible:border-ring focus-visible:ring-ring/40"
                        />
                      )}

                      {field.type === "textarea" && (
                        <Textarea
                          disabled={isSubmitted}
                          value={values[field.key] ?? ""}
                          onChange={(e) => setField(field.key, e.target.value)}
                          placeholder={dynamicPlaceholder}
                          className="min-h-[100px] resize-none rounded-md border bg-background shadow-card transition-colors focus-visible:border-ring focus-visible:ring-ring/40"
                        />
                      )}

                      {field.type === "select" && (
                        <Select
                          disabled={isSubmitted}
                          value={values[field.key] ?? ""}
                          onValueChange={(v) => setField(field.key, v)}
                        >
                          <SelectTrigger className="h-11 rounded-md border bg-background shadow-card transition-colors focus:border-ring">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((opt: any) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.type === "checkbox" && (
                        <div className="flex h-11 items-center gap-3 rounded-md border bg-background px-4 shadow-card">
                          <Checkbox
                            id={field.key}
                            disabled={isSubmitted}
                            checked={!!values[field.key]}
                            onCheckedChange={(v) => setField(field.key, v)}
                          />
                          <label
                            htmlFor={field.key}
                            className="cursor-pointer select-none text-sm font-semibold text-muted-foreground"
                          >
                            {field.label} {field.required && "*"}
                          </label>
                        </div>
                      )}
                    </motion.div>
                  );
                })}

               <AnimatePresence>
                  {!isSubmitted && (
                    <motion.div
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                      className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row items-center justify-end gap-4 pt-8 mt-4 border-t border-border/50"
                    >
                      <Button
                        variant="ghost"
                        onClick={() => save.mutate(false)}
                        disabled={save.isPending}
                        className="w-full sm:w-auto px-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Save Draft
                      </Button>

                      <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                        <Button
                          onClick={() => save.mutate(true)}
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
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}