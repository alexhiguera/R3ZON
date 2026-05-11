import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme Engine: las CSS vars guardan "r g b" (sin coma) para que los
        // modificadores de alpha (bg-cyan/20, border-indigo-400/40) sigan
        // funcionando cuando el usuario cambia la paleta.
        bg:        "rgb(var(--bg) / <alpha-value>)",
        indigo: {
          300:     "rgb(var(--indigo-300) / <alpha-value>)",
          400:     "rgb(var(--indigo-400) / <alpha-value>)",
          600:     "rgb(var(--indigo-600) / <alpha-value>)",
          700:     "rgb(var(--indigo-700) / <alpha-value>)",
          800:     "rgb(var(--indigo-800) / <alpha-value>)",
          900:     "rgb(var(--indigo-900) / <alpha-value>)",
        },
        cyan:    { DEFAULT: "rgb(var(--cyan)    / <alpha-value>)" },
        fuchsia: { DEFAULT: "rgb(var(--fuchsia) / <alpha-value>)" },
        ok: "#34d399",
        warn: "#fb923c",
        danger: "#f87171",
        "text-hi":  "rgb(var(--text-hi)  / <alpha-value>)",
        "text-mid": "rgb(var(--text-mid) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Syne", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "DM Sans", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "18px", kpi: "16px" },
      backdropBlur: { glass: "14px" },
      boxShadow: {
        glass: "0 22px 60px rgba(99,102,241,0.20)",
        glow: "0 0 30px rgba(99,102,241,0.55)",
      },
      backgroundImage: {
        "rainbow":
          "linear-gradient(90deg, #6366f1, #22d3ee, #e879f9, #6366f1)",
        "accent": "linear-gradient(90deg, #22d3ee, #e879f9)",
        "glass":
          "linear-gradient(135deg, rgba(49,46,129,0.38), rgba(30,27,75,0.65))",
        "glass-strong":
          "linear-gradient(135deg, rgba(49,46,129,0.52), rgba(30,27,75,0.74))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
