"use client";

import { useEffect } from "react";

/**
 * Boundary del nivel raíz: se monta si falla el propio `layout.tsx` o el
 * `error.tsx` global. Debe incluir su propio <html>/<body> porque sustituye
 * al root layout. Mantenemos el estilo glass con CSS inline mínimo para que
 * funcione incluso si los estilos globales no han cargado.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("global_error_boundary", error);
    }
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "rgb(8 7 20)",
          color: "rgb(240 244 255)",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: 520, textAlign: "center" }}>
          <div
            style={{
              padding: "2rem",
              borderRadius: 24,
              border: "1px solid rgba(129, 140, 248, 0.25)",
              background: "rgba(30, 27, 75, 0.55)",
              backdropFilter: "blur(16px)",
            }}
          >
            <h1 style={{ fontSize: "1.75rem", margin: 0, fontWeight: 800 }}>
              No hemos podido cargar la aplicación
            </h1>
            <p
              style={{ marginTop: "1rem", color: "rgba(240, 244, 255, 0.7)", fontSize: "0.95rem" }}
            >
              Algo ha fallado al inicializar ANTARES. Por favor, recarga la página o vuelve a
              intentarlo en unos segundos.
            </p>
            {error?.digest && (
              <p
                style={{
                  marginTop: "0.5rem",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "rgba(240, 244, 255, 0.4)",
                }}
              >
                ref: {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "1.5rem",
                padding: "0.65rem 1.25rem",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                color: "rgb(8 7 20)",
                background: "linear-gradient(90deg, rgb(34 211 238), rgb(232 121 249))",
              }}
            >
              Reintentar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
