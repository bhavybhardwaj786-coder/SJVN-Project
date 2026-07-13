import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { formsService, submissionsService } from "@/services";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

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
        <p className="text-muted-foreground">Loading form…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{formDef.title}</CardTitle>
          {formDef.description && (
            <p className="text-sm text-muted-foreground">{formDef.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {fields.map((field: any) => (
            <div key={field.key} className="space-y-1.5">
              <Label>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>

              {["text", "number", "date"].includes(field.type) && (
                <Input
                  type={field.type}
                  disabled={isSubmitted}
                  value={values[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              )}

              {field.type === "textarea" && (
                <Textarea
                  disabled={isSubmitted}
                  value={values[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              )}

              {field.type === "select" && (
                <Select
                  disabled={isSubmitted}
                  value={values[field.key] ?? ""}
                  onValueChange={(v) => setField(field.key, v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
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
                <Checkbox
                  disabled={isSubmitted}
                  checked={!!values[field.key]}
                  onCheckedChange={(v) => setField(field.key, v)}
                />
              )}
            </div>
          ))}

          {!isSubmitted && (
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>
                Save Draft
              </Button>
              <Button onClick={() => save.mutate(true)} disabled={save.isPending}>
                Submit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}