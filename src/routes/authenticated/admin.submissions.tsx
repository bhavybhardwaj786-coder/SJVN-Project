import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileDown, FileText, Search, Printer } from "lucide-react";

import { supabase } from "@/integrations/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/authenticated/admin/submissions")({
  ssr: false,
  component: AdminSubmissions,
});

type Row = {
  id: string;
  status: string;
  reporting_month: string | null;
  submitted_at: string | null;
  updated_at: string;
  data: Record<string, unknown>;
  remarks: string | null;
  forms: { name: string; code: string } | null;
  sites: { id: string; name: string; code: string } | null;
  profiles: { full_name: string | null; email: string | null } | null;
};

function AdminSubmissions() {
  const [q, setQ] = useState("");
  const [siteId, setSiteId] = useState<string>("all");
  const [month, setMonth] = useState<string>("");
  const [status, setStatus] = useState<string>("all");

  const { data: sites } = useQuery({
    queryKey: ["all-sites"],
    queryFn: async () => (await supabase.from("sites").select("id, name, code").order("code")).data ?? [],
  });

  const { data: rows } = useQuery({
    queryKey: ["all-submissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select(
          "id, status, reporting_month, submitted_at, updated_at, data, remarks, forms(name, code), sites(id, name, code), profiles(full_name, email)",
        )
        .order("updated_at", { ascending: false });
      return (data ?? []) as unknown as Row[];
    },
  });

  const filtered = useMemo(() => {
    return (rows ?? []).filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (siteId !== "all" && r.sites?.id !== siteId) return false;
      if (month && (!r.reporting_month || !r.reporting_month.startsWith(month))) return false;
      if (q) {
        const t = q.toLowerCase();
        if (
          !`${r.forms?.name ?? ""} ${r.sites?.name ?? ""} ${r.profiles?.full_name ?? ""} ${r.profiles?.email ?? ""}`
            .toLowerCase()
            .includes(t)
        )
          return false;
      }
      return true;
    });
  }, [rows, q, siteId, month, status]);

  function exportCSV() {
    const header = [
      "Form",
      "Site",
      "User",
      "Email",
      "Month",
      "Status",
      "Submitted",
      "Data",
      "Remarks",
    ];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          r.forms?.name ?? "",
          r.sites?.name ?? "",
          r.profiles?.full_name ?? "",
          r.profiles?.email ?? "",
          r.reporting_month ?? "",
          r.status,
          r.submitted_at ?? "",
          JSON.stringify(r.data),
          r.remarks ?? "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ememp-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPDF() {
    window.print();
  }

  const selectedSite = sites?.find((s) => s.id === siteId);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold">All Submissions</h1>
          <p className="text-sm text-muted-foreground">
            View, filter and export environmental data from all sites.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <FileDown className="h-4 w-4 mr-1" /> Export Excel/CSV
          </Button>
          <Button onClick={printPDF}>
            <Printer className="h-4 w-4 mr-1" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 shadow-card md:grid-cols-4 no-print">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search form, site, user…"
            className="pl-9"
          />
        </div>
        <Select value={siteId} onValueChange={setSiteId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {sites?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.code} · {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <div className="text-xl font-bold">SJVN Limited · EMEMP Report</div>
        <div className="text-sm text-muted-foreground">
          {selectedSite ? `${selectedSite.name} · ` : ""}
          {month ? new Date(month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "All periods"}
        </div>
        <div className="text-xs text-muted-foreground">Generated {new Date().toLocaleString()}</div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Form</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-brand" />
                      {r.forms?.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.sites?.name}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.profiles?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{r.profiles?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {r.reporting_month
                      ? new Date(r.reporting_month).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        r.status === "submitted"
                          ? "bg-success/15 text-success"
                          : "bg-warning/20 text-warning-foreground"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex flex-wrap gap-1 text-xs">
                      {Object.entries(r.data ?? {}).slice(0, 6).map(([k, v]) => (
                        <span
                          key={k}
                          className="rounded bg-muted px-1.5 py-0.5"
                          title={`${k}: ${String(v)}`}
                        >
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {k}:
                          </span>{" "}
                          {String(v)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No submissions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
