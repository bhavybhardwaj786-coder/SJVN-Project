import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, KeyRound, Ban, CheckCircle2, Loader2, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { usersService } from "@/services/users-service";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// 1. Listen for the ?action=create URL parameter from the Dashboard
export const Route = createFileRoute("/authenticated/users")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { action?: string } => {
    return {
      action: typeof search.action === 'string' ? search.action : undefined,
    };
  },
  component: UserManagement,
});

// 2. Added super_admin to the types
type Role = "super_admin" | "admin" | "site_user" | "contractor";
type TabRole = "admin" | "site_user" | "contractor";

function UserManagement() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabRole>("admin");
  
  // Initialize to true if coming from the dashboard's "Provision New Account" button
  const [showCreate, setShowCreate] = useState(search.action === "create");
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

  const { data: contractors, isLoading: contractorsLoading } = useQuery({
  queryKey: ["manage-contractors"],
  queryFn: () => usersService.listContractors().then((r) => r.data || []),
  enabled: isSuperAdmin,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ table, id, is_active }: { table: "admins" | "site_users" | "contractors"; id: string; is_active: boolean }) =>
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

  const rows = activeTab === "admin" ? admins : activeTab === "site_user" ? siteUsers : contractors;
  const loading = activeTab === "admin" ? adminsLoading : activeTab === "site_user" ? siteUsersLoading : contractorsLoading;

  return (
    <AppShell>
      <section className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900" style={{ fontFamily: "'Inter', 'Segoe UI', 'Arial Black', sans-serif" }}>
            Directory Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage personnel access across the platform.
          </p>
        </div>
        {!showCreate && (
          <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 font-bold shadow-md">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Provision New User
          </Button>
        )}
      </section>

      {/* INLINE FORM: Shows only when creating a user */}
      {showCreate ? (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="mb-4 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900">Provision New Account</h2>
            <p className="text-xs text-slate-500">Configure access tier and credentials below.</p>
          </div>
          
          <CreateUserInlineForm 
            sites={sites} 
            onCreated={() => {
              setShowCreate(false); // Clear the view state flag
              navigate({ to: "/authenticated/supadmin" });
              queryClient.invalidateQueries({ queryKey: ["manage-admins"] });
              queryClient.invalidateQueries({ queryKey: ["manage-site-users"] });
            }}
            onCancel={() => {
              setShowCreate(false); // 1. Turn off the form view locally
              navigate({ to: "/authenticated/supadmin" }); // 2. Route out to the main dashboard
            }}
          />
        </div>
      ) : (
        /* The Tabs and Table only show when NOT creating a user */
        <>
          {/* Styled Navigation Tabs */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              className={`rounded-md px-5 py-2 text-xs font-bold transition-all ${
                activeTab === "admin" 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              onClick={() => setActiveTab("admin")}
            >
              Administrators
            </button>
            <button
              className={`rounded-md px-5 py-2 text-xs font-bold transition-all ${
                activeTab === "site_user" 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              onClick={() => setActiveTab("site_user")}
            >
              Site Users
            </button>
            <button
              className={`rounded-md px-5 py-2 text-xs font-bold transition-all ${
                activeTab === "contractor" 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              onClick={() => setActiveTab("contractor")}
            >
              Contractors
            </button>
          </div>

          {/* Data Grid */}
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in duration-300">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-slate-700">Name</th>
                  <th className="px-5 py-4 text-slate-700">Email</th>
                  {activeTab === "admin" && <th className="px-5 py-4 text-slate-700">Role</th>}
                  {activeTab === "site_user" || activeTab === "contractor" && <th className="px-5 py-4 text-slate-700">Site Location</th>}
                  <th className="px-5 py-4 text-slate-700">Status</th>
                  <th className="px-5 py-4 text-right text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" />
                    </td>
                  </tr>
                ) : rows && rows.length ? (
                  rows.map((u: any) => (
                    <tr key={u.id} className="transition-colors hover:bg-slate-50/40">
                      <td className="px-5 py-4 font-bold text-slate-900">{u.full_name}</td>
                      <td className="px-5 py-4 font-medium text-slate-600">{u.email}</td>
                      {activeTab === "admin" && (
                        <td className="px-5 py-4">
                          {u.role === "super_admin" ? (
                            <span className="rounded-md border border-purple-100 bg-purple-50 px-2 py-1 text-xs font-bold text-purple-600">Super Admin</span>
                          ) : (
                            <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">Admin</span>
                          )}
                        </td>
                      )}
                      {activeTab === "site_user" && (
                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {u.sites?.name ? `${u.sites.name} (${u.sites.code})` : <span className="text-xs text-red-500">Unassigned</span>}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            u.is_active ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-100 text-slate-500"
                          }`}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 text-slate-700 shadow-sm hover:bg-slate-50"
                            onClick={() => setResetTarget({ id: u.id, name: u.full_name })}
                            title="Reset Password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={u.is_active ? "border-red-200 text-red-600 shadow-sm hover:bg-red-50" : "border-emerald-200 text-emerald-600 shadow-sm hover:bg-emerald-50"}
                            onClick={() =>
                              toggleActiveMutation.mutate({
                                table: activeTab === "admin" ? "admins" : activeTab === "site_users" ? "site_users" : "contractors",
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
                    <td colSpan={6} className="px-5 py-12 text-center text-sm font-medium text-slate-400">
                      No {activeTab === "admin" ? "administrators" : "site users"} mapped to the directory yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {resetTarget && (
        <ResetPasswordModal target={resetTarget} onClose={() => setResetTarget(null)} />
      )}
    </AppShell>
  );
}

// INLINE FORM COMPONENT
function CreateUserInlineForm({
  sites,
  onCancel,
  onCreated,
}: {
  sites: any[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const navigate = useNavigate();
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
        site_id: role === "site_user" || role === "contractor" ? siteId : undefined,
      }),
    onSuccess: () => {
      toast.success("User configuration created successfully");
      onCreated();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create account profile"),
  });

  const canSubmit =
    fullName.trim() &&
    email.trim() &&
    password.length >= 8 &&
    (role !== "site_user" && role !== "contractor" || siteId);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Operational Permission Tier</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
              <option value="super_admin">Super Administrator</option>
              <option value="admin">System Administrator</option>
              <option value="site_user">Site Operator</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Digvijay Thakur"
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Official Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@sjvn.com"
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-4">
          {role === "site_user" || role === "contractor" && (
            <div className="space-y-1 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-800">Assigned Station Location</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              >
                <option value="">Select a site location...</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800">Access Password</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
            <p className="mt-1.5 text-[11px] text-slate-500 leading-normal bg-slate-50 border border-slate-100 p-2.5 rounded">
              ⚠️ Note: Provide this key to the target employee directly. The password record will hash instantly and encrypt for safety.
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions footer segment inside CreateUserInlineForm */}
      <div className="mt-6 flex justify-end gap-3 pt-2">
        <Button 
          variant="outline" 
          type="button"
          onClick={() => {
            // Direct escape hatch bypass: Force-route straight back out to the main landing view
            navigate({ to: "/authenticated/supadmin" });
          }} 
          className="border-slate-300 text-slate-700 font-bold h-10 px-6"
        >
          Cancel
        </Button>
        <Button
          disabled={!canSubmit || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="bg-blue-600 hover:bg-blue-700 font-bold h-10 px-6 shadow-sm"
        >
          {createMutation.isPending ? "Issuing..." : "Create User"}
        </Button>
      </div>
    </div>
  );
}

// Kept the Reset Password modal as a popup since it's a quick, destructive action
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
      toast.success("Security configuration overwritten successfully");
      onClose();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to alter credential record"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl scale-in duration-200">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Overwrite Password</h2>
        <p className="text-xs text-slate-500 mt-0.5">Updating security token key mapping for <span className="font-bold text-slate-700">{target.name}</span></p>

        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter new token (min 8 keys)"
          className="mt-4 w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        />

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="border-slate-300 text-slate-700 font-bold">
            Cancel
          </Button>
          <Button
            disabled={password.length < 8 || resetMutation.isPending}
            onClick={() => resetMutation.mutate()}
            className="bg-blue-600 hover:bg-blue-700 font-bold shadow-sm"
          >
            {resetMutation.isPending ? "Overwriting..." : "Reset Password"}
          </Button>
        </div>
      </div>
    </div>
  );
}