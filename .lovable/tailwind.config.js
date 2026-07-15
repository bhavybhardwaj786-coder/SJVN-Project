/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#040d1c',
          900: '#071A35',
          800: '#0a2244',
          700: '#0e2d5a',
          600: '#13356f',
        },
        midnight: {
          900: '#02060f',
          800: '#050c1a',
          700: '#081225',
        },
        electric: {
          300: '#5fb8ff',
          400: '#2f9bff',
          500: '#0a84ff',
          600: '#0066d6',
        },
        emerald2: {
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#10b981',
          600: '#059669',
        },
        cyan2: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(10,132,255,0.25)',
        'glow-emerald': '0 0 40px rgba(16,185,129,0.22)',
        glass: '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'gradient-pan': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'float-slow': {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        'dash-flow': {
          to: { strokeDashoffset: '-1000' },
        },
      },
      animation: {
        'gradient-pan': 'gradient-pan 8s ease infinite',
        'pulse-ring': 'pulse-ring 2.4s ease-out infinite',
        'float-slow': 'float-slow 7s ease-in-out infinite',
        'spin-slow': 'spin-slow 24s linear infinite',
        'dash-flow': 'dash-flow 20s linear infinite',
      },
    },
  },
  plugins: [],
};
