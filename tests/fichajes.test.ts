import { describe, it, expect } from "vitest";
import {
  calcularJornada,
  estadoTrabajador,
  fichajesDelDia,
  formatearDuracion,
  siguientesPermitidos,
  transicionValida,
  type Fichaje,
  type TipoFichaje,
} from "@/lib/fichajes";

function f(tipo: TipoFichaje, ts: string): Pick<Fichaje, "tipo" | "ts"> {
  return { tipo, ts };
}

// ── Máquina de estados ────────────────────────────────────────────────────────
describe("siguientesPermitidos / transicionValida", () => {
  it("sin fichaje previo solo permite entrada", () => {
    expect(siguientesPermitidos(null)).toEqual(["entrada"]);
    expect(transicionValida(null, "entrada")).toBe(true);
    expect(transicionValida(null, "salida")).toBe(false);
    expect(transicionValida(null, "inicio_descanso")).toBe(false);
    expect(transicionValida(null, "fin_descanso")).toBe(false);
  });

  it("tras entrada permite inicio_descanso o salida", () => {
    expect(siguientesPermitidos("entrada").sort()).toEqual(
      ["inicio_descanso", "salida"].sort(),
    );
    expect(transicionValida("entrada", "entrada")).toBe(false);
    expect(transicionValida("entrada", "fin_descanso")).toBe(false);
  });

  it("tras inicio_descanso solo permite fin_descanso", () => {
    expect(siguientesPermitidos("inicio_descanso")).toEqual(["fin_descanso"]);
    expect(transicionValida("inicio_descanso", "salida")).toBe(false);
    expect(transicionValida("inicio_descanso", "inicio_descanso")).toBe(false);
  });

  it("tras fin_descanso permite otro descanso o salida", () => {
    expect(siguientesPermitidos("fin_descanso").sort()).toEqual(
      ["inicio_descanso", "salida"].sort(),
    );
    expect(transicionValida("fin_descanso", "entrada")).toBe(false);
  });

  it("tras salida solo permite entrada (nuevo turno)", () => {
    expect(siguientesPermitidos("salida")).toEqual(["entrada"]);
    expect(transicionValida("salida", "salida")).toBe(false);
  });
});

// ── Estado visible ─────────────────────────────────────────────────────────────
describe("estadoTrabajador", () => {
  it("cubre los tres estados posibles", () => {
    expect(estadoTrabajador(null)).toBe("fuera");
    expect(estadoTrabajador("salida")).toBe("fuera");
    expect(estadoTrabajador("entrada")).toBe("trabajando");
    expect(estadoTrabajador("fin_descanso")).toBe("trabajando");
    expect(estadoTrabajador("inicio_descanso")).toBe("en_descanso");
  });
});

