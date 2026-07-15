import { createFileRoute } from "@tanstack/react-router";
import { HeroCarousel } from "@/components/public/hero-carousel";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

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

const stats = [
  { value: "2,377+", label: "MW Installed Capacity" },
  { value: "31+", label: "Projects Under Execution" },
  { value: "10+", label: "States & Countries" },
  { value: "12,000+", label: "MW Target by 2030" },
];

// Variants for orchestrating the staggered animation list
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Delay between each stat card animating in
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

function HomePage() {
  return (
    <div className="flex flex-col w-full">
      <main className="flex-1">
        <HeroCarousel />

        {/* Stats Section */}
        {/* Stats Section */}
<section className="relative overflow-hidden bg-gradient-to-r from-[#0a1c2e] via-[#0d2438] to-[#0a1c2e] py-5">
  {/* Ambient glow accents */}
  <div className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-electric-500/20 blur-3xl" />
  <div className="pointer-events-none absolute -right-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-3xl" />

  {/* Animated top shimmer line, echoes the header */}
  <motion.div
    className="absolute inset-x-0 top-0 h-[2px] bg-[length:200%_100%]"
    style={{
      backgroundImage:
        "linear-gradient(90deg, #0a84ff, #38bdf8, #10b981, #ffb600, #10b981, #38bdf8, #0a84ff)",
    }}
    animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
  />

  <div className="relative mx-auto max-w-7xl px-4">
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-electric-300"
    >
      <TrendingUp className="h-3.5 w-3.5" />
      Performance at a Glance
    </motion.div>

    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {stats.map((s) => (
        <motion.div
          key={s.label}
          variants={itemVariants}
          whileHover={{ scale: 1.04, y: -3 }}
          className="group relative cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center backdrop-blur-sm transition-colors hover:border-electric-400/40 hover:bg-white/[0.08] sm:px-4 sm:py-4"
        >
          <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 shadow-[0_0_30px_rgba(10,132,255,0.25)] transition-opacity duration-300 group-hover:opacity-100" />

          <p className="bg-gradient-to-r from-[#ffb600] to-amber-300 bg-clip-text text-xl font-extrabold text-transparent sm:text-3xl">
            {s.value}
          </p>
          <p className="mt-1 text-[11px] font-medium text-white/70 sm:text-xs">
            {s.label}
          </p>
        </motion.div>
      ))}
    </motion.div>
  </div>
</section>
      </main>
    </div>
  );
}