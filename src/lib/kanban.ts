export type Columna = {
  id: string;
  nombre: string;
  slug: string;
  color: string;
  posicion: number;
};

export type Tarea = {
  id: string;
  titulo: string;
  descripcion: string | null;
  columna: string; // slug de la columna
  prioridad: "baja" | "normal" | "alta" | "urgente";
  posicion: number;
  fecha_limite: string | null;
  etiquetas: string[];
  cliente_id: string | null;
  completada: boolean;
};

export const PRIORIDAD_META: Record<
  Tarea["prioridad"],
  { label: string; color: string; dot: string }
> = {
  baja: { label: "Baja", color: "text-indigo-300", dot: "bg-indigo-400" },
  normal: { label: "Normal", color: "text-text-mid", dot: "bg-indigo-300" },
  alta: { label: "Alta", color: "text-warn", dot: "bg-warn" },
  urgente: { label: "Urgente", color: "text-danger", dot: "bg-danger" },
};

export const COLORES_COLUMNA = [
  "#818cf8",
  "#22d3ee",
  "#e879f9",
  "#34d399",
  "#fb923c",
  "#f87171",
  "#a78bfa",
  "#60a5fa",
];
