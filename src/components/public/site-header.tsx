import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  Mail,
  ArrowRight,
  Zap,
  Home,
} from "lucide-react";

import { cn } from "@/lib/utils";
import sjvnLogoImg from "../../assets/sjvn-logo.jpeg";
import { NAV_ITEMS } from "./site-nav-data";
import { motion, AnimatePresence } from "framer-motion";

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
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-2xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      {/* Animated gradient utility bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative h-1 overflow-hidden bg-slate-950"
      >
        <motion.div
          className="absolute inset-0 bg-[length:200%_100%]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #0356a9, #028e5f, #ffb600, #0a84ff)",
          }}
          animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      {/* Brand header */}
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
        </div>

      </div>

      {/* Primary nav */}
      <nav className="relative bg-gradient-to-r from-[#0a1c2e] via-[#0d2438] to-[#0a1c2e] text-white">
        <div className="mx-auto flex max-w-7xl items-center px-4">
          {/* Desktop menu */}
          <ul className="hidden flex-1 items-center xl:flex">
            {NAV_ITEMS.slice(1).map((item) => (
              <li key={item.label} className="group relative">
                <a
                  href={item.href}
                  className="relative flex h-12 items-center gap-1 px-4 text-[13px] font-semibold whitespace-nowrap text-white/80 transition-colors hover:text-white"
                >
                  {item.label}
                  {item.items && (
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                  )}
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] scale-x-0 bg-gradient-to-r from-electric-400 to-emerald-400 transition-transform duration-300 group-hover:scale-x-100" />
                </a>
                {item.items && (
                  <div className="invisible absolute left-0 top-full z-50 w-60 translate-y-1 rounded-b-lg border border-white/10 border-t-2 border-t-electric-400 bg-slate-900/95 py-1 opacity-0 shadow-2xl backdrop-blur-xl transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    {item.items.map((sub) => (
                      <a
                      
                        key={sub.label}
                        href={sub.href}
                        className="block px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Action Buttons (Desktop) */}
          <div className="ml-auto hidden items-center gap-3 xl:flex h-10">
            <a
              href="/contact"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 text-xs font-semibold text-white/85 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact Admin
            </a>
            <Link
              to="/auth"
              className="group relative flex h-9 items-center gap-1.5 overflow-hidden rounded-lg px-5 text-xs font-bold text-white shadow-[0_0_20px_rgba(10,132,255,0.4)] transition-shadow hover:shadow-[0_0_28px_rgba(10,132,255,0.6)]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-electric-600 via-electric-500 to-emerald-500 bg-[length:200%_100%] transition-[background-position] duration-500 group-hover:bg-[position:100%_0]" />
              <span className="relative flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Login
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="ml-auto flex h-12 items-center gap-2 px-3 text-sm font-semibold text-white/90 xl:hidden hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            Menu
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="max-h-[70vh] overflow-y-auto border-t border-white/10 bg-slate-950/95 backdrop-blur-xl xl:hidden"
            >
              {NAV_ITEMS.slice(1).map((item) => (
                <div key={item.label} className="border-b border-white/10">
                  <button
                    onClick={() =>
                      setOpenSection((s) => (s === item.label ? null : item.label))
                    }
                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                    {item.items && (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          openSection === item.label && "rotate-180",
                        )}
                      />
                    )}
                  </button>
                  {item.items && openSection === item.label && (
                    <div className="bg-black/30 pb-2">
                      {item.items.map((sub) => (
                        <a
                          key={sub.label}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className="block px-6 py-2.5 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          {sub.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Action Buttons (Mobile) */}
              <div className="flex flex-col gap-2.5 p-4 bg-black/20">
              <a
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 py-2.5 text-center text-sm font-semibold text-white/90 hover:bg-white/10 transition-colors"
              >
                  <Mail className="h-4 w-4" />
                  Contact Admin
                </a>
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-electric-600 via-electric-500 to-emerald-500 py-2.5 text-center text-sm font-bold text-white shadow-[0_0_20px_rgba(10,132,255,0.4)]"
                >
                  <Zap className="h-4 w-4" />
                  Sign In
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}