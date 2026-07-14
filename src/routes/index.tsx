import { createFileRoute } from "@tanstack/react-router";
import { HeroCarousel } from "@/components/public/hero-carousel";

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

function HomePage() {
  return (
    <div className="flex flex-col w-full">
      <main className="flex-1">
        <HeroCarousel />

        <section className="bg-[#095a7d]"> 
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-8 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="px-2 text-center text-white">
                <p className="text-2xl font-extrabold text-[#ffb600] sm:text-4xl">{s.value}</p>
                <p className="mt-1 text-xs font-medium sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}