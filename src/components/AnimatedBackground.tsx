import { useMemo } from 'react';
import { motion } from 'framer-motion';

type Particle = {
  x: number;
  y: number;
  r: number;
  dur: number;
  delay: number;
  hue: 'blue' | 'emerald' | 'cyan';
};

function seeded(count: number): Particle[] {
  const arr: Particle[] = [];
  let s = 1337;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const hues: Particle['hue'][] = ['blue', 'emerald', 'cyan'];
  for (let i = 0; i < count; i++) {
    arr.push({
      x: rand() * 100,
      y: rand() * 100,
      r: 1 + rand() * 2.4,
      dur: 8 + rand() * 14,
      delay: rand() * 8,
      hue: hues[Math.floor(rand() * hues.length)],
    });
  }
  return arr;
}

const hueColor: Record<Particle['hue'], string> = {
  blue: 'rgba(47,155,255,0.9)',
  emerald: 'rgba(45,212,191,0.85)',
  cyan: 'rgba(34,211,238,0.85)',
};

export default function AnimatedBackground() {
  const particles = useMemo(() => seeded(46), []);
  const nodes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: 8 + ((i * 37) % 84),
        y: 10 + ((i * 53) % 80),
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-navy-950">
      {/* Base radial wash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#0a2244_0%,#071A35_45%,#040d1c_100%)]" />

      {/* Moving gradient mesh blobs */}
      <motion.div
        className="absolute -left-40 top-[-10%] h-[55vh] w-[55vh] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(10,132,255,0.32), transparent 70%)' }}
        animate={{ x: [0, 60, -20, 0], y: [0, 40, -30, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-15%] top-[20%] h-[50vh] w-[50vh] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.26), transparent 70%)' }}
        animate={{ x: [0, -50, 30, 0], y: [0, 30, -20, 0], scale: [1, 1.1, 1.05, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-[30%] bottom-[-20%] h-[48vh] w-[48vh] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.2), transparent 70%)' }}
        animate={{ x: [0, 40, -40, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.92, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Animated grid */}
      <div className="absolute inset-0 bg-grid mask-fade-b opacity-60" />

      {/* Network SVG: nodes + connections */}
      <svg className="absolute inset-0 h-full w-full opacity-50" preserveAspectRatio="none">
        {nodes.map((n, i) => {
          const m = nodes[(i + 1) % nodes.length];
          return (
            <line
              key={`l-${i}`}
              x1={`${n.x}%`}
              y1={`${n.y}%`}
              x2={`${m.x}%`}
              y2={`${m.y}%`}
              stroke="url(#netGrad)"
              strokeWidth={0.6}
              strokeDasharray="6 10"
              className="animate-dash-flow"
              opacity={0.5}
            />
          );
        })}
        {nodes.map((n) => (
          <motion.circle
            key={`n-${n.id}`}
            cx={`${n.x}%`}
            cy={`${n.y}%`}
            r={2.4}
            fill="#5fb8ff"
            animate={{ opacity: [0.3, 1, 0.3], r: [2, 3.4, 2] }}
            transition={{ duration: 4 + (n.id % 5), repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        <defs>
          <linearGradient id="netGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0a84ff" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating particles */}
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.r * 2,
            height: p.r * 2,
            background: hueColor[p.hue],
            boxShadow: `0 0 ${p.r * 5}px ${hueColor[p.hue]}`,
          }}
          animate={{ y: [0, -30, 0], opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Soft glowing horizontal lines */}
      <motion.div
        className="absolute left-0 right-0 top-1/3 h-px"
        style={{ background: 'linear-gradient(90deg,transparent,rgba(47,155,255,0.5),transparent)' }}
        animate={{ opacity: [0.2, 0.7, 0.2], scaleX: [0.8, 1, 0.8] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-0 right-0 top-2/3 h-px"
        style={{ background: 'linear-gradient(90deg,transparent,rgba(45,212,191,0.45),transparent)' }}
        animate={{ opacity: [0.15, 0.6, 0.15], scaleX: [1, 0.85, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,6,15,0.7)_100%)]" />
    </div>
  );
}
