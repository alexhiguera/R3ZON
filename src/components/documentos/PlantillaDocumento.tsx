"use client";

import {
  ETIQUETA_TIPO,
  calcularTotales,
  eur,
  referenciaDocumento,
  type ClienteSnapshot,
  type EmisorSnapshot,
  type LineaDocumento,
  type TipoDocumento,
} from "@/lib/documentos";
import { formatearFechaLarga } from "@/lib/formato";

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
};

/**
 * Vista de un documento — usada tanto para previsualización en pantalla
 * como para generar el PDF (vía window.print). Sin clases tailwind para que
 * el HTML inyectado en la ventana de impresión se vea idéntico.
 */
export function PlantillaDocumento(props: PlantillaProps) {
  return (
    <div
      className="documento-print"
      // estilos en línea para que la ventana de impresión los respete
      style={DOC_STYLE.contenedor}
    >
      <header style={DOC_STYLE.header}>
        <div>
          <div style={DOC_STYLE.tipoEtiqueta}>{ETIQUETA_TIPO[props.tipo]}</div>
          <div style={DOC_STYLE.referencia}>
            Nº {referenciaDocumento(props.tipo, props.serie, props.anio, props.numero)}
          </div>
        </div>
        <div style={DOC_STYLE.emisor}>
          <div style={DOC_STYLE.emisorNombre}>{props.emisor.nombre || "—"}</div>
          {props.emisor.cif      && <div>CIF/NIF: {props.emisor.cif}</div>}
          {props.emisor.direccion && <div>{props.emisor.direccion}</div>}
          {props.emisor.email     && <div>{props.emisor.email}</div>}
          {props.emisor.telefono  && <div>{props.emisor.telefono}</div>}
        </div>
      </header>

      <section style={DOC_STYLE.metaGrid}>
        <div>
          <div style={DOC_STYLE.label}>Cliente</div>
          <div style={DOC_STYLE.clienteBox}>
            <div style={DOC_STYLE.clienteNombre}>
              {props.cliente.nombre || <span style={{ color: "#aaa" }}>Sin cliente</span>}
            </div>
            {props.cliente.cif       && <div>CIF/NIF: {props.cliente.cif}</div>}
            {props.cliente.direccion && <div>{props.cliente.direccion}</div>}
            {props.cliente.email     && <div>{props.cliente.email}</div>}
          </div>
        </div>
        <div>
          <div style={DOC_STYLE.label}>Fecha de emisión</div>
          <div style={DOC_STYLE.metaValor}>{formatearFechaLarga(props.fecha_emision)}</div>
          {props.fecha_vencimiento && (
            <>
              <div style={{ ...DOC_STYLE.label, marginTop: 8 }}>
                {props.tipo === "presupuesto" ? "Válido hasta" : "Vencimiento"}
              </div>
              <div style={DOC_STYLE.metaValor}>
                {formatearFechaLarga(props.fecha_vencimiento)}
              </div>
            </>
          )}
        </div>
      </section>

      <table style={DOC_STYLE.tabla}>
        <thead>
          <tr>
            <th style={{ ...DOC_STYLE.th, textAlign: "left" }}>Descripción</th>
            <th style={DOC_STYLE.th}>Cant.</th>
            <th style={DOC_STYLE.th}>Precio</th>
            <th style={DOC_STYLE.th}>Dto%</th>
            <th style={DOC_STYLE.th}>IVA%</th>
            <th style={{ ...DOC_STYLE.th, textAlign: "right" }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {props.lineas.length === 0 ? (
            <tr>
              <td colSpan={6} style={DOC_STYLE.vacio}>
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
                  <td style={DOC_STYLE.td}>
                    {l.descripcion || <span style={{ color: "#aaa" }}>(sin descripción)</span>}
                  </td>
                  <td style={DOC_STYLE.tdNum}>{l.cantidad}</td>
                  <td style={DOC_STYLE.tdNum}>{eur(Number(l.precio_unit) || 0)}</td>
                  <td style={DOC_STYLE.tdNum}>{l.descuento_pct || 0}</td>
                  <td style={DOC_STYLE.tdNum}>{l.iva_pct || 0}</td>
                  <td style={{ ...DOC_STYLE.td, textAlign: "right", fontWeight: 600 }}>
                    {eur(importe)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <Totales lineas={props.lineas} irpf_pct={props.irpf_pct} />

      {(props.condiciones_pago || props.metodo_pago) && (
        <section style={DOC_STYLE.bloqueExtra}>
          <div style={DOC_STYLE.label}>Pago</div>
          {props.metodo_pago      && <div>Método: {props.metodo_pago}</div>}
          {props.condiciones_pago && <div>{props.condiciones_pago}</div>}
        </section>
      )}

      {props.notas && (
        <section style={DOC_STYLE.bloqueExtra}>
          <div style={DOC_STYLE.label}>Notas</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{props.notas}</div>
        </section>
      )}

      <footer style={DOC_STYLE.footer}>
        Documento generado con R3ZON Business OS
      </footer>
    </div>
  );
}

function Totales({
  lineas,
  irpf_pct,
}: {
  lineas: LineaDocumento[];
  irpf_pct: number;
}) {
  const t = calcularTotales(lineas, irpf_pct);
  return (
    <section style={DOC_STYLE.totales}>
      <div style={{ flex: 1 }}>
        {t.desglose_iva.size > 0 && (
          <div style={DOC_STYLE.desglose}>
            <div style={DOC_STYLE.label}>Desglose de IVA</div>
            {[...t.desglose_iva.entries()].map(([pct, v]) => (
              <div key={pct} style={DOC_STYLE.desgloseLinea}>
                IVA {pct}% sobre {eur(v.base)} → {eur(v.cuota)}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={DOC_STYLE.totalesBox}>
        <FilaTotal label="Subtotal"      valor={eur(t.subtotal)} />
        {t.descuento_total > 0 && (
          <FilaTotal label="Descuento"   valor={`− ${eur(t.descuento_total)}`} />
        )}
        <FilaTotal label="Base imponible" valor={eur(t.base_imponible)} />
        <FilaTotal label="IVA"            valor={eur(t.iva_total)} />
        {t.irpf_total > 0 && (
          <FilaTotal label={`IRPF ${irpf_pct}%`} valor={`− ${eur(t.irpf_total)}`} />
        )}
        <div style={DOC_STYLE.totalFinal}>
          <span>TOTAL</span>
          <span>{eur(t.total)}</span>
        </div>
      </div>
    </section>
  );
}

function FilaTotal({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={DOC_STYLE.filaTotal}>
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  );
}

// Estilos en línea (no Tailwind) para que sirvan tanto en preview como en PDF.
const DOC_STYLE = {
  contenedor: {
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    color: "#0f172a",
    background: "#ffffff",
    padding: "32px",
    borderRadius: "12px",
    fontSize: "13px",
    lineHeight: 1.5,
    minHeight: "100%",
  } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottom: "2px solid #4f46e5",
    marginBottom: 24,
    gap: 16,
  } as React.CSSProperties,
  tipoEtiqueta: {
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: 700,
    color: "#4f46e5",
  } as React.CSSProperties,
  referencia: {
    fontSize: 22,
    fontWeight: 800,
    marginTop: 4,
    color: "#0f172a",
  } as React.CSSProperties,
  emisor: {
    textAlign: "right",
    fontSize: 12,
    color: "#475569",
  } as React.CSSProperties,
  emisorNombre: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 2,
  } as React.CSSProperties,
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginBottom: 20,
  } as React.CSSProperties,
  label: {
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: 700,
    color: "#64748b",
    marginBottom: 4,
  } as React.CSSProperties,
  clienteBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 12,
    background: "#f8fafc",
  } as React.CSSProperties,
  clienteNombre: { fontWeight: 700, marginBottom: 2 } as React.CSSProperties,
  metaValor: { fontSize: 14, fontWeight: 600 } as React.CSSProperties,
  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: 16,
  } as React.CSSProperties,
  th: {
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    padding: "8px 10px",
    textAlign: "right",
    borderBottom: "1px solid #c7d2fe",
  } as React.CSSProperties,
  td: {
    padding: "10px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: 12,
  } as React.CSSProperties,
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
  totales: {
    display: "flex",
    gap: 24,
    marginTop: 8,
    marginBottom: 20,
  } as React.CSSProperties,
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
  totalFinal: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 12px",
    marginTop: 8,
    background: "#4f46e5",
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 800,
    borderRadius: 8,
  } as React.CSSProperties,
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