// ── calcularJornada ────────────────────────────────────────────────────────────
describe("calcularJornada", () => {
  it("devuelve ceros con lista vacía", () => {
    const r = calcularJornada([]);
    expect(r.trabajado_ms).toBe(0);
    expect(r.descanso_ms).toBe(0);
    expect(r.cerrada).toBe(false);
    expect(r.primera_entrada).toBeNull();
    expect(r.ultima_salida).toBeNull();
  });

  it("jornada cerrada simple (entrada → salida)", () => {
    const r = calcularJornada([
      f("entrada", "2026-05-04T08:00:00Z"),
      f("salida",  "2026-05-04T16:00:00Z"),
    ]);
    expect(r.trabajado_ms).toBe(8 * 3600_000);
    expect(r.descanso_ms).toBe(0);
    expect(r.cerrada).toBe(true);
    expect(r.primera_entrada).toBe("2026-05-04T08:00:00Z");
    expect(r.ultima_salida).toBe("2026-05-04T16:00:00Z");
  });

  it("descuenta correctamente un descanso intermedio", () => {
    const r = calcularJornada([
      f("entrada",         "2026-05-04T09:00:00Z"),
      f("inicio_descanso", "2026-05-04T13:00:00Z"),
      f("fin_descanso",    "2026-05-04T14:00:00Z"),
      f("salida",          "2026-05-04T18:00:00Z"),
    ]);
    expect(r.trabajado_ms).toBe(8 * 3600_000); // 4h + 4h
    expect(r.descanso_ms).toBe(1 * 3600_000);
    expect(r.cerrada).toBe(true);
  });

  it("acepta varios descansos en el mismo día", () => {
    const r = calcularJornada([
      f("entrada",         "2026-05-04T09:00:00Z"),
      f("inicio_descanso", "2026-05-04T11:00:00Z"),
      f("fin_descanso",    "2026-05-04T11:15:00Z"),
      f("inicio_descanso", "2026-05-04T14:00:00Z"),
      f("fin_descanso",    "2026-05-04T15:00:00Z"),
      f("salida",          "2026-05-04T18:00:00Z"),
    ]);
    // Trabajado: 2h + 2h45m + 3h = 7h45m
    expect(r.trabajado_ms).toBe((7 * 60 + 45) * 60_000);
    // Descanso: 15m + 60m = 75m
    expect(r.descanso_ms).toBe(75 * 60_000);
    expect(r.cerrada).toBe(true);
  });

  it("ordena fichajes desordenados correctamente", () => {
    const r = calcularJornada([
      f("salida",  "2026-05-04T16:00:00Z"),
      f("entrada", "2026-05-04T08:00:00Z"),
    ]);
    expect(r.trabajado_ms).toBe(8 * 3600_000);
    expect(r.cerrada).toBe(true);
  });

  it("jornada en curso suma hasta `ahora`", () => {
    const ahora = new Date("2026-05-04T12:30:00Z");
    const r = calcularJornada([f("entrada", "2026-05-04T09:00:00Z")], ahora);
    expect(r.trabajado_ms).toBe((3 * 60 + 30) * 60_000);
    expect(r.cerrada).toBe(false);
  });

  it("descanso en curso no cuenta como trabajado", () => {
    const ahora = new Date("2026-05-04T13:30:00Z");
    const r = calcularJornada(
      [
        f("entrada",         "2026-05-04T09:00:00Z"),
        f("inicio_descanso", "2026-05-04T13:00:00Z"),
      ],
      ahora,
    );
    expect(r.trabajado_ms).toBe(4 * 3600_000);
    expect(r.descanso_ms).toBe(30 * 60_000);
    expect(r.cerrada).toBe(false);
  });
});

// ── formatearDuracion ─────────────────────────────────────────────────────────
describe("formatearDuracion", () => {
  it("formatea correctamente con padding de minutos", () => {
    expect(formatearDuracion(0)).toBe("0h 00m");
    expect(formatearDuracion(60_000)).toBe("0h 01m");
    expect(formatearDuracion(3600_000)).toBe("1h 00m");
    expect(formatearDuracion(3600_000 + 5 * 60_000)).toBe("1h 05m");
    expect(formatearDuracion(8 * 3600_000 + 30 * 60_000)).toBe("8h 30m");
  });

  it("trata negativos como cero", () => {
    expect(formatearDuracion(-500_000)).toBe("0h 00m");
  });

  it("trunca segundos (no redondea hacia arriba)", () => {
    expect(formatearDuracion(3600_000 + 59_000)).toBe("1h 00m");
  });
});

// ── fichajesDelDia ─────────────────────────────────────────────────────────────
describe("fichajesDelDia", () => {
  it("filtra solo los del día local indicado", () => {
    const base  = new Date(2026, 4, 4, 0, 0, 0, 0); // 4 mayo 2026 00:00 local
    const hoy1  = new Date(2026, 4, 4, 9, 0).toISOString();
    const hoy2  = new Date(2026, 4, 4, 23, 30).toISOString();
    const ayer  = new Date(2026, 4, 3, 23, 59).toISOString();
    const manana = new Date(2026, 4, 5, 0, 1).toISOString();

    const todos = [{ ts: ayer }, { ts: hoy1 }, { ts: hoy2 }, { ts: manana }];
    const r = fichajesDelDia(todos, base);
    expect(r.map((x) => x.ts).sort()).toEqual([hoy1, hoy2].sort());
  });

  it("usa la fecha actual por defecto", () => {
    const ahora = new Date().toISOString();
    expect(fichajesDelDia([{ ts: ahora }])).toHaveLength(1);
  });
});
