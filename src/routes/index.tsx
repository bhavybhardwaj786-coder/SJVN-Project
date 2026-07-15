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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

function HomePage() {
  return (
    <div className="flex flex-col w-full">
      <main className="flex-1">
        <HeroCarousel />

        {/* Stats Section */}
        
      </main>
    </div>
  );
}