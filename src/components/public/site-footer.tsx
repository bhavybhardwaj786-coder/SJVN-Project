import { Facebook, Youtube, Twitter, Linkedin, MapPin, Phone, Mail } from "lucide-react";

import { SjvnLogo } from "./sjvn-logo";

const footerLinks = [
  {
    title: "About SJVN",
    links: ["Company Overview", "Vision & Mission", "Board of Directors", "Awards", "Milestones"],
  },
  {
    title: "Our Business",
    links: ["Hydro Power", "Wind Power", "Solar Power", "Thermal Power", "Power Trading"],
  },
  {
    title: "Quick Links",
    links: ["Tenders", "Careers", "Investor Relations", "CSR", "Right to Information"],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-brand-strong text-brand-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <SjvnLogo className="h-12 w-12" />
            <div>
              <p className="text-base font-extrabold">SJVN Limited</p>
              <p className="text-xs text-brand-foreground/70">A Navratna PSU</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm text-brand-foreground/75">
            A leading power company driving India's clean-energy future through hydro,
            wind, solar and thermal generation across the nation and beyond.
          </p>
          <div className="mt-5 flex gap-3">
            {[Facebook, Youtube, Twitter, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-gold hover:text-gold-foreground"
                aria-label="Social link"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {footerLinks.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gold">{col.title}</h3>
            <ul className="mt-4 space-y-2">
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-brand-foreground/75 hover:text-white hover:underline">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-6 text-sm text-brand-foreground/80 sm:grid-cols-3">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            SJVN Corporate Office, Shanan, Shimla, Himachal Pradesh – 171006
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-gold" /> +91 177 265 xxxx
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-gold" /> info@sjvn.example
          </p>
        </div>
      </div>

      <div className="bg-black/20 py-4 text-center text-xs text-brand-foreground/60">
        © {new Date().getFullYear()} SJVN Limited. This is a demonstration website. All content is illustrative.
      </div>
    </footer>
  );
}