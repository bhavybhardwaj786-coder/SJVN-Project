import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileStack,
  Clock,
  CheckCircle2,
  Activity,
  type LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

import { sitesService, submissionsService, formsService } from "@/services/index";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/authenticated/admin/")({
  ssr: false,
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [sitesRes, formsRes, subsRes] = await Promise.all([
        sitesService.getSites(),
        formsService.getActiveForms(),
        submissionsService.getMySubmissions(),
      ]);

      const submissions = subsRes.data ?? [];
      const bySite: Record<string, number> = {};
      const byMonth: Record<string, number> = {};

      for (const s of submissions) {
        const siteName = s.sites?.name ?? "—";
        bySite[siteName] = (bySite[siteName] || 0) + 1;

        if (s.reporting_month) {
          const key = new Date(s.reporting_month).toLocaleDateString("en-IN", {
            month: "short",
            year: "2-digit",
          });
          byMonth[key] = (byMonth[key] || 0) + 1;
        }
      }

      return {
        siteCount: sitesRes.data?.length ?? 0,
        formCount: formsRes.data?.length ?? 0,
        pending: submissions.filter((s: any) => s.status === "draft").length,
        submitted: submissions.filter((s: any) => s.status === "submitted").length,
        siteChart: Object.entries(bySite).map(([name, count]) => ({ name, count })),
        monthChart: Object.entries(byMonth)
          .sort()
          .map(([month, count]) => ({ month, count })),
      };
    },
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Administrator Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of all sites, forms and submissions across SJVN.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Total Sites" value={stats?.siteCount ?? 0} tone="brand" />
        <StatCard icon={FileStack} label="Total Forms" value={stats?.formCount ?? 0} tone="brand-2" />
        <StatCard icon={Clock} label="Pending / Drafts" value={stats?.pending ?? 0} tone="warning" />
        <StatCard
          icon={CheckCircle2}
          label="Submitted Reports"
          value={stats?.submitted ?? 0}
          tone="success"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Submissions by Site</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.siteChart ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60}/>
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Monthly Submissions</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.monthChart ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-brand-2)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone: "brand" | "brand-2" | "warning" | "success";
}) {
  const toneMap = {
    brand: "bg-primary-soft text-brand",
    "brand-2": "bg-accent text-accent-foreground",
    warning: "bg-warning/20 text-warning-foreground",
    success: "bg-success/15 text-success",
  } as const;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 text-3xl font-bold">{value}</div>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-lg ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}