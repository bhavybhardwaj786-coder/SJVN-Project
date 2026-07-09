import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/client";
import { AppShell, useMe } from "@/components/app-shell";
import { StatusBadge } from "./app";

export const Route = createFileRoute("/authenticated/submissions")({
  ssr: false,
  component: MySubmissions,
});

function MySubmissions() {
  const { data: me } = useMe();
  const { data } = useQuery({
    queryKey: ["my-submissions", me?.user.id],
    enabled: !!me?.user.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, status, reporting_month, submitted_at, updated_at, forms(name), sites(name)")
        .eq("user_id", me!.user.id)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Submissions</h1>
        <p className="text-sm text-muted-foreground">
          All forms you've saved as drafts or submitted.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Form</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {data?.length ? (
              data.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{r.forms?.name}</td>
                  <td className="px-4 py-3">{r.sites?.name}</td>
                  <td className="px-4 py-3">
                    {r.reporting_month
                      ? new Date(r.reporting_month).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>
                  No submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
