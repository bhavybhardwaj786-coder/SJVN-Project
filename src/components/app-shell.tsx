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
import { HeroCarousel } from "@/components/public/hero-carousel";

async function fetchMe() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

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
      .select("*, site_assignments(site_id, sites(id, code, name, location))")
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

  const isUserDashboard = pathname === "/authenticated/site" || pathname === "/authenticated/site/";

  const nav = me?.isSuperAdmin
    ? [
        { to: "/authenticated/supadmin", label: "Super Admin Dashboard", icon: ShieldCheck, exact: true },
        { to: "/authenticated/users", label: "User Management", icon: Users },
      ]
    : me?.isAdmin
    ? [
        { to: "/authenticated/app", label: "Admin Dashboard", icon: LayoutDashboard, exact: true },
        { to: "/authenticated/new", label: "Form Builder", icon: FormInput },
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
    <div className="min-h-screen bg-[#eaeff2] flex flex-col font-sans relative overflow-x-hidden">
      {/* 2. Header */}
      <header className="sticky top-0 z-30 w-full flex flex-col shadow-sm no-print bg-white">
        <div className="bg-gradient-to-r from-white to-[#dceaf0] py-4 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center border-b border-gray-200 gap-4 relative z-10">
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

            <div className="bg-white p-1.5 rounded border border-gray-200 shadow-sm flex-shrink-0">
              <img
                src={sjvnLogo}
                alt="SJVN Logo"
                className="w-16 h-16 md:w-[72px] md:h-[72px] object-contain"
              />
            </div>
            <div className="flex flex-col text-gray-800">
              <h1 className="text-2xl md:text-[28px] font-extrabold text-[#095a7d] tracking-tight leading-tight">
                SJVN Limited
              </h1>
              <p className="text-xs md:text-sm font-semibold mt-0.5 text-gray-700">
                (A Joint Venture of Govt. of India & Govt. of Himachal Pradesh)
              </p>
              <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">
                ISO 9001:2015 Certified · CIN: L40101HP1988GOI008409
              </p>
            </div>
          </div>

          {/* Right Side: Breadcrumbs and Admin Badge */}
          <div className="hidden md:flex flex-col items-end gap-2">
            <nav className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white/60 px-3 py-1.5 rounded-md border border-white/40 shadow-sm backdrop-blur-sm">
              <Link
                to={dashboardLink}
                className="hover:text-[#095a7d] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LayoutDashboard className="h-3.5 w-3.5 mb-0.5" />
                Dashboard
              </Link>

              {breadcrumbs.length > 0 && <span className="text-gray-400 text-xs">»</span>}

              {/* Renders sub-pages cleanly (like User Management or Form Builder) without getting tangled */}
              {breadcrumbs.filter(item => !["supadmin", "app", "site"].includes(item)).map((name) => {
                const displayName = formatSegmentName(name);
                return (
                  <div key={name} className="flex items-center gap-1.5">
                    <span className="text-gray-400 text-xs">»</span>
                    <span className="text-[#095a7d] font-bold">{displayName}</span>
                  </div>
                );
              })}
            </nav>

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
        <div className="bg-[#227b96] px-4 md:px-8 flex justify-between items-center h-12 shadow-sm relative z-10">
          <div className="h-full flex items-center pr-4 border-r border-[#3a8da6] shrink-0">
            <Link to="/" className="text-white hover:text-gray-200 transition-colors" aria-label="Go to Public Home Page">
              <Home size={20} />
            </Link>
          </div>

          <div className="flex-1 overflow-hidden mx-4 flex items-center h-full cursor-default">
            <div className="text-white text-sm font-semibold whitespace-nowrap">
              Welcome to SJVN Limited — Environmental Monitoring & Expenditure Management Portal
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 pl-4 border-l border-[#3a8da6]">
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
        {isUserDashboard && (
          <div className="absolute top-0 left-0 w-full h-[450px] z-0 overflow-hidden shadow-sm">
            <HeroCarousel />
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#eaeff2] to-transparent" />
          </div>
        )}

        <div
          className={cn(
            "mx-auto grid max-w-[1400px] gap-6 px-4 py-6 relative z-10",
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
                              ? "bg-[#eaf3f6] text-[#095a7d] font-bold"
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