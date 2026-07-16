import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogIn,
  LayoutDashboard,
  LogOut,
  Home as HomeIcon,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/client";
import sjvnLogoImg from "../../assets/sjvn-logo.jpeg";
import { NAV_ITEMS } from "./site-nav-data";

const ROUTE_LABELS: Record<string, string> = {
  auth: "Login",
  authenticated: "Portal",
  supadmin: "Supadmin",
  app: "Dashboard",
  site: "Site",
};

function labelForSegment(segment: string) {
  return (
    ROUTE_LABELS[segment] ??
    segment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function useBreadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const crumbs: { label: string; path: string }[] = [
    { label: "Home", path: "/" },
  ];

  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    crumbs.push({ label: labelForSegment(seg), path: acc });
  }

  return crumbs;
}

function useQuickNavLinks(isAuthenticated: boolean) {
  const leaves: { label: string; href: string }[] = [
    { label: "Home", href: "/" },
  ];

  if (NAV_ITEMS && NAV_ITEMS.length > 1) {
    NAV_ITEMS.slice(1).forEach((item) => {
      if (item.items && item.items.length > 0) {
        item.items.forEach((sub) => leaves.push({ label: sub.label, href: sub.href }));
      } else if (item.href) {
        leaves.push({ label: item.label, href: item.href });
      }
    });
  }

  if (!isAuthenticated) {
    leaves.push({ label: "Login", href: "/auth" });
  }

  return leaves;
}

