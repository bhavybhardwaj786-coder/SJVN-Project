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
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- IMPORT YOUR LOGO HERE ---
// Note: Make sure the file extension and name exactly match what is in your folder!
import sjvnLogo from "@/assets/sjvn-logo.jpeg"; 

async function fetchMe() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const [{ data: profile }, { data: roles }, { data: assignments }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase
      .from("site_assignments")
      .select("site_id, sites(id, code, name, location)")
      .eq("user_id", user.id),
  ]);
  const isAdmin = !!roles?.some((r) => r.role === "admin");
  return {
    user,
    profile,
    isAdmin,
    sites: (assignments ?? []).map((a) => a.sites).filter(Boolean) as {
      id: string;
      code: string;
      name: string;
      location: string | null;
    }[],
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

  const nav = me?.isAdmin
    ? [
        { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard, exact: true },
        { to: "/admin/sites", label: "Sites", icon: Building2 },
        { to: "/admin/users", label: "Users", icon: Users },
        { to: "/admin/forms", label: "Forms", icon: FormInput },
        { to: "/admin/submissions", label: "Submissions", icon: ClipboardList },
      ]
    : [
        { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { to: "/submissions", label: "My Submissions", icon: FileStack },
      ];

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top gov strip */}
      <div className="bg-brand text-brand-foreground text-[11px] no-print">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-1">
          <span className="font-medium">Government of India · SJVN Limited</span>
          <span className="hidden sm:inline">EMEMP · Secure Portal</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-surface/95 backdrop-blur no-print">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/app" className="flex min-w-0 items-center gap-3">
              
              {/* --- YOUR NEW IMAGE ASSET GOES HERE --- */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm">
                <img 
                  src={sjvnLogo} 
                  alt="SJVN Logo" 
                  className="h-full w-full object-contain p-0.5" 
                />
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-brand">SJVN · EMEMP</div>
                <div className="hidden truncate text-[11px] text-muted-foreground sm:block">
                  Environmental Monitoring & Expenditure Management
                </div>
              </div>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {me?.isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-brand">
                <Shield className="h-3.5 w-3.5" /> Administrator
              </span>
            )}
            <div className="hidden text-right md:block">
              <div className="text-xs font-medium">{me?.profile?.full_name ?? me?.user.email}</div>
              <div className="text-[11px] text-muted-foreground">{me?.user.email}</div>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside
          className={cn(
            "no-print lg:block",
            open ? "block" : "hidden",
          )}
        >
          <nav className="rounded-xl border bg-card p-2 shadow-card">
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
                          ? "bg-primary-soft text-brand"
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

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}