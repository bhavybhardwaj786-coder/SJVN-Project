import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";

import sjvnLogo from "@/assets/sjvn-logo.jpeg";

export const Route = createFileRoute("/authenticated/site/forms/$formId")({
  ssr: false,
  component: FillForm,
});

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
      <div className="py-12 flex justify-center px-4 sm:px-6">
        
        {/* Main Form Container with Zoom-In Animation */}
        <div className="w-full max-w-3xl bg-white p-8 sm:p-12 shadow-2xl rounded-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-500 ease-out">
          
          {/* Header Section */}
          <div className="mb-10 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-5">
              {/* Logo Container */}
              <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm shrink-0">
                <img 
                  src={sjvnLogo} 
                  alt="SJVN Logo" 
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain" 
                />
              </div>
              
              {/* Form Title */}
              <h2 
                className="text-3xl sm:text-4xl font-black tracking-tighter text-[#0f172a] drop-shadow-sm"
                style={{ fontFamily: "'Inter', 'Segoe UI', 'Arial Black', sans-serif" }}
              >
                {formDef.title}
              </h2>
            </div>

            {/* Description is nested in a neat callout box */}
            {formDef.description && (
              <p className="mt-5 text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200/60 shadow-inner">
                {formDef.description}
              </p>
            )}
          </div>

          {/* Form Fields Stack */}
          <div className="space-y-6">
            {fields.map((field: any, index: number) => {
              const dynamicPlaceholder = `Enter ${field.label.toLowerCase()}`;

              return (
                <div 
                  key={field.key} 
                  // Staggered slide-in animation for each field
                  className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  {/* Clean Slate Label */}
                  {field.type !== "checkbox" && (
                    <Label className="text-slate-800 font-bold text-[14px]">
                      {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </Label>
                  )}
                  
                  {/* Minimalist Inputs with Blue Focus Rings */}
                  {["text", "number", "date"].includes(field.type) && (
                    <Input
                      type={field.type}
                      disabled={isSubmitted}
                      value={values[field.key] ?? ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder={dynamicPlaceholder}
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 h-11 rounded-md shadow-sm transition-all hover:border-slate-400"
                    />
                  )}

                  {field.type === "textarea" && (
                    <Textarea
                      disabled={isSubmitted}
                      value={values[field.key] ?? ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder={dynamicPlaceholder}
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 min-h-[120px] resize-y rounded-md shadow-sm transition-all hover:border-slate-400"
                    />
                  )}

                  {field.type === "select" && (
                    <Select
                      disabled={isSubmitted}
                      value={values[field.key] ?? ""}
                      onValueChange={(v) => setField(field.key, v)}
                    >
                      <SelectTrigger className="bg-white border-slate-300 h-11 text-slate-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 transition-all hover:border-slate-400">
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
                    <label 
                      htmlFor={field.key} 
                      className="flex items-center h-12 gap-3 px-4 rounded-md border border-slate-300 bg-slate-50 shadow-sm transition-colors hover:bg-slate-100 cursor-pointer"
                    >
                      <Checkbox
                        id={field.key}
                        disabled={isSubmitted}
                        checked={!!values[field.key]}
                        onCheckedChange={(v) => setField(field.key, v)}
                        className="border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <span className="text-sm text-slate-800 font-bold select-none flex-1">
                        {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                      </span>
                    </label>
                  )}
                </div>
              );
            })}

            {/* Submit & Save Draft Buttons */}
            {!isSubmitted && (
              <div 
                className="pt-8 mt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                style={{ animationDelay: `${fields.length * 75 + 100}ms` }}
              >
                <Button 
                  onClick={() => save.mutate(true)} 
                  disabled={save.isPending}
                  className="w-full sm:w-auto flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-[15px] rounded-md shadow-md transition-all active:scale-[0.98]"
                >
                  Submit Form
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => save.mutate(false)} 
                  disabled={save.isPending}
                  className="w-full sm:w-auto flex-1 border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-bold h-12 text-[15px] rounded-md transition-all active:scale-[0.98]"
                >
                  Save Draft
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}