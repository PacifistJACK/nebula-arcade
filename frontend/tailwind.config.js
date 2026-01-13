/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          blue: "#00f3ff",
          purple: "#bc13fe",
          green: "#0aff00",
          pink: "#ff00d4",
          bg: "#050510",
          card: "rgba(255, 255, 255, 0.05)"
        }
      },
      fontFamily: {
        orbitron: ['"Orbitron"', 'sans-serif'],
        inter: ['"Inter"', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 10s linear infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 1, filter: 'brightness(1.2) drop-shadow(0 0 10px rgba(0, 243, 255, 0.5))' },
          '50%': { opacity: 0.8, filter: 'brightness(1)' },
        }
      }
    },
  },
  plugins: [],
}
