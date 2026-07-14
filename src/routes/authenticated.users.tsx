import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, KeyRound, Ban, CheckCircle2, Loader2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { usersService } from "@/services/users-service";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/authenticated/users")({
  ssr: false,
  component: UserManagement,
});

type Role = "admin" | "site_user";

function UserManagement() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Role>("admin");
  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);

  const isSuperAdmin = currentUser?.role === "super_admin";

  const { data: sitesResult } = useQuery({
    queryKey: ["all-sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("id, name, code").order("name");
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });
  const sites = sitesResult || [];

  const { data: admins, isLoading: adminsLoading } = useQuery({
    queryKey: ["manage-admins"],
    queryFn: () => usersService.listAdmins().then((r) => r.data || []),
    enabled: isSuperAdmin,
  });

  const { data: siteUsers, isLoading: siteUsersLoading } = useQuery({
    queryKey: ["manage-site-users"],
    queryFn: () => usersService.listSiteUsers().then((r) => r.data || []),
    enabled: isSuperAdmin,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ table, id, is_active }: { table: "admins" | "site_users"; id: string; is_active: boolean }) =>
      usersService.setActive(table, id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-admins"] });
      queryClient.invalidateQueries({ queryKey: ["manage-site-users"] });
      toast.success("Status updated");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  if (!currentUser) {
    return (
      <AppShell>
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AppShell>
        <div className="rounded-xl border bg-card p-8 text-center shadow-card">
          <p className="text-sm text-muted-foreground">
            You don't have permission to view this page.
          </p>
        </div>
      </AppShell>
    );
  }

  const rows = activeTab === "admin" ? admins : siteUsers;
  const loading = activeTab === "admin" ? adminsLoading : siteUsersLoading;

  return (
    <AppShell>
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Users</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage admin and site user accounts.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          New User
        </Button>
      </section>

      <div className="mt-6 inline-flex rounded-lg border bg-card p-1 shadow-card">
        <button
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            activeTab === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("admin")}
        >
          Admins
        </button>
        <button
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            activeTab === "site_user" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("site_user")}
        >
          Site Users
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              {activeTab === "site_user" && <th className="px-4 py-3">Site</th>}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            ) : rows && rows.length ? (
              rows.map((u: any) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  {activeTab === "site_user" && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.sites?.name ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setResetTarget({ id: u.id, name: u.full_name })}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={u.is_active ? "text-destructive hover:bg-destructive/10" : "text-success"}
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            table: activeTab === "admin" ? "admins" : "site_users",
                            id: u.id,
                            is_active: !u.is_active,
                          })
                        }
                      >
                        {u.is_active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No {activeTab === "admin" ? "admins" : "site users"} yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserModal
          sites={sites}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ["manage-admins"] });
            queryClient.invalidateQueries({ queryKey: ["manage-site-users"] });
          }}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal target={resetTarget} onClose={() => setResetTarget(null)} />
      )}
    </AppShell>
  );
}

function CreateUserModal({
  sites,
  onClose,
  onCreated,
}: {
  sites: { id: string; name: string; code: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [role, setRole] = useState<Role>("admin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [siteId, setSiteId] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      usersService.createUser({
        role,
        full_name: fullName,
        email,
        password,
        site_id: role === "site_user" ? siteId : undefined,
      }),
    onSuccess: () => {
      toast.success("User created");
      onCreated();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create user"),
  });

  const canSubmit =
    fullName.trim() &&
    email.trim() &&
    password.length >= 8 &&
    (role === "admin" || siteId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-elevated">
        <h2 className="text-lg font-semibold">New User</h2>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="site_user">Site User</option>
            </select>
          </div>

          {role === "site_user" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Site</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a site…</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Share this password with the user directly. It won't be shown again here.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Creating…" : "Create User"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({
  target,
  onClose,
}: {
  target: { id: string; name: string };
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");

  const resetMutation = useMutation({
    mutationFn: () => usersService.resetPassword(target.id, password),
    onSuccess: () => {
      toast.success("Password reset");
      onClose();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to reset password"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-elevated">
        <h2 className="text-lg font-semibold">Reset Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">for {target.name}</p>

        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min 8 characters)"
          className="mt-4 w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={password.length < 8 || resetMutation.isPending}
            onClick={() => resetMutation.mutate()}
          >
            {resetMutation.isPending ? "Saving…" : "Reset Password"}
          </Button>
        </div>
      </div>
    </div>
  );
}