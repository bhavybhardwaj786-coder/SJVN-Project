import { MapPin, Phone, Mail } from "lucide-react";

import { SjvnLogo } from "./sjvn-logo";


export function SiteFooter() {
  return (
    <footer className="bg-[#0B4F86] text-white">

      <div className="border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-6 text-sm text-white/75 sm:grid-cols-3">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#5FD3B0]" />
            SJVN Corporate Office, Shanan, Shimla, Himachal Pradesh – 171006
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-[#5FD3B0]" /> +91 177 265 xxxx
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-[#5FD3B0]" /> info@sjvn.example
          </p>
        </div>
      </div>

      <div className="bg-black/20 py-4 text-center text-xs text-white/60">
        © {new Date().getFullYear()} SJVN Limited. All Rights Reserved.
      </div>
    </footer>
  );
}