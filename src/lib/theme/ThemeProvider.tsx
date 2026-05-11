"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  applyTheme,
  defaultTheme,
  mergeWithDefaults,
  readLocalTheme,
  writeLocalTheme,
  type ThemeValues,
} from "./theme";

type Ctx = {
  theme: ThemeValues;
  setField: (key: string, value: string) => void;
  setMany: (patch: Partial<ThemeValues>) => void;
  reset: () => void;
  loading: boolean;
  saving: boolean;
  saveError: string | null;
};

const ThemeCtx = createContext<Ctx | null>(null);

function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (!err) return false;
  if (err.code === "PGRST205" || err.code === "42P01") return true;
  return /schema cache|does not exist/i.test(err.message ?? "");
}

export function useThemeEngine() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useThemeEngine debe usarse dentro de <ThemeProvider>");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  // Sync local cache → CSS antes del primer paint disponible.
  const [theme, setTheme] = useState<ThemeValues>(() =>
    mergeWithDefaults(typeof window !== "undefined" ? readLocalTheme() : null)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aplica CSS variables cada vez que cambia el tema.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Carga inicial desde Supabase (autoritativo). Si difiere de localStorage, gana DB.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("user_preferences")
        .select("theme")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error && isMissingTableError(error)) {
        setSaveError(
          "Falta aplicar supabase/theme_ext.sql en la BD. Los cambios solo persisten en este navegador."
        );
      } else if (!error && data?.theme && typeof data.theme === "object") {
        const merged = mergeWithDefaults(data.theme as ThemeValues);
        setTheme(merged);
        writeLocalTheme(merged);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Persistencia diferida (debounce 600ms) tras cada cambio del usuario.
  const persist = useCallback(
    (next: ThemeValues) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setSaving(false);
          return;
        }
        const { error } = await supabase
          .from("user_preferences")
          .upsert(
            { user_id: user.id, theme: next, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        if (error) {
          if (isMissingTableError(error)) {
            setSaveError(
              "Falta aplicar supabase/theme_ext.sql en la BD. Cambios guardados solo en este navegador."
            );
          } else {
            setSaveError(error.message);
          }
        } else {
          setSaveError(null);
        }
        setSaving(false);
      }, 600);
    },
    [supabase]
  );

  const setField = useCallback(
    (key: string, value: string) => {
      setTheme((prev) => {
        const next = { ...prev, [key]: value };
        writeLocalTheme(next);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setMany = useCallback(
    (patch: Partial<ThemeValues>) => {
      setTheme((prev) => {
        const next: ThemeValues = { ...prev, ...patch } as ThemeValues;
        writeLocalTheme(next);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const reset = useCallback(() => {
    const next = defaultTheme();
    setTheme(next);
    writeLocalTheme(next);
    persist(next);
  }, [persist]);

  const value = useMemo<Ctx>(
    () => ({ theme, setField, setMany, reset, loading, saving, saveError }),
    [theme, setField, setMany, reset, loading, saving, saveError]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
