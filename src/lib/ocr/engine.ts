"use client";

/**
 * Wrapper de Tesseract.js — corre 100% en navegador (WebAssembly).
 * El worker descarga el modelo de español la primera vez (~5 MB) y lo cachea.
 */
import type { ImageLike } from "tesseract.js";

let _workerPromise: Promise<any> | null = null;

async function getWorker() {
  if (_workerPromise) return _workerPromise;
  _workerPromise = (async () => {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker(["spa", "eng"], 1, {
      logger: () => {}, // silencioso; engueche si quieres progreso
    });
    return worker;
  })();
  return _workerPromise;
}

export async function ocrImagen(
  file: File | Blob | string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker(["spa", "eng"], 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  try {
    const { data } = await worker.recognize(file as ImageLike);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
