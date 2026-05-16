"use client";

import {
  type ClienteSnapshot,
  calcularTotales,
  type EmisorSnapshot,
  ETIQUETA_TIPO,
  eur,
  FORMATO_TIPO,
  type FormatoDocumento,
  type LineaDocumento,
  referenciaDocumento,
  type TipoDocumento,
} from "@/lib/documentos";
import { formatearFechaLarga } from "@/lib/formato";

export type ColoresDocumento = {
  primario: string; // cabecera, total, líneas separadoras
  texto: string; // color de texto principal
  acento: string; // fondo tabla cabecera
  acentoSuave: string; // fondo box cliente
};

const COLORES_POR_DEFECTO: ColoresDocumento = {
  primario: "#4f46e5",
  texto: "#0f172a",
  acento: "#eef2ff",
  acentoSuave: "#f8fafc",
};

export type PlantillaProps = {
  tipo: TipoDocumento;
  serie: string;
  numero: number | null;
  anio: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  emisor: EmisorSnapshot;
  cliente: ClienteSnapshot;
  lineas: LineaDocumento[];
  irpf_pct: number;
  notas: string | null;
  condiciones_pago: string | null;
  metodo_pago: string | null;
  colores?: Partial<ColoresDocumento>;
  /** Permite forzar el formato (p. ej. previsualizar un ticket en A4). */
  formato?: FormatoDocumento;
};

