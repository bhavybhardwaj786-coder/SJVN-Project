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

import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import sjvnLogo from "@/assets/sjvn-logo.jpeg";
import headerBg from "@/assets/image.png";

// Replaces the old fetchMe, which had its own independent copy of the 4-table
// role lookup and queried a `site_assignments` table that no longer exists
// (dropped in Step 1 as dead code — this was already silently broken before
// this migration). Now backed by the same authService everything else uses.
async function fetchMe() {
  const user = await authService.getCurrentUser();
  if (!user) return null;

  return {
    user: { email: user.email },
    profile: { full_name: user.full_name },
    isAdmin: user.role === "admin" || user.role === "super_admin",
    isSuperAdmin: user.role === "super_admin",
    sites: user.site_id ? [{ id: user.site_id }] : [],
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
    await authService.signOut();
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
    <div className="flex-1 flex flex-col bg-[#eaeff2] font-sans relative overflow-x-hidden h-auto">
      {/* 2. Header */}
      {/* 2. Header */}
      <header className="sticky top-0 z-30 w-full flex flex-col shadow-sm no-print bg-white">
        {/* REDUCED: py-4 to py-2.5 and gap-4 to gap-3 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-white to-sky-50 py-2.5 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center border-b border-sky-100 gap-3 z-10">
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${headerBg})` }}
          />
          <div className="absolute inset-0 -z-10 bg-slate-900/10" />

          {/* Left Side: Logo and Titles */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Comment moved outside the button tag so it doesn't break the parser */}
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex items-center gap-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 px-3 py-2 shadow-sm transition-opacity duration-150 hover:opacity-90 text-left"
            >
              <div className="bg-white p-1 rounded border border-gray-200 shadow-sm flex-shrink-0">
                {/* REDUCED: w-[72px] h-[72px] down to w-14 h-14 (56px) */}
                <img
                  src={sjvnLogo}
                  alt="SJVN Logo"
                  className="w-12 h-12 md:w-14 md:h-14 object-contain"
                />
              </div>
              <div className="flex flex-col text-white">
                {/* REDUCED: text-[28px] to text-2xl */}
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight">
                  SJVN Limited
                </h1>
                <p className="text-[10px] md:text-xs font-semibold mt-0.5 text-white/90">
                  (A Joint Venture of Govt. of India & Govt. of Himachal Pradesh)
                </p>
                <p className="text-[9px] md:text-[10px] text-white/75 mt-0.5">
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
        {/* REDUCED: h-12 to h-10 */}
        <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-4 md:px-8 flex justify-between items-center h-10 shadow-sm relative z-10">
          
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
              className="bg-[#ffb600] hover:bg-amber-500 active:scale-95 transition-all duration-200 transform text-black font-bold py-1 px-4 rounded text-xs shadow-sm flex items-center gap-1.5 hover:shadow-md hover:-translate-y-0.5 group"
            >
              <LogOut className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
              <span>Sign out</span>
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