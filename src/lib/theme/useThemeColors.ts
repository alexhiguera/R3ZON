"use client";

import { useEffect, useState } from "react";
import { useThemeEngine } from "./ThemeProvider";

export type ResolvedColors = {
  cyan: string;
  fuchsia: string;
  indigo300: string;
  indigo400: string;
  indigo600: string;
  indigo800: string;
  indigo900: string;
  bg: string;
  textHi: string;
  textMid: string;
  axis: string; // alias semántico para ejes de charts
  grid: string; // alias para grid
  cursorBg: string;
};

function readVar(name: string): string {
  if (typeof window === "undefined") return "0 0 0";
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || "0 0 0";
}

function rgb(name: string, alpha = 1): string {
  const t = readVar(name);
  return alpha === 1
    ? `rgb(${t.replace(/\s+/g, ", ")})`
    : `rgba(${t.replace(/\s+/g, ", ")}, ${alpha})`;
}

function snapshot(): ResolvedColors {
  return {
    cyan: rgb("--cyan"),
    fuchsia: rgb("--fuchsia"),
    indigo300: rgb("--indigo-300"),
    indigo400: rgb("--indigo-400"),
    indigo600: rgb("--indigo-600"),
    indigo800: rgb("--indigo-800"),
    indigo900: rgb("--indigo-900"),
    bg: rgb("--bg"),
    textHi: rgb("--text-hi"),
    textMid: rgb("--text-mid"),
    axis: rgb("--indigo-400"),
    grid: rgb("--indigo-600", 0.12),
    cursorBg: rgb("--indigo-600", 0.08),
  };
}

/**
 * Devuelve los colores actuales del tema como strings rgb() listos para
 * pasarse a Recharts u otras libs que esperan colores literales.
 * Se re-evalúa cada vez que el ThemeProvider notifica un cambio.
 */
export function useThemeColors(): ResolvedColors {
  const { theme } = useThemeEngine();
  const [colors, setColors] = useState<ResolvedColors>(() => snapshot());

  useEffect(() => {
    // Espera un frame a que apply() escriba las CSS vars antes de leer.
    const id = requestAnimationFrame(() => setColors(snapshot()));
    return () => cancelAnimationFrame(id);
  }, [theme]);

  return colors;
}
