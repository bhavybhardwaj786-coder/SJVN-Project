import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, Send, Paperclip } from "lucide-react";

import { formsService, submissionsService, documentsService } from "@/services";
import { AppShell, useMe } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/authenticated/forms/$formId")({
  ssr: false,
  component: FormPage,
});

function FormPage() {
  const { formId } = Route.useParams();
  const { data: me } = useMe();
  const navigate = useNavigate();

  const { data: form } = useQuery({
    queryKey: ["form", formId],
    queryFn: () => formsService.getFormById(formId),
  });

  const [siteId, setSiteId] = useState<string>("");
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [values, setValues] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (me?.sites?.length && !siteId) setSiteId(me.sites[0].id);
  }, [me, siteId]);

  async function save(status: "draft" | "submitted") {
    if (!siteId) return toast.error("Please select a site.");

    if (status === "submitted") {
      const missing = form?.schema?.fields
        ?.filter((f: any) => f.required)
        .find((f: any) => !values[f.name]);
      if (missing) return toast.error("Please fill all required fields.");
    }

    setSaving(true);

    const submissionData = {
      form_id: formId,
      site_id: siteId,
      reporting_month: month ? `${month}-01` : null,
      data: values,
      remarks,
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    };

    const { data: submission, error } = await submissionsService.createSubmission(submissionData);

    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }

    // Upload file if selected
    if (file && submission?.id) {
      await documentsService.uploadDocument(file, submission.id);
    }

    toast.success(status === "submitted" ? "Submitted for review" : "Draft saved");
    navigate({ to: "/submissions" });
    setSaving(false);
  }

  return (
    <AppShell>
      <div className="mb-4">
        <Link
          to="/app"
          className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <div className="border-b pb-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Environmental Form
          </div>
          <h1 className="text-2xl font-bold">{form?.title ?? "Loading…"}</h1>
          {form?.description && (
            <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Site</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {me?.sites?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reporting Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </div>

        {/* Dynamic Form Fields */}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Parameters
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {form?.schema?.fields?.map((f: any) => (
              <div key={f.name} className="space-y-2">
                <Label>
                  {f.label}
                  {f.required && <span className="ml-1 text-destructive">*</span>}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={values[f.name] ?? ""}
                    onChange={(e) => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                  />
                ) : (
                  <Input
                    type={f.type || "text"}
                    value={values[f.name] ?? ""}
                    onChange={(e) => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks..."
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Supporting Document
            </Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">
          <Button variant="outline" disabled={saving} onClick={() => save("draft")}>
            <Save className="h-4 w-4 mr-1.5" /> Save Draft
          </Button>
          <Button disabled={saving} onClick={() => save("submitted")}>
            <Send className="h-4 w-4 mr-1.5" /> Submit
          </Button>
        </div>
      </div>
    </AppShell>
  );
}