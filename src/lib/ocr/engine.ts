"use client";

/**
 * Wrapper de Tesseract.js — corre 100% en navegador (WebAssembly).
 * El worker descarga el modelo de español la primera vez (~5 MB desde
 * tessdata.projectnaptha.com) y queda cacheado para futuras llamadas.
 */
import type { ImageLike } from "tesseract.js";

export async function ocrImagen(
  file: File | Blob | string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  if (file instanceof File && file.type === "application/pdf") {
    throw new Error(
      "Los PDFs no se procesan automáticamente todavía. Súbelo como imagen (JPG/PNG) — puedes hacerle una captura.",
    );
  }

  const Tesseract = await import("tesseract.js");
  let worker: Awaited<ReturnType<typeof Tesseract.createWorker>> | null = null;
  try {
    worker = await Tesseract.createWorker(["spa", "eng"], 1, {
      logger: (m) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });
    const { data } = await worker.recognize(file as ImageLike);
    return data.text ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `No se pudo leer la imagen (${msg || "error desconocido"}). Comprueba tu conexión y vuelve a intentarlo.`,
    );
  } finally {
    if (worker) await worker.terminate();
  }
}
