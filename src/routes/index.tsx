import { createFileRoute } from "@tanstack/react-router";
import {
  Droplets,
  Wind,
  Sun,
  Flame,
  Users,
  Zap,
  TrendingUp,
  FileText,
  Briefcase,
  Scale,
  FileBarChart,
  ShoppingCart,
  MessageSquareWarning,
  ArrowRight,
  CalendarDays,
} from "lucide-react";

import { HeroCarousel } from "@/components/public/hero-carousel";
import businessDam from "@/assets/business-dam.jpeg";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "SJVN Limited | Powering India with Clean Energy" },
      {
        name: "description",
        content:
          "SJVN Limited, a Navratna PSU, is a leading Indian power company generating hydro, wind, solar and thermal energy and building the nation's clean-energy future.",
      },
      { property: "og:title", content: "SJVN Limited | Powering India with Clean Energy" },
      {
        property: "og:description",
        content:
          "A Navratna PSU generating hydro, wind, solar and thermal power across India.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const businesses = [
  { icon: Droplets, label: "Hydro Power" },
  { icon: Wind, label: "Wind Power" },
  { icon: Sun, label: "Solar Power" },
  { icon: Flame, label: "Thermal Power" },
  { icon: Users, label: "Consulting" },
  { icon: Zap, label: "Power Transmission" },
  { icon: TrendingUp, label: "Power Trading" },
];

const stats = [
  { value: "2,377+", label: "MW Installed Capacity" },
  { value: "31+", label: "Projects Under Execution" },
  { value: "10+", label: "States & Countries" },
  { value: "12,000+", label: "MW Target by 2030" },
];

const quickLinks = [
  { icon: FileText, label: "Tenders" },
  { icon: Briefcase, label: "Careers" },
  { icon: Scale, label: "Right to Information" },
  { icon: FileBarChart, label: "Annual Report" },
  { icon: ShoppingCart, label: "e-Procurement" },
  { icon: MessageSquareWarning, label: "Grievances" },
];

const updates = [
  { date: "05 Jul 2026", text: "SJVN commissions new solar park, adding 200 MW of clean capacity." },
  { date: "28 Jun 2026", text: "Board approves financial results for the quarter ending June 2026." },
  { date: "15 Jun 2026", text: "Notice inviting tender for civil works at Himalayan hydro project." },
  { date: "02 Jun 2026", text: "SJVN signs MoU to develop pumped storage projects across three states." },
];

function HomePage() {
  return (
    <div>
      <HeroCarousel />

      <section className="bg-brand-strong">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-8 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="px-2 text-center text-brand-foreground">
              <p className="text-2xl font-extrabold text-gold sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-xs font-medium sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="business" className="bg-brand-soft/40 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading title="Our Business" subtitle="Diversified clean-energy portfolio" />
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {businesses.map((b) => (
                <a
                  key={b.label}
                  href="#business"
                  className="group flex flex-col items-center justify-center gap-3 rounded-lg border border-brand/15 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-brand hover:shadow-md"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                    <b.icon className="h-7 w-7" />
                  </span>
                  <span className="text-sm font-semibold text-brand-strong">{b.label}</span>
                </a>
              ))}
            </div>
            <div className="overflow-hidden rounded-lg shadow-md">
              <img
                src={businessDam}
                alt="SJVN hydroelectric dam releasing water"
                width={1008}
                height={768}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2">
          <div>
            <SectionHeading title="Latest Updates" subtitle="News & announcements" align="left" />
            <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
              {updates.map((u) => (
                <li key={u.text} className="flex gap-4 p-4 transition-colors hover:bg-brand-soft/40">
                  <span className="flex h-fit shrink-0 items-center gap-1 rounded bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand-strong">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {u.date}
                  </span>
                  <p className="text-sm text-foreground">{u.text}</p>
                </li>
              ))}
            </ul>
            <a
              href="#media"
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
            >
              View all updates <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div>
            <SectionHeading title="About SJVN" subtitle="Who we are" align="left" />
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              SJVN Limited is a Navratna Central Public Sector Enterprise, a joint venture of
              the Government of India and the Government of Himachal Pradesh. Since its
              inception, SJVN has grown from a single hydro project into a diversified power
              company with a presence across hydro, thermal, wind, solar, power transmission
              and power trading.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Committed to sustainable and inclusive growth, SJVN continues to expand its
              clean-energy footprint while empowering communities and safeguarding the
              environment.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-brand/15 bg-brand-soft/50 p-4">
                <p className="text-lg font-extrabold text-brand-strong">Vision</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  To be a global leader in clean and sustainable energy.
                </p>
              </div>
              <div className="rounded-lg border border-brand/15 bg-brand-soft/50 p-4">
                <p className="text-lg font-extrabold text-brand-strong">Mission</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  To deliver reliable power responsibly and profitably.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
  align = "center",
}: {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      {subtitle && (
        <span className="text-xs font-bold uppercase tracking-widest text-brand">
          {subtitle}
        </span>
      )}
      <h2 className="mt-1 text-2xl font-extrabold text-brand-strong sm:text-3xl">{title}</h2>
      <span
        className={`mt-3 block h-1 w-16 rounded bg-gold ${align === "center" ? "mx-auto" : ""}`}
      />
    </div>
  );
}