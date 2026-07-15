import { createFileRoute } from "@tanstack/react-router";
import { HeroCarousel } from "@/components/public/hero-carousel";
import { motion } from "framer-motion";

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
    }
  },
};

function HomePage() {
  return (
    <div className="flex flex-col w-full">
      <main className="flex-1">
        <HeroCarousel />

        {/* Stats Section */}
        <section className="bg-[#095a7d] overflow-hidden"> 
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show" // Starts animation as soon as the element enters the viewport
            viewport={{ once: true, margin: "-100px" }} // Triggers only once for professional smoothness
            className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-8 lg:grid-cols-4"
          >
            {stats.map((s) => (
              <motion.div 
                key={s.label} 
                variants={itemVariants}
                whileHover={{ scale: 1.05 }} // Subtle, satisfying hover scale
                className="px-2 text-center text-white cursor-pointer"
              >
                <p className="text-2xl font-extrabold text-[#ffb600] sm:text-4xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs font-medium sm:text-sm text-white/90">
                  {s.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </main>
    </div>
  );
}