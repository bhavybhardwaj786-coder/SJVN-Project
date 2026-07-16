import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import heroHydro from "@/assets/hero-hydro.jpeg";
import heroGreen from "@/assets/hero-green.jpeg";
import heroTransmission from "@/assets/hero-transmission.jpeg";

import { motion, AnimatePresence } from "framer-motion";

interface Slide {
  image: string;
  eyebrow: string;
  title: string;
  text: string;
}

const slides: Slide[] = [
    {
    image: heroHydro,
    eyebrow: "Clean Hydro Power",
    title: "Powering the Nation with Himalayan Rivers",
    text: "Delivering reliable, renewable hydroelectric energy from the mountains to millions of homes.",
  },
  {
    image: heroGreen,
    eyebrow: "Renewable Energy",
    title: "Building a Greener, Sustainable Tomorrow",
    text: "Expanding our solar and wind portfolio to accelerate India's transition to clean energy.",
  },
  {
    image: heroTransmission,
    eyebrow: "Power Transmission",
    title: "Connecting Energy Across Every Corner",
    text: "A robust transmission network carrying power reliably across states and regions.",
  },
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), []);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + slides.length) % slides.length),
    [],
  );

  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <section
      className="relative w-full overflow-hidden"
      // Fills exactly the space left over after the live header and footer
      // heights (published by SiteHeader/SiteFooter via useCssVarHeight) are
      // subtracted from the viewport, so header + hero + footer always fit
      // one screen with no page scroll. Falls back to a sane min-height
      // before those variables are set on first paint.
      style={{
        height:
          "calc(100dvh - var(--header-height, 0px) - var(--footer-height, 0px))",
        minHeight: 280,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
        key={slides[index].title}
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{
          duration: 1,
          ease: "easeInOut",
        }}
        className="absolute inset-0"
        >
        {slides.map((slide, i) => (
        <div
          key={slide.title}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === index ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={i !== index}
        >
          <motion.img
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 7,
            ease: "linear",
          }}

            src={slide.image}
            alt={slide.title}
            width={1600}
            height={720}
            className="h-full w-full object-cover"
            fetchPriority={i === 0 ? "high" : "low"}
          />
          <div
  className="absolute inset-0 bg-gradient-to-r from-[#004A99]/90 via-[#005BAC]/70 to-[#00843D]/35"
/>
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-4">
              <motion.div
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeOut",}}
            className="max-w-xl rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8 text-white"
            >
                <span className="inline-block rounded bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wide text-gold-foreground">
                  {slide.eyebrow}
                </span>
                <h2 className="mt-4 text-2xl font-extrabold leading-tight drop-shadow sm:text-4xl lg:text-5xl">
                  {slide.title}
                </h2>
                <p className="mt-3 text-sm text-brand-foreground/90 sm:text-lg">
                  {slide.text}
                </p>
              </motion.div>
            </div>
          </div>
        </div>
        ))}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur transition-colors hover:bg-white/40"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur transition-colors hover:bg-white/40"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {slides.map((s, i) => (
          <button
            key={s.title}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={cn(
              "h-2.5 rounded-full transition-all",
              i === index ? "w-7 bg-gold" : "w-2.5 bg-white/60",
            )}
          />
        ))}
      </div>
    </section>
  );
}