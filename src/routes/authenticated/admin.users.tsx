import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/authenticated/admin/users")({
  ssr: false,
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profiles, roles, assignments, sites] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("site_assignments").select("user_id, site_id, sites(name, code)"),
        supabase.from("sites").select("id, name, code").order("code"),
      ]);
      return {
        profiles: profiles.data ?? [],
        roles: roles.data ?? [],
        assignments: assignments.data ?? [],
        sites: sites.data ?? [],
      };
    },
  });

  const [assigning, setAssigning] = useState<Record<string, string>>({});

  async function assign(userId: string) {
    const siteId = assigning[userId];
    if (!siteId) return;
    const { error } = await supabase
      .from("site_assignments")
      .insert({ user_id: userId, site_id: siteId });
    if (error) return toast.error(error.message);
    toast.success("Site assigned");
    setAssigning((a) => ({ ...a, [userId]: "" }));
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function unassign(userId: string, siteId: string) {
    const { error } = await supabase
      .from("site_assignments")
      .delete()
      .eq("user_id", userId)
      .eq("site_id", siteId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function toggleAdmin(userId: string, isAdmin: boolean) {
    const { error } = isAdmin
      ? await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin")
      : await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">Create, manage and assign users to SJVN project sites.</p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Assigned Site</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.profiles.map((p) => {
              const isAdmin = data.roles.some((r) => r.user_id === p.id && r.role === "admin");
              const mySites = data.assignments.filter((a) => a.user_id === p.id);
              return (
                <tr key={p.id} className="border-t align-top">
                  <td className="px-4 py-3 font-medium">{p.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {mySites.map((a) => (
                        <button
                          key={a.site_id}
                          onClick={() => unassign(p.id, a.site_id)}
                          className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-brand hover:bg-destructive/10 hover:text-destructive"
                          title="Click to unassign"
                        >
                          {a.sites?.code} ✕
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full bg-brand text-white px-2 py-1 text-xs"
                    >
                      {isAdmin ? "Environment Admin" : "Site User"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={assigning[p.id] ?? ""}
                        onValueChange={(v) => setAssigning((a) => ({ ...a, [p.id]: v }))}
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue placeholder="Select Site" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.sites
                            .filter((s) => !mySites.some((a) => a.site_id === s.id))
                            .map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.code} · {s.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => assign(p.id)}>
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleAdmin(p.id, isAdmin)}
                      >
                        {isAdmin ? "Make Site User" : "Promote to Environment Admin"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
