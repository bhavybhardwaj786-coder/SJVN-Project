<<<<<<< HEAD
import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
=======
import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
>>>>>>> 1a38131 (EDIT)
import {
  ChevronDown,
  ChevronRight,
  Menu,
  X,
<<<<<<< HEAD
  ShieldCheck,
  Mail,
  ArrowRight,
  Zap,
  Home,
=======
  LogIn,
  Home as HomeIcon,
>>>>>>> 1a38131 (EDIT)
} from "lucide-react";

import { cn } from "@/lib/utils";
import sjvnLogoImg from "../../assets/sjvn-logo.jpeg";
import { NAV_ITEMS } from "./site-nav-data";

// Map known route segments -> friendly labels.
// Extend this as you add more real routes (dashboard, admin, etc.)
const ROUTE_LABELS: Record<string, string> = {
  auth: "Login",
  dashboard: "Dashboard",
  admin: "Admin",
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

// Flatten NAV_ITEMS (top-level + nested) into a single jump-list,
// plus a couple of routes that aren't in NAV_ITEMS (Home, Login).
function useQuickNavLinks() {
  const leaves: { label: string; href: string }[] = [
    { label: "Home", href: "/" },
  ];

  NAV_ITEMS.slice(1).forEach((item) => {
    if (item.items && item.items.length > 0) {
      item.items.forEach((sub) => leaves.push({ label: sub.label, href: sub.href }));
    } else if (item.href) {
      leaves.push({ label: item.label, href: item.href });
    }
  });

  leaves.push({ label: "Login", href: "/auth" });

  return leaves;
}

function SiteBreadcrumb() {
  const crumbs = useBreadcrumbs();
  const quickLinks = useQuickNavLinks();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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
          return (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-white/40" />}
              {isLast ? (
                <span className="text-white">{crumb.label}</span>
              ) : (
                <Link
                  to={crumb.path}
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  
  // --- Dynamic Breadcrumb Logic ---
  const location = useLocation();
  const pathname = location.pathname;
  const pathSegments = pathname.split("/").filter(Boolean);
  
const formatSegmentName = (str: string) => {
  if (!str) return "";
  
  // 1. Add this override line right here:
  if (str.toLowerCase() === "auth") return "Login";
  
  if (str.length > 24 && str.includes("-")) return "Details"; 
  return str.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* National tricolour strip — standard marker on GoI enterprise sites */}
      <div className="flex h-[3px] w-full">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Brand header */}
<<<<<<< HEAD
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 border-b border-white/10">
        
        {/* LEFT SIDE: Logo & Titles */}
        <div className="flex items-center gap-4 z-10">
          {/* Ambient glow behind logo */}
          <div className="pointer-events-none absolute left-4 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-electric-500/20 blur-2xl" />

          <motion.div
            whileHover={{ scale: 1.06, rotate: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(10,132,255,0.35)] sm:h-16 sm:w-16"
          >
            <img
              src={sjvnLogoImg}
              alt="SJVN Logo"
              className="h-full w-full object-contain p-1"
            />
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
            </span>
          </motion.div>

          <div className="min-w-0">
            <h1 className="bg-gradient-to-r from-white via-white to-electric-200 bg-clip-text text-xl font-extrabold leading-tight tracking-tight text-transparent sm:text-3xl">
              SJVN Limited
            </h1>
            <p className="mt-0.5 text-[11px] font-semibold text-white/70 sm:text-sm">
              (A Joint Venture of Govt. of India &amp; Govt. of Himachal Pradesh)
            </p>
            <p className="mt-0.5 hidden text-[10px] font-medium text-white/40 sm:block">
              A Navratna PSU · ISO 9001:2015 Certified · CIN: L40101HP1988GOI008409
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: Dynamic Breadcrumbs */}
        <div className="hidden md:flex flex-col items-end gap-2 z-10">
          <nav className="flex items-center gap-1.5 text-sm font-medium text-white/80 bg-white/5 px-3 py-1.5 rounded-md border border-white/10 shadow-sm backdrop-blur-sm">
            <Link to="/" className="hover:text-white transition-colors flex items-center gap-1">
              <Home className="h-3.5 w-3.5 mb-0.5" />
              Home
            </Link>
            
            {pathSegments.length > 0 && (
              <span className="text-white/40 text-xs">»</span>
            )}

            {pathSegments.map((name, index) => {
              const routeTo = `/${pathSegments.slice(0, index + 1).join("/")}`;
              const isLast = index === pathSegments.length - 1;
              const displayName = formatSegmentName(name);

              return (
                <div key={name} className="flex items-center gap-1.5">
                  {isLast ? (
                    <span className="text-emerald-400 font-bold">{displayName}</span>
                  ) : (
                    <>
                      <Link to={routeTo} className="hover:text-white transition-colors">
                        {displayName}
                      </Link>
                      <span className="text-white/40 text-xs">»</span>
                    </>
                  )}
                </div>
              );
            })}
          </nav>
=======
      <div className="w-full border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-slate-200 bg-white sm:h-16 sm:w-16">
            <img
              src={sjvnLogoImg}
              alt="SJVN Logo"
              className="h-full w-full object-contain p-1"
            />
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
>>>>>>> 1a38131 (EDIT)
        </div>

      </div>

      {/* Primary nav */}
      <nav className="w-full bg-[#0B4F86] text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center px-4">
          {/* Desktop menu */}
          <ul className="hidden flex-1 items-stretch xl:flex">
            {NAV_ITEMS.slice(1).map((item) => (
              <li
                key={item.label}
                className="group relative"
                onMouseEnter={() => setOpenSection(item.label)}
                onMouseLeave={() => setOpenSection(null)}
              >
                <a
                  href={item.href}
                  className="relative flex h-11 items-center gap-1 border-b-2 border-transparent px-4 text-[13px] font-medium whitespace-nowrap text-white/85 transition-colors duration-150 hover:border-[#3FC1A0] hover:text-white"
                >
                  {item.label}
                  {item.items && (
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-150",
                        openSection === item.label && "rotate-180",
                      )}
                    />
                  )}
                </a>

                {item.items && (
                  <div
                    className={cn(
                      "absolute left-0 top-full z-50 w-64 origin-top rounded-b-sm border border-slate-200 border-t-2 border-t-[#0F8B6C] bg-white py-1 shadow-lg transition-all duration-150",
                      openSection === item.label
                        ? "visible translate-y-0 opacity-100"
                        : "invisible -translate-y-1 opacity-0",
                    )}
                  >
                    {item.items.map((sub) => (
                      <a
                        key={sub.label}
                        href={sub.href}
                        className="block px-4 py-2.5 text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-50 hover:text-[#0B4F86]"
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Breadcrumb / quick-nav + Action Buttons (Desktop) */}
          <div className="ml-auto hidden h-11 items-center gap-2.5 xl:flex">
            <SiteBreadcrumb />

            <Link
              to="/auth"
              className="flex h-8 items-center gap-1.5 rounded bg-[#0F8B6C] px-4 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#12A17E]"
            >
              <LogIn className="h-3.5 w-3.5" />
              Login
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="ml-auto flex h-11 items-center gap-2 px-2 text-sm font-medium text-white/90 xl:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            Menu
          </button>
        </div>

        {/* Mobile: breadcrumb bar always visible */}
        <div className="flex items-center border-t border-white/10 bg-black/10 px-4 py-2 xl:hidden">
          <SiteBreadcrumb />
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="max-h-[70vh] overflow-y-auto border-t border-white/10 bg-[#0B4F86] xl:hidden">
            {NAV_ITEMS.slice(1).map((item) => (
              <div key={item.label} className="border-b border-white/10">
                <button
                  type="button"
                  onClick={() =>
                    setOpenSection((s) => (s === item.label ? null : item.label))
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-white/90"
                >
                  {item.label}
                  {item.items && (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-150",
                        openSection === item.label && "rotate-180",
                      )}
                    />
                  )}
                </button>
                {item.items && openSection === item.label && (
                  <div className="bg-black/20 pb-2">
                    {item.items.map((sub) => (
                      <a
                        key={sub.label}
                        href={sub.href}
                        onClick={() => setMobileOpen(false)}
                        className="block px-6 py-2.5 text-[13px] text-white/70 hover:text-white"
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Action Buttons (Mobile) */}
            <div className="flex flex-col gap-2.5 bg-black/10 p-4">
              <Link
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center justify-center gap-1.5 rounded bg-[#0F8B6C] py-2.5 text-center text-sm font-semibold text-white"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}