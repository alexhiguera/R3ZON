import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#080714",
        indigo: {
          300: "#a5b4fc",
          400: "#818cf8",
          600: "#4f46e5",
          700: "#3730a3",
          800: "#312e81",
          900: "#1e1b4b",
        },
        cyan: { DEFAULT: "#22d3ee" },
        fuchsia: { DEFAULT: "#e879f9" },
        ok: "#34d399",
        warn: "#fb923c",
        danger: "#f87171",
        "text-hi": "#f0f4ff",
        "text-mid": "#c7d2fe",
      },
      fontFamily: {
        display: ["Syne", "system-ui", "sans-serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
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
