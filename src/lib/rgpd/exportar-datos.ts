import { strToU8, zipSync } from "fflate";
import { createClient } from "@/lib/supabase/client";

type TablaExportable =
  | "clientes"
  | "citas"
  | "tareas_kanban"
  | "finanzas"
  | "documentos"
  | "comunicaciones"
  | "perfiles_negocio"
  | "consentimientos_rgpd";

// Mapeo nombre lógico → nombre real en la base de datos.
const TABLAS: { archivo: string; tabla: string }[] = [
  { archivo: "clientes", tabla: "clientes" },
  { archivo: "citas", tabla: "agenda_eventos" },
  { archivo: "tareas_kanban", tabla: "tareas_kanban" },
  { archivo: "finanzas", tabla: "finanzas" },
  { archivo: "documentos", tabla: "documentos" },
  { archivo: "comunicaciones", tabla: "comunicaciones" },
  { archivo: "perfiles_negocio", tabla: "perfiles_negocio" },
  { archivo: "consentimientos_rgpd", tabla: "consentimientos_rgpd" },
];

export type ResultadoExport = {
  blob: Blob;
  filename: string;
  incidencias: string[];
};

function fechaIso(): string {
  return new Date().toISOString();
}

function fechaFichero(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export async function exportarMisDatos(): Promise<ResultadoExport> {
  const supabase = createClient();
  const incidencias: string[] = [];
  const archivos: Record<string, Uint8Array> = {};

  // Email del usuario.
  let email = "desconocido";
  try {
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? "desconocido";
  } catch (err) {
    incidencias.push(`No se pudo obtener el email del usuario: ${String(err)}`);
  }

  // Volcar cada tabla a un JSON dentro del ZIP.
  const incluidos: string[] = [];
  for (const { archivo, tabla } of TABLAS) {
    try {
      // Tipado dinámico: las tablas se acceden por nombre en tiempo de ejecución.
      // `from` espera literales del esquema, pero aquí es seguro porque la RLS
      // filtra por tenant y solo iteramos sobre tablas conocidas.
      const { data, error } = await supabase.from(tabla as never).select("*");
      if (error) {
        incidencias.push(`Tabla "${tabla}" omitida: ${error.message}`);
        continue;
      }
      const json = JSON.stringify(data ?? [], null, 2);
      archivos[`${archivo}.json`] = strToU8(json);
      incluidos.push(`${archivo}.json (${(data ?? []).length} registros)`);
    } catch (err) {
      incidencias.push(`Tabla "${tabla}" falló: ${String(err)}`);
    }
  }

  const readme = [
    "R3ZON ANTARES — Exportación RGPD",
    "====================================",
    "",
    `Fecha de generación: ${fechaIso()}`,
    `Usuario: ${email}`,
    "",
    "Archivos incluidos:",
    ...incluidos.map((l) => `  - ${l}`),
    "",
    incidencias.length > 0 ? "Incidencias durante la generación:" : "Sin incidencias.",
    ...incidencias.map((l) => `  - ${l}`),
    "",
    "Derechos RGPD",
    "-------------",
    "Conforme al Reglamento (UE) 2016/679 y la LOPDGDD, puedes ejercer los",
    "siguientes derechos sobre tus datos personales:",
    "  - Acceso: conocer qué datos tenemos sobre ti (este ZIP los recopila).",
    "  - Rectificación: corregir datos inexactos.",
    "  - Supresión: solicitar el borrado de tus datos.",
    "  - Limitación: restringir el tratamiento.",
    "  - Portabilidad: recibir y trasladar tus datos en formato estructurado (este ZIP).",
    "  - Oposición: oponerte al tratamiento.",
    "",
    "Para ejercer estos derechos, contacta con el responsable del tratamiento.",
    "",
  ].join("\n");
  archivos["README.txt"] = strToU8(readme);

  const zipped = zipSync(archivos);
  const blob = new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
  const filename = `r3zon-datos-${fechaFichero()}.zip`;

  return { blob, filename, incidencias };
}

// Mantener referencia al tipo por si se quiere usar fuera.
export type { TablaExportable };
