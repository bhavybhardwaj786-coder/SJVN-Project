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
  ShieldCheck
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

  const isUserDashboard = pathname === "/authenticated/site" || pathname === "/authenticated/site/";

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
    // Changed to a flex column layout with a solid gray background base
    <div className="min-h-screen bg-[#eaeff2] flex flex-col font-sans relative overflow-x-hidden">
      
      {/* 1. Top gov strip */}
      <div className="bg-[#14647f] text-white text-[11px] no-print relative z-20 py-1.5 px-4 md:px-8 flex justify-between items-center h-8">
        <span className="font-medium">Government of India · SJVN Limited</span>
        <span className="hidden sm:inline">EMEMP · Secure Portal</span>
      </div>

      {/* 2. Header */}
      <header className="sticky top-0 z-30 w-full flex flex-col shadow-sm no-print bg-white">
        <div className="bg-gradient-to-r from-white to-[#dceaf0] py-4 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center border-b border-gray-200 gap-4 relative z-10">
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
                A Navratna PSU · ISO 9001:2015 Certified · CIN: L40101HP1988GOI008409
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {me?.isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-brand">
                <Shield className="h-3.5 w-3.5" /> Administrator
              </span>
            )}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full py-1.5 px-4 shadow-sm text-sm font-semibold text-gray-800">
              <ShieldCheck size={16} className="text-[#095a7d]" />
              A Navratna PSU
            </div>
          </div>
        </div>

        {/* Bottom Navigation Teal Bar */}
        <div className="bg-[#227b96] px-4 md:px-8 flex justify-between items-center h-12 shadow-sm relative z-10">
          
          {/* 1. Left Side: Home Icon */}
          <div className="h-full flex items-center pr-4 border-r border-[#3a8da6] shrink-0">
            <Link to="/" className="text-white hover:text-gray-200 transition-colors" aria-label="Go to Public Home Page">
              <Home size={20} />
            </Link>
          </div>

          {/* 2. Middle: Scrolling Announcement Marquee */}
          <div className="flex-1 overflow-hidden whitespace-nowrap mx-4 flex items-center h-full cursor-default">
            {/* CSS Animation specifically for this scrolling text */}
            <style>{`
              .marquee-content {
                display: inline-block;
                padding-left: 100%;
                animation: marquee 20s linear infinite;
              }
              /* Optional: pauses the scrolling when the user hovers over it with their mouse */
              .marquee-content:hover {
                animation-play-state: paused;
              }
              @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-100%); }
              }
            `}</style>
            
            <div className="marquee-content text-[#ffb600] text-sm font-bold tracking-wide drop-shadow-sm">
              Welcome to SJVN Limited — Environmental Monitoring & Expenditure Management Portal
            </div>
          </div>

          {/* 3. Right Side: User Info & Sign Out */}
          <div className="flex items-center gap-4 shrink-0 pl-4 border-l border-[#3a8da6]">
            <div className="hidden text-right md:block text-white">
              <div className="text-xs font-semibold">{me?.profile?.full_name ?? me?.user.email}</div>
              <div className="text-[10px] text-white/80">{me?.user.email}</div>
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
        
        {/* The Running Background Banner */}
        {isUserDashboard && (
          <div className="absolute top-0 left-0 w-full h-[450px] z-0 overflow-hidden shadow-sm">
            <HeroCarousel />
            {/* White translucent fade overlay so black text is highly readable */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />
            {/* Gradient mask to blend the bottom edge of the image cleanly into the gray page */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#eaeff2] to-transparent" />
          </div>
        )}
{/* 4. Dashboard Content layer (z-10) */}
        <div 
          className={cn(
            "mx-auto grid max-w-[1400px] gap-6 px-4 py-6 relative z-10",
            // If on the user dashboard, use 1 full-width column. Otherwise, keep the 240px sidebar layout.
            isUserDashboard ? "grid-cols-1" : "lg:grid-cols-[240px_1fr]"
          )}
        >
          {/* Conditionally render the aside sidebar so it completely disappears on the user dashboard */}
          {!isUserDashboard && (
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

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}