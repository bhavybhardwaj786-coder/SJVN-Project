import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Home,
  Menu,
  Search,
  UserRound,
  X,
  Accessibility,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SjvnLogo } from "./sjvn-logo";
import { NAV_ITEMS } from "./site-nav-data";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-md">
      {/* Utility bar */}
      <div className="bg-[#0f6b8a] text-white">
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-4">
          <Link to="/auth" className="flex items-center gap-1.5 text-xs font-medium hover:underline">
            <UserRound className="h-4 w-4" />
            Login
          </Link>
          <div className="hidden items-center gap-4 text-xs font-medium md:flex">
            <button className="font-semibold border border-white rounded px-1.5 py-0.5">हिंदी</button>
            <button aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
          </div>
          <button aria-label="Search" className="md:hidden">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Brand header */}
      <div className="relative overflow-hidden bg-brand-soft">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-soft via-brand-soft/60 to-brand/20" />
        <div className="relative mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <SjvnLogo className="h-16 w-16 shrink-0 drop-shadow-sm sm:h-20 sm:w-20" />
          <div>
            <h1 className="text-lg font-extrabold leading-tight text-[#0f6b8a] sm:text-2xl">
                   SJVN Limited
            </h1>
            <p className="text-[11px] font-medium text-foreground/80 sm:text-sm">
              (A Joint Venture of Govt. of India &amp; Govt. of Himachal Pradesh)
            </p>
            <p className="hidden text-[11px] font-medium text-foreground/70 sm:block">
              A Navratna PSU · ISO 9001:2015 Certified · CIN: L40101HP1988GOI008409
            </p>
          </div>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <span className="flex items-center gap-2 rounded-full border border-brand/30 bg-white px-3 py-1.5 text-xs font-semibold text-brand-strong">
              <ShieldCheck className="h-4 w-4" /> A Navratna PSU
            </span>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="bg-[#297b9a] text-white">
        <div className="mx-auto flex max-w-7xl items-center px-4">
          <a
            href="/"
            className="flex h-12 items-center border-r border-white/15 pr-4 hover:bg-white/10"
            aria-label="Home"
          >
            <Home className="h-5 w-5" />
          </a>

          {/* Desktop menu */}
          <ul className="hidden flex-1 items-center xl:flex">
            {NAV_ITEMS.slice(1).map((item) => (
              <li key={item.label} className="group relative">
                <a
                  href={item.href}
                  className="flex h-12 items-center gap-1 px-3 text-[13px] font-semibold whitespace-nowrap transition-colors hover:bg-white/10"
                >
                  {item.label}
                  {item.items && <ChevronDown className="h-3.5 w-3.5" />}
                </a>
                {item.items && (
                  <div className="invisible absolute left-0 top-full z-50 w-60 translate-y-1 rounded-b-md border-t-2 border-gold bg-white py-1 opacity-0 shadow-xl transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    {item.items.map((sub) => (
                      <a
                        key={sub.label}
                        href={sub.href}
                        className="block px-4 py-2 text-sm text-foreground transition-colors hover:bg-brand-soft hover:text-brand-strong"
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

         <Link
              to="/auth"
              className="ml-auto hidden h-8 items-center rounded bg-[#fbb414] px-4 text-xs font-bold text-black hover:bg-[#e5a20e] xl:flex" >
              Sign in
        </Link>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="ml-auto flex h-12 items-center gap-2 px-3 text-sm font-semibold xl:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            Menu
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="max-h-[70vh] overflow-y-auto border-t border-white/15 bg-brand-strong xl:hidden">
            {NAV_ITEMS.slice(1).map((item) => (
              <div key={item.label} className="border-b border-white/10">
                <button
                  onClick={() =>
                    setOpenSection((s) => (s === item.label ? null : item.label))
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
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
                  <div className="bg-black/10 pb-2">
                    {item.items.map((sub) => (
                      <a
                        key={sub.label}
                        href={sub.href}
                        onClick={() => setMobileOpen(false)}
                        className="block px-6 py-2 text-[13px] text-brand-foreground/85"
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              to="/auth"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-sm font-bold text-gold"
            >
              Operational Portal →
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}