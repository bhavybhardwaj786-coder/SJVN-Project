import { MapPin, Phone, Mail } from "lucide-react";

import { SjvnLogo } from "./sjvn-logo";
import { useCssVarHeight } from "@/hooks/use-css-var-height";

export function SiteFooter() {
  // Publishes the footer's live rendered height as --footer-height on <html>,
  // so layouts elsewhere on the page (e.g. a full-viewport hero) can
  // subtract it accurately.
  const footerRef = useCssVarHeight<HTMLElement>("--footer-height");

  return (
    <footer ref={footerRef} className="bg-[#0B4F86] text-white">
      <div className="bg-black/20 py-4 text-center text-xs text-white/60">
        © {new Date().getFullYear()} SJVN Limited. All Rights Reserved.
      </div>
    </footer>
  );
}