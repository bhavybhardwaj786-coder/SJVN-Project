import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, ShieldCheck, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top gov strip */}
      <div className="bg-brand text-brand-foreground text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <span className="font-medium">Government of India · SJVN Limited (A Navratna PSU)</span>
          <span className="hidden sm:inline text-brand-foreground/80">
            Environmental Monitoring & Expenditure Management Portal
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-gradient-brand text-primary-foreground font-bold">
              S
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight text-brand">SJVN · EMEMP</div>
              <div className="text-[11px] text-muted-foreground truncate">
                Environmental Monitoring & Expenditure Management Portal
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-medium">
              <Leaf className="h-3.5 w-3.5" /> Digital environmental compliance
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              A single, secure portal for SJVN's environmental data.
            </h1>
            <p className="mt-4 max-w-xl text-primary-foreground/85">
              EMEMP replaces manual Excel-based collection across 12 SJVN project sites with
              structured digital forms, verifiable submissions, and consolidated reporting for
              administrators.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth">Sign in to portal</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 self-center">
            {[
              { k: "12", v: "Project sites" },
              { k: "8+", v: "Environmental forms" },
              { k: "100%", v: "Digital submissions" },
              { k: "24/7", v: "Secure access" },
            ].map((s) => (
              <div
                key={s.v}
                className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 p-5 backdrop-blur"
              >
                <div className="text-3xl font-bold">{s.k}</div>
                <div className="mt-1 text-sm text-primary-foreground/80">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Secure by design",
              body: "Role-based access for site users and administrators, row-level data isolation, and full audit trail.",
            },
            {
              icon: Leaf,
              title: "Environmental first",
              body: "Purpose-built forms for air, water, waste, plantation, wildlife, CSR, hazardous waste and expenditure.",
            },
            {
              icon: BarChart3,
              title: "Consolidated reporting",
              body: "Admin dashboard with site-wise, month-wise analytics and exportable reports.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border bg-card p-6 shadow-card">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary-soft text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} SJVN Limited. All rights reserved.</div>
          <div>
            EMEMP · Environmental Monitoring & Expenditure Management Portal · Version 1.0
          </div>
        </div>
      </footer>
    </div>
  );
}
