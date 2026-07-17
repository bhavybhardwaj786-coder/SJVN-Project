import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileStack,
  LogOut,
  Menu,
  Shield,
  Building2,
  Users,
  ClipboardList,
  FormInput,
  Home,
  ShieldCheck,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import sjvnLogo from "@/assets/sjvn-logo.jpeg";

async function fetchMe() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  // Check role tables directly — there is no unified `profiles` /
  // `user_roles` table in this schema, just super_admins / admins / site_users.
  // Check role tables directly — there is no unified `profiles` /
  // `user_roles` table in this schema, just super_admins / admins / site_users.
  const [
    { data: superAdmin, error: superAdminError },
    { data: admin, error: adminError },
    { data: siteUser, error: siteUserError },
  ] = await Promise.all([
    supabase.from("super_admins").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("admins").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("site_users")
      .select("*, site_assignments(site_id, sites!fk_site_assignments_site(id, code, name, location))") // 🚀 FIXED: Using explicit FK name from your error logs
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (superAdminError) console.error("super_admins lookup failed:", superAdminError);
  if (adminError) console.error("admins lookup failed:", adminError);
  if (siteUserError) console.error("site_users lookup failed:", siteUserError);

  const isSuperAdmin = !!superAdmin;
  const isAdmin = isSuperAdmin || !!admin;

  const profile = superAdmin ?? admin ?? siteUser ?? null;

  const sites = (siteUser?.site_assignments ?? [])
    .map((a: any) => a.sites)
    .filter(Boolean) as { id: string; code: string; name: string; location: string | null }[];

  return {
    user,
    profile,
    isAdmin,
    isSuperAdmin,
    sites,
  };
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: fetchMe });
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const nav = me?.isSuperAdmin
    ? [
        // { to: "/authenticated/supadmin", label: "Super Admin Dashboard", icon: ShieldCheck, exact: true },
        // { to: "/authenticated/users", label: "User Management", icon: Users },
      ]
    : me?.isAdmin
    ? [
        // { to: "/authenticated/app", label: "Admin Dashboard", icon: LayoutDashboard, exact: true },
        // { to: "/authenticated/new", label: "Form Builder", icon: FormInput },
      ]
    : [];

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // --- Dynamic Breadcrumb Logic ---
  const dashboardLink = me?.isSuperAdmin
    ? "/authenticated/supadmin"
    : me?.isAdmin
    ? "/authenticated/app"
    : "/authenticated/site";

  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.filter((item) => !["authenticated", "site", "forms", "users"].includes(item));

  const formatSegmentName = (str: string) => {
    if (!str) return "";
    if (str.length > 24 && str.includes("-")) return "Details";
    return str.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <div className="min-h-full flex-1 flex flex-col bg-[#eaeff2] font-sans relative overflow-x-hidden">
      {/* 2. Header */}
      <header className="sticky top-0 z-30 w-full flex flex-col shadow-sm no-print bg-white">
        <div className="bg-gradient-to-r from-white to-sky-50 py-4 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center border-b border-sky-100 gap-4 relative z-10">
          {/* Left Side: Logo and Titles */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-[#095a7d]"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex items-center gap-4 transition-opacity duration-150 hover:opacity-90 text-left"
            >
              <div className="bg-white p-1.5 rounded border border-gray-200 shadow-sm flex-shrink-0">
                <img
                  src={sjvnLogo}
                  alt="SJVN Logo"
                  className="w-16 h-16 md:w-[72px] md:h-[72px] object-contain"
                />
              </div>
              <div className="flex flex-col text-gray-800">
                <h1 className="text-2xl md:text-[28px] font-extrabold text-blue-700 tracking-tight leading-tight">
                  SJVN Limited
                </h1>
                <p className="text-xs md:text-sm font-semibold mt-0.5 text-gray-700">
                  (A Joint Venture of Govt. of India & Govt. of Himachal Pradesh)
                </p>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">
                  ISO 9001:2015 Certified · CIN: L40101HP1988GOI008409
                </p>
              </div>
            </button>
          </div>

          {/* Right Side: Breadcrumbs and Admin Badge */}
          <div className="hidden md:flex flex-col items-end gap-2">

            {me?.isSuperAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-brand">
                <ShieldCheck className="h-3.5 w-3.5" /> Super Admin
              </span>
            ) : me?.isAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-brand">
                <Shield className="h-3.5 w-3.5" /> Administrator
              </span>
            ) : null}
          </div>
        </div>

        {/* Bottom Navigation Teal Bar */}
        {/* Bottom Navigation Bar */}
        <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-4 md:px-8 flex justify-between items-center h-12 shadow-sm relative z-10">
          

          <div className="flex-1 overflow-hidden mx-4 flex items-center h-full cursor-default">
            <div className="text-white text-sm font-semibold whitespace-nowrap">
              Welcome to SJVN Limited — Business Responsibility and Sustainability Reporting Portal
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 pl-4 border-l border-white/25">
            <div className="hidden text-right md:block text-white">
              <div className="text-xs font-semibold">{me?.profile?.full_name ?? me?.user?.email}</div>
              <div className="text-[10px] text-white/80">{me?.user?.email}</div>
            </div>

            <button
              onClick={signOut}
              className="bg-[#ffb600] hover:bg-[#e0a100] transition-colors text-black font-bold py-1.5 px-4 rounded text-xs shadow-sm flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* 3. Main Workspace Area */}
      <div className="relative flex-1 w-full">

        <div
          className={cn(
            "w-full grid gap-6 px-4 py-6 relative z-10",
            nav.length === 0 ? "grid-cols-1" : "lg:grid-cols-[240px_1fr]"
          )}
        >
          {nav.length > 0 && (
            <aside className={cn("no-print lg:block", open ? "block" : "hidden")}>
              <nav className="rounded-xl border bg-white/95 backdrop-blur-sm p-3 shadow-sm">
                <ul className="space-y-0.5">
                  {nav.map((item) => {
                    const active = item.exact
                      ? pathname === item.to
                      : pathname === item.to || pathname.startsWith(item.to + "/");
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                            active
                              ? "bg-sky-50 text-blue-700 font-bold"
                              : "text-foreground/80 hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>
          )}

          <main className="min-w-0 w-full">{children}</main>
        </div>
      </div>
    </div>
  );
}