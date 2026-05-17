"use client";

import { ArrowRight, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useOnboardingCtx } from "@/contexts/OnboardingContext";
import type { ModuloId } from "@/lib/sidebarModulos";
import { TOURS } from "./modulosTours";

/** Punto de entrada para insertar en la `page.tsx` de cada módulo.
 *  Muestra un modal con 2-3 slides la PRIMERA vez que el usuario entra. */
export function ModuloTourBoot({ id, label }: { id: ModuloId; label: string }) {
  const { modulosVistos, marcarVisto } = useOnboardingCtx();
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (!modulosVistos.has(id)) {
      // Pequeño retardo para no chocar con la animación de entrada de la página.
      const t = setTimeout(() => setOpen(true), 250);
      return () => clearTimeout(t);
    }
  }, [id, modulosVistos]);

  const slides = TOURS[id] ?? [];
  if (!slides.length) return null;

  const cerrar = async () => {
    setOpen(false);
    await marcarVisto(id);
  };

  const last = slide === slides.length - 1;

  return (
    <Modal open={open} onClose={cerrar} size="md" title={`Bienvenido a ${label}`}>
      <div className="min-h-[160px]">
        <h3 className="font-display text-lg font-bold text-text-hi">{slides[slide].title}</h3>
        <p className="mt-2 text-sm text-text-mid">{slides[slide].body}</p>
      </div>

      {/* Dots */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {slides.map((s, i) => (
          <span
            key={s.title}
            className={`h-1.5 rounded-full transition-all ${
              i === slide ? "w-6 bg-cyan" : "w-1.5 bg-indigo-400/30"
            }`}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={cerrar}
          className="text-xs font-medium text-text-mid underline-offset-4 hover:text-text-hi hover:underline"
        >
          Saltar
        </button>
        <button
          type="button"
          onClick={() => (last ? cerrar() : setSlide((s) => s + 1))}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-5 text-sm font-bold text-bg"
        >
          {last ? <Rocket size={14} /> : <ArrowRight size={14} />}
          {last ? "Empezar" : "Siguiente"}
        </button>
      </div>
    </Modal>
  );
}