function SiteBreadcrumb({ isAuthenticated }: { isAuthenticated: boolean }) {
  const crumbs = useBreadcrumbs();
  const quickLinks = useQuickNavLinks(isAuthenticated);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative flex items-center">
      <div className="flex items-center gap-1 rounded border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85">
        <HomeIcon className="h-3.5 w-3.5 shrink-0 text-[#3FC1A0]" />
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          const isHome = crumb.path === "/";
          
          return (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-white/40" />}
              {isLast ? (
                <span className="text-white">{crumb.label}</span>
              ) : (
                <Link
                  to={isHome ? "/" : crumb.path}
                  className="text-white/70 transition-colors hover:text-white hover:underline"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Jump to page"
          className="ml-1 flex h-5 w-5 items-center justify-center rounded hover:bg-white/10"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-white/70 transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-b-sm border border-slate-200 border-t-2 border-t-[#0F8B6C] bg-white py-1 shadow-lg">
          {quickLinks.map((link) => (
            <button
              key={link.href + link.label}
              type="button"
              onClick={() => {
                setOpen(false);
                navigate({ to: link.href });
              }}
              className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-50 hover:text-[#0B4F86]"
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

// --- RE-ENGINEERED INSTANT SYNCHRONIZED ROLE FETCHING ---
  const { data: userRole } = useQuery({
    queryKey: ["header-user-role", user?.id],
    queryFn: async () => {
      // Step A: Grab session natively inside the promise wrapper if state is missing
      let currentUserId = user?.id;
      if (!currentUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        currentUserId = session?.user?.id;
      }
      
      if (!currentUserId) return null;

      // Step B: Query user configurations immediately
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUserId);
      
      if (roles?.some((r) => r.role === "super_admin")) return "super_admin";
      if (roles?.some((r) => r.role === "admin")) return "admin";
      return "site_user";
    },
    // Keep it active even if the state hook hasn't caught up yet
    refetchOnWindowFocus: false,
  });

  // Dynamic route dispatcher based on their assigned group
  const dashboardTarget = 
    userRole === "super_admin"
      ? "/authenticated/supadmin"
      : userRole === "admin"
      ? "/authenticated/app"
      : "/authenticated/site";
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
    setMobileOpen(false);
  };

  const isAuthenticated = !!user;

  return (
    <header className="sticky top-0 z-50 w-full shrink-0">
      {/* National tricolour strip */}
      <div className="flex h-[3px] w-full">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Brand header */}
      <div className="w-full border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-slate-200 bg-white sm:h-16 sm:w-16">
            <img src={sjvnLogoImg} alt="SJVN Logo" className="h-full w-full object-contain p-1" />
          </div>

          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight tracking-tight text-[#0B4F86] sm:text-2xl">
              SJVN Limited
            </h1>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-sm">
              (A Joint Venture of Govt. of India &amp; Govt. of Himachal Pradesh)
            </p>
            <p className="mt-0.5 hidden text-[11px] text-slate-400 sm:block">
              ISO 9001:2015 Certified &middot; CIN: L40101HP1988GOI008409
            </p>
          </div>
        </div>
      </div>

      {/* Primary nav bar */}
      <nav className="w-full bg-[#0B4F86] text-white shadow-sm">
        <div className="mx-auto flex h-11 max-w-7xl items-center justify-between px-4">
          
          {/* Left Side: Navigation Links */}
          <div className="flex items-center h-full">
            <ul className="hidden items-stretch h-full xl:flex">
              {NAV_ITEMS && NAV_ITEMS.length > 0 && (
                <li className="flex items-center">
                  <Link 
                    to="/" 
                    className="flex h-full items-center px-4 text-[13px] font-medium text-white/85 hover:text-white"
                  >
                    Home
                  </Link>
                </li>
              )}
              {NAV_ITEMS && NAV_ITEMS.slice(1).map((item) => (
                <li
                  key={item.label}
                  className="group relative flex items-center h-full"
                  onMouseEnter={() => setOpenSection(item.label)}
                  onMouseLeave={() => setOpenSection(null)}
                >
                  {item.href ? (
                    <Link
                      to={item.href}
                      className="relative flex h-full items-center gap-1 border-b-2 border-transparent px-4 text-[13px] font-medium whitespace-nowrap text-white/85 transition-colors duration-150 hover:border-[#3FC1A0] hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="relative flex h-full items-center gap-1 border-b-2 border-transparent px-4 text-[13px] font-medium whitespace-nowrap text-white/85 transition-colors duration-150 hover:border-[#3FC1A0] hover:text-white"
                    >
                      {item.label}
                      {item.items && <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", openSection === item.label && "rotate-180")} />}
                    </button>
                  )}

                  {item.items && (
                    <div className={cn(
                      "absolute left-0 top-full z-50 w-64 origin-top rounded-b-sm border border-slate-200 border-t-2 border-t-[#0F8B6C] bg-white py-1 shadow-lg transition-all duration-150",
                      openSection === item.label ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
                    )}>
                      {item.items.map((sub) => (
                        <Link
                          key={sub.label}
                          to={sub.href}
                          className="block px-4 py-2.5 text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-50 hover:text-[#0B4F86]"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Right Side: Breadcrumbs + Actions (Login/Logout/Dashboard) */}
          <div className="hidden h-full items-center gap-3 xl:flex">
            <SiteBreadcrumb isAuthenticated={isAuthenticated} />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to={dashboardTarget}
                  className="flex h-8 items-center gap-1.5 rounded bg-[#3FC1A0] px-3 text-xs font-semibold text-slate-900 transition-colors duration-150 hover:bg-[#32a88a]"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-8 items-center gap-1.5 rounded bg-red-600 px-3 text-xs font-semibold text-white transition-colors duration-150 hover:bg-red-700"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex h-8 items-center gap-1.5 rounded bg-[#0F8B6C] px-4 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#12A17E]"
              >
                <LogIn className="h-3.5 w-3.5" />
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="ml-auto flex h-full items-center gap-2 px-2 text-sm font-medium text-white/90 xl:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            Menu
          </button>
        </div>

        {/* Mobile breadcrumb bar */}
        <div className="flex items-center border-t border-white/10 bg-black/10 px-4 py-2 xl:hidden">
          <SiteBreadcrumb isAuthenticated={isAuthenticated} />
        </div>
      </nav>
    </header>
  );
}