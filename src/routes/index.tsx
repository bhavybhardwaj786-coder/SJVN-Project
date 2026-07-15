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

        {/* Updated Information Section */}
        <section className="bg-[#095a7d] text-white py-10 px-4">
          <div className="mx-auto max-w-4xl text-center flex flex-col items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold">SJVN Limited</h2>
            <p className="text-sm md:text-base opacity-90">
              (A Joint Venture of Govt. of India & Govt. of Himachal Pradesh)
            </p>
            <p className="text-sm opacity-80">
              Corporate Office, Shanan, Shimla, Himachal Pradesh 171006
            </p>
            <div className="flex flex-col md:flex-row gap-4 mt-2 font-medium">
              <p>+91 177 2660 075</p>
              <a href="mailto:info@sjvn.nic.in" className="hover:underline">info@sjvn.nic.in</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}