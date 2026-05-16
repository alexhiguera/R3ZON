"use client";

/**
 * Wrapper de Tesseract.js — corre 100% en navegador (WebAssembly).
 *
 * Soporta imágenes (JPG/PNG/WEBP) y PDFs. Para los PDF intentamos primero
 * extraer el texto directamente con pdfjs (la mayoría de facturas tienen
 * texto seleccionable, más rápido y exacto que el OCR). Si el PDF está
 * escaneado (sin capa de texto), renderizamos cada página a canvas y
 * pasamos el resultado por Tesseract.
 */
import type { ImageLike } from "tesseract.js";

const PDF_TEXT_MIN_CHARS = 50;

export async function ocrImagen(
  file: File | Blob | string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const esPdf = file instanceof File && file.type === "application/pdf";

  if (esPdf) {
    return await procesarPdf(file as File, onProgress);
  }

  return await ocrConTesseract(file, onProgress);
}

async function procesarPdf(file: File, onProgress?: (pct: number) => void): Promise<string> {
  // Carga perezosa: pdfjs pesa ~400 KB; no queremos meterlo en el bundle
  // principal cuando el usuario sube imágenes.
  const pdfjs = await import("pdfjs-dist");
  // En Next.js el worker se sirve como módulo ES — apuntamos al .mjs
  // empaquetado en `node_modules`. `new URL(..., import.meta.url)` deja que
  // el bundler resuelva la ruta correcta en build.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;

  // Paso 1 — intentar extraer texto seleccionable de todas las páginas.
  onProgress?.(5);
  const textoPaginas: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const linea = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .filter(Boolean)
      .join(" ");
    if (linea) textoPaginas.push(linea);
    onProgress?.(5 + Math.round((20 * i) / pdf.numPages));
  }
  const textoDirecto = textoPaginas.join("\n").trim();
  if (textoDirecto.length >= PDF_TEXT_MIN_CHARS) {
    onProgress?.(100);
    return textoDirecto;
  }

  // Paso 2 — PDF escaneado (o casi sin texto). Renderizamos a canvas y OCR.
  const trozos: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Tu navegador no soporta canvas 2D.");
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const base = 25 + Math.round((75 * (i - 1)) / pdf.numPages);
    const span = 75 / pdf.numPages;
    const textoPagina = await ocrConTesseract(canvas, (pct) =>
      onProgress?.(base + Math.round((span * pct) / 100)),
    );
    trozos.push(textoPagina);
  }
  return trozos.join("\n");
}

async function ocrConTesseract(
  source: File | Blob | string | HTMLCanvasElement,
  onProgress?: (pct: number) => void,
): Promise<string> {
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
    const { data } = await worker.recognize(source as ImageLike);
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
