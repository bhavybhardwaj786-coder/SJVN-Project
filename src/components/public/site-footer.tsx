import { MapPin, Phone, Mail } from "lucide-react";

import { SjvnLogo } from "./sjvn-logo";

export function SiteFooter() {
  return (
    // shrink-0 ensures the footer never collapses when used inside dynamic flex-col layouts
    <footer className="w-full shrink-0 bg-[#0B4F86] text-white">

      <div className="border-t border-white/10">
        {/* Adjusted spacing from gap-3 to a flexible grid that handles mobile screens smoothly without awkward text wrapping */}
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 text-xs sm:text-sm text-white/75 grid-cols-1 md:grid-cols-3">
          
          <p className="flex items-start gap-2.5 leading-relaxed">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#5FD3B0]" />
            <span>SJVN Corporate Office, Shanan, Shimla, HP – 171006</span>
          </p>
          
          <p className="flex items-center gap-2.5">
            <Phone className="h-4 w-4 shrink-0 text-[#5FD3B0]" /> 
            <span>+91 177 265 xxxx</span>
          </p>
          
          <p className="flex items-center gap-2.5 md:justify-start">
            <Mail className="h-4 w-4 shrink-0 text-[#5FD3B0]" /> 
            <span className="break-all">info@sjvn.example</span>
          </p>
          
        </div>
      </div>

      {/* Condensed padding slightly to keep it compact on strict screen interfaces */}
      <div className="bg-black/20 py-3 text-center text-[11px] sm:text-xs text-white/60 tracking-wide">
        © {new Date().getFullYear()} SJVN Limited. All Rights Reserved.
      </div>
    </footer>
  );
}