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
      {/* Outer container keeps the default transparent app background */}
      <div className="py-8 flex justify-center">
        
        {/* The Form Box - Now with the light purple background */}
        <div className="w-full max-w-[450px] bg-[#eae8f4] p-8 sm:p-10 shadow-md rounded-xl border border-[#d4d4dc]">
          
          {/* Dark Purple Title */}
          <div className="mb-8 text-left">
            <h2 className="text-2xl font-extrabold text-[#1d1442]">
              {formDef.title}
            </h2>
            {formDef.description && (
              <p className="text-sm text-[#5a5575] mt-1.5">{formDef.description}</p>
            )}
          </div>

          {/* 1-Column Stack Layout */}
          <div className="space-y-5">
            {fields.map((field: any) => {
              const dynamicPlaceholder = `Enter ${field.label.toLowerCase()}`;

              return (
                <div key={field.key} className="space-y-1.5">
                  
                  {/* Grey-purple label above the input */}
                  {field.type !== "checkbox" && (
                    <Label className="text-[#5a5575] font-semibold text-sm">
                      {field.label}{field.required && '*'}
                    </Label>
                  )}
                  
                  {/* Inputs now use pure white background against the purple box */}
                  {["text", "number", "date"].includes(field.type) && (
                    <Input
                      type={field.type}
                      disabled={isSubmitted}
                      value={values[field.key] ?? ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder={dynamicPlaceholder}
                      className="bg-white border-[#d4d4dc] text-gray-800 placeholder:text-gray-400 focus-visible:ring-[#1d1442] h-11 rounded-md shadow-sm"
                    />
                  )}

                  {field.type === "textarea" && (
                    <Textarea
                      disabled={isSubmitted}
                      value={values[field.key] ?? ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder={dynamicPlaceholder}
                      className="bg-white border-[#d4d4dc] text-gray-800 placeholder:text-gray-400 focus-visible:ring-[#1d1442] min-h-[100px] resize-none rounded-md shadow-sm"
                    />
                  )}

                  {field.type === "select" && (
                    <Select
                      disabled={isSubmitted}
                      value={values[field.key] ?? ""}
                      onValueChange={(v) => setField(field.key, v)}
                    >
                      <SelectTrigger className="bg-white border-[#d4d4dc] h-11 text-gray-600 rounded-md shadow-sm focus:ring-[#1d1442]">
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
                    <div className="flex items-center h-11 gap-3 px-4 rounded-md border border-[#d4d4dc] bg-white shadow-sm">
                      <Checkbox
                        id={field.key}
                        disabled={isSubmitted}
                        checked={!!values[field.key]}
                        onCheckedChange={(v) => setField(field.key, v)}
                      />
                      <label htmlFor={field.key} className="text-sm text-[#5a5575] font-semibold cursor-pointer select-none">
                         {field.label} {field.required && '*'}
                      </label>
                    </div>
                  )}
                </div>
              );
            })}

            {!isSubmitted && (
              <div className="pt-6 flex flex-col gap-3">
                {/* Dark Purple Submit Button */}
                <Button 
                  onClick={() => save.mutate(true)} 
                  disabled={save.isPending}
                  className="w-full bg-[#1c1340] hover:bg-[#120c29] text-white font-bold h-12 text-[15px] rounded-md shadow-md transition-all active:scale-[0.98]"
                >
                  Submit Form
                </Button>
                
                {/* Save Draft Text Button */}
                <Button 
                  variant="ghost" 
                  onClick={() => save.mutate(false)} 
                  disabled={save.isPending}
                  className="w-full text-[#5a5575] hover:text-[#1d1442] hover:bg-[#dcd9e8]"
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