export function PlantillaDocumento(props: PlantillaProps) {
  const formato = props.formato ?? FORMATO_TIPO[props.tipo];
  const colores: ColoresDocumento = { ...COLORES_POR_DEFECTO, ...(props.colores ?? {}) };

  return formato === "ticket" ? (
    <PlantillaTicket {...props} colores={colores} />
  ) : (
    <PlantillaA4 {...props} colores={colores} />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Plantilla A4 — factura, presupuesto, albarán, proforma, recibo
// ──────────────────────────────────────────────────────────────────────────
function PlantillaA4(props: PlantillaProps & { colores: ColoresDocumento }) {
  const c = props.colores;
  return (
    <div className="documento-print" style={stylesA4.contenedor(c)}>
      <header style={stylesA4.header(c)}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {props.emisor.logo_url && (
            <img src={props.emisor.logo_url} alt="" style={stylesA4.logo} crossOrigin="anonymous" />
          )}
          <div>
            <div style={stylesA4.tipoEtiqueta(c)}>{ETIQUETA_TIPO[props.tipo]}</div>
            <div style={stylesA4.referencia(c)}>
              Nº {referenciaDocumento(props.tipo, props.serie, props.anio, props.numero)}
            </div>
          </div>
        </div>
        <div style={stylesA4.emisor}>
          <div style={stylesA4.emisorNombre(c)}>{props.emisor.nombre || "—"}</div>
          {props.emisor.cif && <div>CIF/NIF: {props.emisor.cif}</div>}
          {props.emisor.direccion && <div>{props.emisor.direccion}</div>}
          {props.emisor.email && <div>{props.emisor.email}</div>}
          {props.emisor.telefono && <div>{props.emisor.telefono}</div>}
        </div>
      </header>

      <section style={stylesA4.metaGrid}>
        <div>
          <div style={stylesA4.label}>Cliente</div>
          <div style={stylesA4.clienteBox(c)}>
            <div style={stylesA4.clienteNombre}>
              {props.cliente.nombre || <span style={{ color: "#aaa" }}>Sin cliente</span>}
            </div>
            {props.cliente.cif && <div>CIF/NIF: {props.cliente.cif}</div>}
            {props.cliente.direccion && <div>{props.cliente.direccion}</div>}
            {props.cliente.email && <div>{props.cliente.email}</div>}
          </div>
        </div>
        {/* Columna fechas: centrada verticalmente respecto al bloque cliente */}
        <div style={stylesA4.fechasCol}>
          <div>
            <div style={stylesA4.label}>Fecha de emisión</div>
            <div style={stylesA4.metaValor}>{formatearFechaLarga(props.fecha_emision)}</div>
          </div>
          {props.fecha_vencimiento && (
            <div style={{ marginTop: 12 }}>
              <div style={stylesA4.label}>
                {props.tipo === "presupuesto" ? "Válido hasta" : "Vencimiento"}
              </div>
              <div style={stylesA4.metaValor}>{formatearFechaLarga(props.fecha_vencimiento)}</div>
            </div>
          )}
        </div>
      </section>

      <table style={stylesA4.tabla}>
        <thead>
          <tr>
            <th style={{ ...stylesA4.th(c), textAlign: "left" }}>Descripción</th>
            <th style={stylesA4.th(c)}>Cant.</th>
            <th style={stylesA4.th(c)}>Precio</th>
            <th style={stylesA4.th(c)}>Dto%</th>
            <th style={stylesA4.th(c)}>IVA%</th>
            <th style={{ ...stylesA4.th(c), textAlign: "right" }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {props.lineas.length === 0 ? (
            <tr>
              <td colSpan={6} style={stylesA4.vacio}>
                Añade líneas al documento
              </td>
            </tr>
          ) : (
            props.lineas.map((l, i) => {
              const importe =
                (Number(l.cantidad) || 0) *
                (Number(l.precio_unit) || 0) *
                (1 - (Number(l.descuento_pct) || 0) / 100);
              return (
                <tr key={i}>
                  <td style={stylesA4.td}>
                    {l.descripcion || <span style={{ color: "#aaa" }}>(sin descripción)</span>}
                  </td>
                  <td style={stylesA4.tdNum}>{l.cantidad}</td>
                  <td style={stylesA4.tdNum}>{eur(Number(l.precio_unit) || 0)}</td>
                  <td style={stylesA4.tdNum}>{l.descuento_pct || 0}</td>
                  <td style={stylesA4.tdNum}>{l.iva_pct || 0}</td>
                  <td style={{ ...stylesA4.td, textAlign: "right", fontWeight: 600 }}>
                    {eur(importe)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <TotalesA4 lineas={props.lineas} irpf_pct={props.irpf_pct} colores={c} />

      {(props.condiciones_pago || props.metodo_pago) && (
        <section style={stylesA4.bloqueExtra}>
          <div style={stylesA4.label}>Pago</div>
          {props.metodo_pago && <div>Método: {props.metodo_pago}</div>}
          {props.condiciones_pago && <div>{props.condiciones_pago}</div>}
        </section>
      )}

      {props.notas && (
        <section style={stylesA4.bloqueExtra}>
          <div style={stylesA4.label}>Notas</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{props.notas}</div>
        </section>
      )}

      <footer style={stylesA4.footer}>Documento generado con R3ZON ANTARES</footer>
    </div>
  );
}

function TotalesA4({
  lineas,
  irpf_pct,
  colores,
}: {
  lineas: LineaDocumento[];
  irpf_pct: number;
  colores: ColoresDocumento;
}) {
  const t = calcularTotales(lineas, irpf_pct);
  return (
    <section style={stylesA4.totales}>
      <div style={{ flex: 1 }}>
        {t.desglose_iva.size > 0 && (
          <div style={stylesA4.desglose}>
            <div style={stylesA4.label}>Desglose de IVA</div>
            {[...t.desglose_iva.entries()].map(([pct, v]) => (
              <div key={pct} style={stylesA4.desgloseLinea}>
                IVA {pct}% sobre {eur(v.base)} → {eur(v.cuota)}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={stylesA4.totalesBox}>
        <Fila label="Subtotal" valor={eur(t.subtotal)} />
        {t.descuento_total > 0 && <Fila label="Descuento" valor={`− ${eur(t.descuento_total)}`} />}
        <Fila label="Base imponible" valor={eur(t.base_imponible)} />
        <Fila label="IVA" valor={eur(t.iva_total)} />
        {t.irpf_total > 0 && <Fila label={`IRPF ${irpf_pct}%`} valor={`− ${eur(t.irpf_total)}`} />}
        <div style={stylesA4.totalFinal(colores)}>
          <span>TOTAL</span>
          <span>{eur(t.total)}</span>
        </div>
      </div>
    </section>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={stylesA4.filaTotal}>
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Plantilla ticket térmico (80 mm) — vertical
// ──────────────────────────────────────────────────────────────────────────
function PlantillaTicket(props: PlantillaProps & { colores: ColoresDocumento }) {
  const t = calcularTotales(props.lineas, props.irpf_pct);
  return (
    <div className="documento-print documento-ticket" style={stylesTicket.contenedor}>
      <header style={stylesTicket.header}>
        {props.emisor.logo_url && (
          <img
            src={props.emisor.logo_url}
            alt=""
            style={stylesTicket.logo}
            crossOrigin="anonymous"
          />
        )}
        <div style={stylesTicket.emisorNombre}>{props.emisor.nombre || "—"}</div>
        {props.emisor.cif && <div>CIF: {props.emisor.cif}</div>}
        {props.emisor.direccion && <div>{props.emisor.direccion}</div>}
        {props.emisor.telefono && <div>Tel. {props.emisor.telefono}</div>}
      </header>

      <hr style={stylesTicket.sep} />

      <div style={stylesTicket.meta}>
        <div>
          {ETIQUETA_TIPO[props.tipo]}{" "}
          {referenciaDocumento(props.tipo, props.serie, props.anio, props.numero)}
        </div>
        <div>{formatearFechaLarga(props.fecha_emision)}</div>
        {props.cliente.nombre && (
          <div style={{ marginTop: 4 }}>Cliente: {props.cliente.nombre}</div>
        )}
      </div>

      <hr style={stylesTicket.sep} />

      <table style={stylesTicket.tabla}>
        <thead>
          <tr>
            <th style={stylesTicket.thLeft}>Descripción</th>
            <th style={stylesTicket.thRight}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {props.lineas.map((l, i) => {
            const importe =
              (Number(l.cantidad) || 0) *
              (Number(l.precio_unit) || 0) *
              (1 - (Number(l.descuento_pct) || 0) / 100);
            return (
              <tr key={i}>
                <td style={stylesTicket.tdLeft}>
                  <div>{l.descripcion || "—"}</div>
                  <div style={stylesTicket.subLinea}>
                    {l.cantidad} × {eur(Number(l.precio_unit) || 0)}
                    {l.iva_pct ? ` · IVA ${l.iva_pct}%` : ""}
                  </div>
                </td>
                <td style={stylesTicket.tdRight}>{eur(importe)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <hr style={stylesTicket.sep} />

      <div style={stylesTicket.totalesBox}>
        <FilaT label="Base" valor={eur(t.base_imponible)} />
        <FilaT label="IVA" valor={eur(t.iva_total)} />
        {t.irpf_total > 0 && (
          <FilaT label={`IRPF ${props.irpf_pct}%`} valor={`− ${eur(t.irpf_total)}`} />
        )}
        <div style={stylesTicket.total(props.colores)}>
          <span>TOTAL</span>
          <span>{eur(t.total)}</span>
        </div>
      </div>

      {props.metodo_pago && (
        <>
          <hr style={stylesTicket.sep} />
          <div style={stylesTicket.pago}>Pago: {props.metodo_pago}</div>
        </>
      )}

      {props.notas && (
        <>
          <hr style={stylesTicket.sep} />
          <div style={stylesTicket.notas}>{props.notas}</div>
        </>
      )}

      <hr style={stylesTicket.sep} />
      <div style={stylesTicket.footer}>¡Gracias por su compra!</div>
    </div>
  );
}

function FilaT({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={stylesTicket.fila}>
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Estilos — sólo inline para que sobrevivan al `innerHTML` de la impresión.
// ──────────────────────────────────────────────────────────────────────────
const FONT_STACK = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const stylesA4 = {
  contenedor: (c: ColoresDocumento): React.CSSProperties => ({
    fontFamily: FONT_STACK,
    color: c.texto,
    background: "#ffffff",
    padding: "32px",
    borderRadius: "12px",
    fontSize: "13px",
    lineHeight: 1.5,
    minHeight: "100%",
  }),
  header: (c: ColoresDocumento): React.CSSProperties => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottom: `2px solid ${c.primario}`,
    marginBottom: 24,
    gap: 16,
  }),
  logo: {
    height: 56,
    width: 56,
    objectFit: "contain",
    borderRadius: 8,
    background: "#fff",
  } as React.CSSProperties,
  tipoEtiqueta: (c: ColoresDocumento): React.CSSProperties => ({
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: 700,
    color: c.primario,
  }),
  referencia: (c: ColoresDocumento): React.CSSProperties => ({
    fontSize: 22,
    fontWeight: 800,
    marginTop: 4,
    color: c.texto,
  }),
  emisor: { textAlign: "right", fontSize: 12, color: "#475569" } as React.CSSProperties,
  emisorNombre: (c: ColoresDocumento): React.CSSProperties => ({
    fontSize: 14,
    fontWeight: 700,
    color: c.texto,
    marginBottom: 2,
  }),
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginBottom: 20,
    alignItems: "stretch",
  } as React.CSSProperties,
  fechasCol: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  } as React.CSSProperties,
  label: {
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: 700,
    color: "#64748b",
    marginBottom: 4,
  } as React.CSSProperties,
  clienteBox: (c: ColoresDocumento): React.CSSProperties => ({
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 12,
    background: c.acentoSuave,
  }),
  clienteNombre: { fontWeight: 700, marginBottom: 2 } as React.CSSProperties,
  metaValor: { fontSize: 14, fontWeight: 600 } as React.CSSProperties,
  tabla: { width: "100%", borderCollapse: "collapse", marginBottom: 16 } as React.CSSProperties,
  th: (c: ColoresDocumento): React.CSSProperties => ({
    background: c.acento,
    color: c.primario,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    padding: "8px 10px",
    textAlign: "right",
    borderBottom: `1px solid ${c.primario}33`,
  }),
  td: { padding: "10px", borderBottom: "1px solid #e2e8f0", fontSize: 12 } as React.CSSProperties,
  tdNum: {
    padding: "10px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: 12,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  } as React.CSSProperties,
  vacio: {
    padding: "24px",
    textAlign: "center",
    color: "#94a3b8",
    fontStyle: "italic",
  } as React.CSSProperties,
  totales: { display: "flex", gap: 24, marginTop: 8, marginBottom: 20 } as React.CSSProperties,
  desglose: { fontSize: 11, color: "#475569" } as React.CSSProperties,
  desgloseLinea: { marginTop: 2 } as React.CSSProperties,
  totalesBox: { width: 280 } as React.CSSProperties,
  filaTotal: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    fontSize: 12,
    color: "#475569",
  } as React.CSSProperties,
  totalFinal: (c: ColoresDocumento): React.CSSProperties => ({
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 12px",
    marginTop: 8,
    background: c.primario,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 800,
    borderRadius: 8,
  }),
  bloqueExtra: {
    marginTop: 16,
    padding: 12,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 12,
    color: "#475569",
  } as React.CSSProperties,
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTop: "1px solid #e2e8f0",
    fontSize: 10,
    textAlign: "center",
    color: "#94a3b8",
  } as React.CSSProperties,
};

const stylesTicket = {
  contenedor: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    color: "#0f172a",
    background: "#ffffff",
    padding: "10px 12px",
    fontSize: 12,
    lineHeight: 1.35,
    width: "80mm",
    maxWidth: "80mm",
    margin: "0 auto",
  } as React.CSSProperties,
  header: { textAlign: "center" } as React.CSSProperties,
  logo: {
    height: 48,
    width: "auto",
    maxWidth: "60mm",
    objectFit: "contain",
    margin: "0 auto 6px",
    display: "block",
  } as React.CSSProperties,
  emisorNombre: { fontWeight: 700, fontSize: 14, marginBottom: 2 } as React.CSSProperties,
  sep: {
    border: "none",
    borderTop: "1px dashed #94a3b8",
    margin: "8px 0",
  } as React.CSSProperties,
  meta: { fontSize: 11 } as React.CSSProperties,
  tabla: { width: "100%", borderCollapse: "collapse" } as React.CSSProperties,
  thLeft: {
    textAlign: "left",
    fontSize: 10,
    textTransform: "uppercase",
    paddingBottom: 4,
    borderBottom: "1px dashed #cbd5e1",
  } as React.CSSProperties,
  thRight: {
    textAlign: "right",
    fontSize: 10,
    textTransform: "uppercase",
    paddingBottom: 4,
    borderBottom: "1px dashed #cbd5e1",
  } as React.CSSProperties,
  tdLeft: { padding: "4px 0", fontSize: 11 } as React.CSSProperties,
  tdRight: {
    padding: "4px 0",
    fontSize: 11,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    verticalAlign: "top",
    whiteSpace: "nowrap",
  } as React.CSSProperties,
  subLinea: { color: "#64748b", fontSize: 10 } as React.CSSProperties,
  totalesBox: { marginTop: 4 } as React.CSSProperties,
  fila: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    padding: "1px 0",
  } as React.CSSProperties,
  total: (c: ColoresDocumento): React.CSSProperties => ({
    display: "flex",
    justifyContent: "space-between",
    marginTop: 6,
    padding: "6px 4px",
    borderTop: `2px solid ${c.primario}`,
    borderBottom: `2px solid ${c.primario}`,
    fontWeight: 800,
    fontSize: 14,
  }),
  pago: { fontSize: 11, textAlign: "center" } as React.CSSProperties,
  notas: { fontSize: 11, whiteSpace: "pre-wrap" } as React.CSSProperties,
  footer: {
    fontSize: 10,
    textAlign: "center",
    color: "#64748b",
  } as React.CSSProperties,
};
