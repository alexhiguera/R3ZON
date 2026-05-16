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
        bg: "rgb(var(--bg) / <alpha-value>)",
        indigo: {
          300: "rgb(var(--indigo-300) / <alpha-value>)",
          400: "rgb(var(--indigo-400) / <alpha-value>)",
          600: "rgb(var(--indigo-600) / <alpha-value>)",
          700: "rgb(var(--indigo-700) / <alpha-value>)",
          800: "rgb(var(--indigo-800) / <alpha-value>)",
          900: "rgb(var(--indigo-900) / <alpha-value>)",
        },
        cyan: { DEFAULT: "rgb(var(--cyan)    / <alpha-value>)" },
        fuchsia: { DEFAULT: "rgb(var(--fuchsia) / <alpha-value>)" },
        ok: "#34d399",
        warn: "#fb923c",
        danger: "#f87171",
        "text-hi": "rgb(var(--text-hi)  / <alpha-value>)",
        "text-mid": "rgb(var(--text-mid) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Syne", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "DM Sans", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "18px", kpi: "16px" },
      backdropBlur: { glass: "14px" },
      boxShadow: {
        glass: "0 22px 60px rgb(var(--indigo-600) / 0.20)",
        glow: "0 0 30px rgb(var(--indigo-600) / 0.55)",
      },
      backgroundImage: {
        rainbow:
          "linear-gradient(90deg, rgb(var(--indigo-600)), rgb(var(--cyan)), rgb(var(--fuchsia)), rgb(var(--indigo-600)))",
        accent: "linear-gradient(90deg, rgb(var(--cyan)), rgb(var(--fuchsia)))",
        glass:
          "linear-gradient(135deg, rgb(var(--indigo-800) / 0.38), rgb(var(--indigo-900) / 0.65))",
        "glass-strong":
          "linear-gradient(135deg, rgb(var(--indigo-800) / 0.52), rgb(var(--indigo-900) / 0.74))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
