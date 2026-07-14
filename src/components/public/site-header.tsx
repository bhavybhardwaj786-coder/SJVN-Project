import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import sjvnLogoImg from "../../assets/sjvn-logo.jpeg"; 
import { NAV_ITEMS } from "./site-nav-data";
import { motion, AnimatePresence } from "framer-motion";


export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <motion.header
    initial={{ y: -100 }}
    animate={{ y: 0 }}
    transition={{
    duration: 0.8,
    ease: "easeOut",
  }}
  className="sticky top-0 z-50 w-full
  bg-white/90
  backdrop-blur-xl
  border-b border-blue-100
  shadow-lg"
  >
      {/* Utility bar (Cleaned up: Removed Admin Login and Search) */}
      <motion.div
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={{ delay: .2 }}
className="bg-gradient-to-r
from-[#005BAC]
via-[#0077B6]
to-[#0A8F4D]"
>
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-end px-4">
        </div>
      </motion.div>

      {/* Brand header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#ffffff] to-[#e6f0f5]">
        <div className="relative mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 border-b border-gray-200">
          
          {/* UPDATED LOGO IMAGE */}
          <motion.div

whileHover={{
scale:1.08,
rotate:-3
}}

transition={{
type:"spring",
stiffness:300
}}

className="flex h-16 w-16
rounded-xl
bg-white
shadow-xl
border
border-blue-100
"
>
  <img src={sjvnLogoImg} alt="SJVN Logo" className="h-full w-full object-contain" />
          </motion.div>

          <div className="z-10">
            <h1 className="text-xl font-extrabold leading-tight text-[#095a7d] sm:text-3xl">
              SJVN Limited
            </h1>
            <p className="text-[11px] font-semibold text-gray-800 sm:text-sm mt-0.5">
              (A Joint Venture of Govt. of India &amp; Govt. of Himachal Pradesh)
            </p>
            <p className="hidden text-[10px] font-medium text-gray-500 sm:block mt-0.5">
              A Navratna PSU · ISO 9001:2015 Certified · CIN: L40101HP1988GOI008409
            </p>
          </div>
          
          <div className="ml-auto hidden items-center gap-2 lg:flex z-10">
            <span className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-semibold text-gray-800 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-[#095a7d]" /> A Navratna PSU
            </span>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="bg-[#227b96] text-white">
        <div className="mx-auto flex max-w-7xl items-center px-4">
          
          {/* Desktop menu (Removed Home Icon/Tab) */}
          <ul className="hidden flex-1 items-center xl:flex">
            {NAV_ITEMS.slice(1).map((item) => (
              <li key={item.label} className="group relative">
                <a
                  href={item.href}
                  className="flex h-12 items-center gap-1 px-4 text-[13px] font-semibold whitespace-nowrap transition-colors hover:bg-white/10"
                >
                  {item.label}
                  {item.items && <ChevronDown className="h-3.5 w-3.5" />}
                </a>
                {item.items && (
                  <div className="invisible absolute left-0 top-full z-50 w-60 translate-y-1 rounded-b-md border-t-2 border-[#ffb600] bg-white py-1 opacity-0 shadow-xl transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    {item.items.map((sub) => (
                      <a
                        key={sub.label}
                        href={sub.href}
                        className="block px-4 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-100"
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Action Buttons (Desktop - Sign Up Removed) */}
          <div className="ml-auto hidden items-center gap-3 xl:flex h-12">
            <Link
              to="/auth"
              className="flex h-8 items-center rounded bg-[#ffb600] px-6 text-xs font-bold text-black hover:bg-[#e5a20e] transition-colors shadow-sm" 
            >
              Login
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="ml-auto flex h-12 items-center gap-2 px-3 text-sm font-semibold xl:hidden hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            Menu
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="max-h-[70vh] overflow-y-auto border-t border-white/15 bg-[#1a6279] xl:hidden">
            {NAV_ITEMS.slice(1).map((item) => (
              <div key={item.label} className="border-b border-white/10">
                <button
                  onClick={() =>
                    setOpenSection((s) => (s === item.label ? null : item.label))
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-white/5 transition-colors"
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
                  <div className="bg-black/20 pb-2">
                    {item.items.map((sub) => (
                      <a
                        key={sub.label}
                        href={sub.href}
                        onClick={() => setMobileOpen(false)}
                        className="block px-6 py-2.5 text-[13px] text-white/90 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {/* Action Buttons (Mobile - Sign Up Removed) */}
            <div className="flex flex-col gap-2 p-4 bg-black/10">
              <Link
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="block w-full rounded bg-[#ffb600] py-2.5 text-center text-sm font-bold text-black hover:bg-[#e5a20e] transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
      </nav>
    </motion.header>
  );
}