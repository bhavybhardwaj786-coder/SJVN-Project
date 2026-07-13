import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowLeft, Download, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/client";

export const Route = createFileRoute("/authenticated/$submissionId")({
  ssr: false,
  component: SubmissionDetail,
});


type SubmissionDetailRow = {
  id: string;
  status: string;
  data: Record<string, any>;
  submitted_at: string | null;
  updated_at: string;
  reporting_month: string;
  user_id: string;
  form_id: string;
  site_id: string;
  forms: { id: string; title: string; description: string | null; schema: any } | null;
  sites: { id: string; name: string; code: string } | null;
};

function SubmissionDetail() {
  const { submissionId } = Route.useParams();
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["submission-detail", submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          id, status, data, submitted_at, updated_at, reporting_month, user_id, form_id, site_id,
          forms(id, title, description, schema),
          sites(id, name, code)
        `)
        .eq("id", submissionId)
        .single();
      if (error) throw error;
      return data as unknown as SubmissionDetailRow;
    },
  });

  const { data: submittedByName } = useQuery({
    queryKey: ["submission-user-name", data?.user_id],
    queryFn: async () => {
      if (!data?.user_id) return null;
      const { data: u, error } = await supabase
        .from("site_users")
        .select("full_name")
        .eq("id", data.user_id)
        .maybeSingle();
      if (error) throw error;
      return u?.full_name ?? null;
    },
    enabled: !!data?.user_id,
  });

  const handleDownloadPdf = async () => {
    if (!printRef.current || !data) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${data.forms?.title ?? "form"}-${data.sites?.code ?? "site"}-${data.reporting_month}.pdf`
        .replace(/\s+/g, "_");
      pdf.save(fileName);
    } catch (err) {
      console.error(err);
      toast.error("Could not generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <p className="text-destructive">Submission not found.</p>
      </AppShell>
    );
  }

  const fields = data.forms?.schema?.fields || [];
  const values = data.data || {};

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/authenticated/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Download PDF
        </button>
      </div>

      <div ref={printRef} className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-card">
        <div className="mb-6 flex items-start justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Environmental Compliance Form
            </div>
            <h1 className="mt-1 text-xl font-bold">{data.forms?.title}</h1>
            {data.forms?.description && (
              <p className="mt-1 text-sm text-muted-foreground">{data.forms.description}</p>
            )}
          </div>
          <StatusBadgeLocal status={data.status} />
        </div>

        <dl className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Site</dt>
            <dd className="font-medium">
              {data.sites?.name} {data.sites?.code && `(${data.sites.code})`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Reporting Month</dt>
            <dd className="font-medium">
              {new Date(data.reporting_month).toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Submitted By</dt>
            <dd className="font-medium">{submittedByName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Submitted On</dt>
            <dd className="font-medium">
              {data.submitted_at ? new Date(data.submitted_at).toLocaleString() : "—"}
            </dd>
          </div>
        </dl>

        <div className="space-y-4 border-t pt-4">
          {fields.map((field: any) => (
            <div key={field.key} className="grid grid-cols-3 gap-3 text-sm">
              <dt className="col-span-1 text-muted-foreground">{field.label}</dt>
              <dd className="col-span-2 font-medium">{formatFieldValue(field, values[field.key])}</dd>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">This form has no fields defined.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function formatFieldValue(field: any, value: any) {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "checkbox") return value ? "Yes" : "No";
  if (field.type === "select") {
    const opt = field.options?.find((o: any) => o.value === value);
    return opt?.label ?? value;
  }
  return String(value);
}

function StatusBadgeLocal({ status }: { status: string }) {
  const cls =
    status === "submitted"
      ? "bg-success/15 text-success"
      : status === "draft"
      ? "bg-blue-500/15 text-blue-600"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}