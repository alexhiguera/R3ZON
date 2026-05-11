import { describe, it, expect } from "vitest";
import {
  añadirItem,
  aplicarMovimiento,
  calcularTotalVenta,
  cambiarCantidad,
  colorCategoria,
  eliminarItem,
  estadoStock,
  eur,
  type ItemTPV,
} from "@/lib/inventario";

const prod = (over: Partial<{ id: string; nombre: string; precio_venta: number; iva_pct: number }> = {}) => ({
  id: "p1", nombre: "Café", precio_venta: 1.5, iva_pct: 10, ...over,
});

// ── estadoStock ────────────────────────────────────────────────────────────
describe("estadoStock", () => {
  it("sin_stock cuando el producto no rastrea inventario", () => {
    expect(estadoStock({ stock_tracking: false, stock_actual: 0, stock_minimo: 0 })).toBe("sin_stock");
    expect(estadoStock({ stock_tracking: false, stock_actual: 100, stock_minimo: 5 })).toBe("sin_stock");
  });

  it("agotado cuando stock_actual <= 0", () => {
    expect(estadoStock({ stock_tracking: true, stock_actual: 0,    stock_minimo: 5 })).toBe("agotado");
    expect(estadoStock({ stock_tracking: true, stock_actual: -1,   stock_minimo: 5 })).toBe("agotado");
  });

  it("bajo cuando stock_actual <= stock_minimo (>0)", () => {
    expect(estadoStock({ stock_tracking: true, stock_actual: 3, stock_minimo: 5 })).toBe("bajo");
    expect(estadoStock({ stock_tracking: true, stock_actual: 5, stock_minimo: 5 })).toBe("bajo");
  });

  it("ok en otro caso", () => {
    expect(estadoStock({ stock_tracking: true, stock_actual: 10, stock_minimo: 5 })).toBe("ok");
    // Sin mínimo configurado y con stock positivo → ok (no bajo).
    expect(estadoStock({ stock_tracking: true, stock_actual: 1,  stock_minimo: 0 })).toBe("ok");
  });
});

// ── aplicarMovimiento ──────────────────────────────────────────────────────
describe("aplicarMovimiento", () => {
  it("suma cantidades firmadas", () => {
    expect(aplicarMovimiento(10, { cantidad: -3 })).toBe(7);
    expect(aplicarMovimiento(10, { cantidad: 5 })).toBe(15);
  });
  it("redondea a 3 decimales (kg/l)", () => {
    expect(aplicarMovimiento(0, { cantidad: 0.1 + 0.2 })).toBe(0.3);
  });
  it("trata cantidades no numéricas como cero", () => {
    expect(aplicarMovimiento(5, { cantidad: NaN })).toBe(5);
  });
});

// ── calcularTotalVenta ─────────────────────────────────────────────────────
describe("calcularTotalVenta", () => {
  it("ticket vacío → ceros", () => {
    const r = calcularTotalVenta([]);
    expect(r.subtotal).toBe(0);
    expect(r.iva_total).toBe(0);
    expect(r.total).toBe(0);
    expect(r.num_items).toBe(0);
    expect(r.num_unidades).toBe(0);
  });

  it("una línea con IVA 10%", () => {
    const r = calcularTotalVenta([
      { producto_id: "p1", nombre: "Café", cantidad: 2, precio_unit: 1.5, iva_pct: 10, descuento_pct: 0 },
    ]);
    expect(r.subtotal).toBe(3);
    expect(r.iva_total).toBe(0.3);
    expect(r.total).toBe(3.3);
    expect(r.num_unidades).toBe(2);
  });

  it("aplica descuento por línea sobre la base", () => {
    const r = calcularTotalVenta([
      { producto_id: "p1", nombre: "X", cantidad: 1, precio_unit: 100, iva_pct: 21, descuento_pct: 50 },
    ]);
    expect(r.subtotal).toBe(50);
    expect(r.iva_total).toBe(10.5);
    expect(r.total).toBe(60.5);
  });

  it("mezcla de IVAs (restaurante: bebida 21 + comida 10)", () => {
    const r = calcularTotalVenta([
      { producto_id: "b", nombre: "Cerveza", cantidad: 2, precio_unit: 3,  iva_pct: 21, descuento_pct: 0 },
      { producto_id: "c", nombre: "Menú",    cantidad: 1, precio_unit: 12, iva_pct: 10, descuento_pct: 0 },
    ]);
    expect(r.subtotal).toBe(18);          // 6 + 12
    expect(r.iva_total).toBe(2.46);       // 1.26 + 1.20
    expect(r.total).toBe(20.46);
    expect(r.num_items).toBe(2);
    expect(r.num_unidades).toBe(3);
  });
});

// ── añadirItem ─────────────────────────────────────────────────────────────
describe("añadirItem", () => {
  it("añade un producto nuevo al ticket", () => {
    const r = añadirItem([], prod());
    expect(r).toHaveLength(1);
    expect(r[0].producto_id).toBe("p1");
    expect(r[0].cantidad).toBe(1);
  });

  it("incrementa cantidad si ya existe sin descuento", () => {
    const inicio: ItemTPV[] = [
      { producto_id: "p1", nombre: "Café", cantidad: 1, precio_unit: 1.5, iva_pct: 10, descuento_pct: 0 },
    ];
    const r = añadirItem(inicio, prod());
    expect(r).toHaveLength(1);
    expect(r[0].cantidad).toBe(2);
  });

  it("crea nueva línea si la existente tiene descuento (no debe agruparlas)", () => {
    const inicio: ItemTPV[] = [
      { producto_id: "p1", nombre: "Café", cantidad: 1, precio_unit: 1.5, iva_pct: 10, descuento_pct: 50 },
    ];
    const r = añadirItem(inicio, prod());
    expect(r).toHaveLength(2);
  });
});

// ── cambiarCantidad / eliminarItem ─────────────────────────────────────────
describe("cambiarCantidad y eliminarItem", () => {
  const items: ItemTPV[] = [
    { producto_id: "a", nombre: "A", cantidad: 1, precio_unit: 1, iva_pct: 21, descuento_pct: 0 },
    { producto_id: "b", nombre: "B", cantidad: 2, precio_unit: 1, iva_pct: 21, descuento_pct: 0 },
  ];

  it("cambia la cantidad", () => {
    const r = cambiarCantidad(items, 0, 5);
    expect(r[0].cantidad).toBe(5);
    expect(r[1].cantidad).toBe(2);
  });

  it("eliminar al poner cantidad <= 0", () => {
    const r = cambiarCantidad(items, 0, 0);
    expect(r).toHaveLength(1);
    expect(r[0].producto_id).toBe("b");
  });

  it("elimina por índice", () => {
    const r = eliminarItem(items, 1);
    expect(r).toHaveLength(1);
    expect(r[0].producto_id).toBe("a");
  });
});

// ── helpers ────────────────────────────────────────────────────────────────
describe("helpers", () => {
  it("eur con 2 decimales y €", () => {
    expect(eur(1.5)).toMatch(/1,50/);
    expect(eur(1.5)).toMatch(/€/);
    expect(eur(NaN)).toMatch(/0,00/);
  });

  it("colorCategoria es estable y único por entrada", () => {
    expect(colorCategoria("bebidas")).toBe(colorCategoria("bebidas"));
    expect(colorCategoria("bebidas")).not.toBe(colorCategoria("comida"));
    expect(colorCategoria(null)).toMatch(/#/);
  });
});
