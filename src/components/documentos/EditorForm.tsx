import { CheckCircle2, ChevronDown, Package, Plus, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { Card, inputCls, NumInput, ResumenColapsable } from "@/components/documentos/EditorUiBits";
import { Field } from "@/components/ui/Field";
import { eur, type TipoDocumento } from "@/lib/documentos";
import { formatearFechaCorta } from "@/lib/formato";
import type { useDocumentoEditor } from "./useDocumentoEditor";

type Editor = ReturnType<typeof useDocumentoEditor>;

/**
 * Formulario izquierdo del editor de documentos: cliente, cabecera (colapsable),
 * contenido (líneas), pago (colapsable) y notas. Disabled cuando ya hay documento
 * generado (flujo de solo lectura post-generación).
 */
export function EditorForm({ tipo, editor }: { tipo: TipoDocumento; editor: Editor }) {
  const cabeceraResumen =
    `Serie ${editor.serie} · ${formatearFechaCorta(editor.fechaEmision)}` +
    (editor.fechaVencimiento ? ` · vence ${formatearFechaCorta(editor.fechaVencimiento)}` : "") +
    (editor.irpfPct > 0 ? ` · IRPF ${editor.irpfPct}%` : "");

  const pagoResumen =
    editor.metodoPago + (editor.condicionesPago ? ` · ${editor.condicionesPago}` : "");

  return (
    <fieldset
      disabled={editor.generado !== null}
      className="flex flex-col gap-4 disabled:opacity-60"
    >
      <ClienteSection editor={editor} />

      {/* CABECERA — colapsable */}
      {!editor.cabeceraAbierta ? (
        <ResumenColapsable
          titulo="Cabecera"
          resumen={cabeceraResumen}
          onModificar={() => editor.setCabeceraAbierta(true)}
        />
      ) : (
        <Card
          title="Cabecera"
          accion={
            <button
              type="button"
              onClick={() => editor.setCabeceraAbierta(false)}
              className="text-xs text-text-mid hover:text-text-hi"
            >
              Colapsar
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Serie">
              <input
                type="text"
                value={editor.serie}
                onChange={(e) => editor.setSerie(e.target.value.toUpperCase().slice(0, 4))}
                className={inputCls}
              />
            </Field>
            <Field label="Fecha de emisión">
              <input
                type="date"
                value={editor.fechaEmision}
                onChange={(e) => editor.setFechaEmision(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={tipo === "presupuesto" ? "Válido hasta" : "Vencimiento"}>
              <input
                type="date"
                value={editor.fechaVencimiento}
                onChange={(e) => editor.setFechaVencimiento(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Retención IRPF %">
              <input
                type="number"
                value={editor.irpfPct}
                step="0.01"
                min={0}
                onChange={(e) => editor.setIrpfPct(parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>
          </div>
        </Card>
      )}

      <ContenidoSection editor={editor} />

      {/* PAGO — colapsable */}
      {!editor.pagoAbierto ? (
        <ResumenColapsable
          titulo="Pago"
          resumen={pagoResumen}
          onModificar={() => editor.setPagoAbierto(true)}
        />
      ) : (
        <PagoSection editor={editor} />
      )}

      {/* NOTAS */}
      <Card title="Notas (opcional)">
        <textarea
          value={editor.notas}
          onChange={(e) => editor.setNotas(e.target.value)}
          rows={3}
          placeholder="Notas internas o mensaje para el cliente…"
          className={`${inputCls} h-auto resize-none py-2`}
        />
      </Card>
    </fieldset>
  );
}

function ClienteSection({ editor }: { editor: Editor }) {
  return (
    <Card title="Cliente">
      {!editor.mostrarManual ? (
        <div className="flex flex-col gap-2">
          <Field label="Cliente guardado" full>
            <select
              value={editor.clienteId ?? ""}
              onChange={(e) => editor.elegirClientePorId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Selecciona un cliente —</option>
              {editor.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.cif ? ` · ${c.cif}` : ""}
                </option>
              ))}
            </select>
            {editor.clientes.length === 0 && (
              <Link href="/clientes" className="mt-1 text-[0.7rem] text-cyan hover:underline">
                Aún no tienes clientes guardados — créalos en el módulo Clientes
              </Link>
            )}
          </Field>

          {editor.clienteId && (
            <div className="flex items-center gap-2 rounded-xl border border-ok/30 bg-ok/10 px-3 py-2 text-sm">
              <CheckCircle2 size={14} className="text-ok" />
              <span className="flex-1 text-text-hi">
                <strong>{editor.cliente.nombre}</strong>
                {editor.cliente.cif && (
                  <span className="ml-1 text-text-mid">({editor.cliente.cif})</span>
                )}
              </span>
              <button
                type="button"
                onClick={editor.limpiarCliente}
                className="text-xs text-text-mid hover:text-text-hi"
              >
                Quitar
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              editor.setMostrarManual(true);
              editor.limpiarCliente();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-fuchsia/40 bg-fuchsia/5 py-2.5 text-sm font-semibold text-fuchsia hover:bg-fuchsia/10"
          >
            <UserPlus size={14} /> Añadir cliente manualmente
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" full>
              <input
                type="text"
                value={editor.cliente.nombre}
                onChange={(e) => editor.setCliente({ ...editor.cliente, nombre: e.target.value })}
                className={inputCls}
                autoFocus
              />
            </Field>
            <Field label="CIF/NIF">
              <input
                type="text"
                value={editor.cliente.cif ?? ""}
                onChange={(e) =>
                  editor.setCliente({ ...editor.cliente, cif: e.target.value || null })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={editor.cliente.email ?? ""}
                onChange={(e) =>
                  editor.setCliente({ ...editor.cliente, email: e.target.value || null })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Dirección" full>
              <input
                type="text"
                value={editor.cliente.direccion ?? ""}
                onChange={(e) =>
                  editor.setCliente({ ...editor.cliente, direccion: e.target.value || null })
                }
                className={inputCls}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-xs text-text-mid">
            <input
              type="checkbox"
              checked={editor.guardarComoCliente}
              onChange={(e) => editor.setGuardarComoCliente(e.target.checked)}
              className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30 text-cyan focus:ring-cyan/30"
            />
            Guardar también como cliente en mi CRM
          </label>

          <button
            type="button"
            onClick={() => {
              editor.setMostrarManual(false);
              editor.limpiarCliente();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-400/20 bg-indigo-900/20 py-2 text-xs font-semibold text-text-mid hover:text-text-hi"
          >
            <ChevronDown size={12} /> Volver al listado guardado
          </button>
        </div>
      )}
    </Card>
  );
}

function ContenidoSection({ editor }: { editor: Editor }) {
  return (
    <Card title="Contenido">
      <div className="flex flex-col gap-3">
        {editor.lineas.map((l, i) => (
          <div key={i} className="rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3">
            <div className="grid grid-cols-12 gap-2">
              <label className="col-span-12 flex flex-col gap-1">
                <span className="text-[0.6rem] font-medium uppercase tracking-wider text-text-lo">
                  Producto / servicio guardado
                </span>
                <div className="relative">
                  <Package
                    size={13}
                    className="pointer-events-none absolute left-2.5 top-3 text-text-lo"
                  />
                  <select
                    value=""
                    onChange={(e) => {
                      editor.aplicarProductoEnLinea(i, e.target.value);
                      e.target.value = "";
                    }}
                    className={`${inputCls} pl-8`}
                    disabled={editor.productos.length === 0}
                  >
                    <option value="">
                      {editor.productos.length === 0
                        ? "— Sin productos guardados —"
                        : "— Elegir de tu catálogo —"}
                    </option>
                    {editor.productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} · {eur(Number(p.precio_venta) || 0)}
                        {p.tipo === "servicio" ? " · servicio" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <input
                type="text"
                placeholder="Descripción (o añade manualmente)"
                value={l.descripcion}
                onChange={(e) => editor.actualizarLinea(i, { descripcion: e.target.value })}
                className={`${inputCls} col-span-12`}
              />
              <NumInput
                label="Cant."
                value={l.cantidad}
                onChange={(v) => editor.actualizarLinea(i, { cantidad: v })}
                cls="col-span-3"
              />
              <NumInput
                label="Precio"
                value={l.precio_unit}
                onChange={(v) => editor.actualizarLinea(i, { precio_unit: v })}
                cls="col-span-3"
                step="0.01"
              />
              <NumInput
                label="Dto%"
                value={l.descuento_pct}
                onChange={(v) => editor.actualizarLinea(i, { descuento_pct: v })}
                cls="col-span-2"
              />
              <NumInput
                label="IVA%"
                value={l.iva_pct}
                onChange={(v) => editor.actualizarLinea(i, { iva_pct: v })}
                cls="col-span-2"
              />
              <button
                type="button"
                onClick={() => editor.eliminarLinea(i)}
                className="col-span-2 mt-5 inline-flex items-center justify-center rounded-lg border border-danger/30 bg-danger/5 text-danger hover:bg-danger/15 disabled:opacity-30"
                disabled={editor.lineas.length === 1}
                aria-label="Eliminar línea"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={editor.añadirLinea}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-cyan/40 bg-cyan/5 py-3 text-sm font-semibold text-cyan hover:bg-cyan/10"
        >
          <Plus size={14} /> Añadir manualmente
        </button>
      </div>
    </Card>
  );
}

function PagoSection({ editor }: { editor: Editor }) {
  return (
    <Card
      title="Pago"
      accion={
        <button
          type="button"
          onClick={() => editor.setPagoAbierto(false)}
          className="text-xs text-text-mid hover:text-text-hi"
        >
          Colapsar
        </button>
      }
    >
      <Field label="Método guardado">
        <select
          value={editor.metodoSeleccionadoId}
          onChange={(e) => editor.elegirMetodoGuardado(e.target.value)}
          className={inputCls}
        >
          {editor.metodosGuardados.map((m) => (
            <option key={m.id} value={m.id}>
              {m.etiqueta}
              {m.predeterminado ? " ⭐" : ""}
            </option>
          ))}
          <option value="manual">— Introducir manualmente —</option>
        </select>
        {editor.metodosGuardados.length === 0 && (
          <Link href="/ajustes" className="mt-1 text-[0.7rem] text-cyan hover:underline">
            Aún no tienes métodos guardados — añádelos en Ajustes
          </Link>
        )}
      </Field>

      {editor.metodoSeleccionadoId === "manual" && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Método" full>
            <input
              type="text"
              value={editor.metodoPago}
              onChange={(e) => editor.setMetodoPago(e.target.value)}
              placeholder="Transferencia, Bizum, efectivo…"
              className={inputCls}
            />
          </Field>
          <Field label="Detalle / instrucciones" full>
            <input
              type="text"
              value={editor.condicionesPago}
              onChange={(e) => editor.setCondicionesPago(e.target.value)}
              placeholder="IBAN, plazo, observaciones…"
              className={inputCls}
            />
          </Field>
          <label className="col-span-2 flex items-center gap-2 text-xs text-text-mid">
            <input
              type="checkbox"
              checked={editor.guardarMetodoNuevo}
              onChange={(e) => editor.setGuardarMetodoNuevo(e.target.checked)}
              className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30 text-cyan focus:ring-cyan/30"
            />
            Guardar este método para reutilizarlo
          </label>
          {editor.guardarMetodoNuevo && (
            <Field label="Etiqueta del método" full>
              <input
                type="text"
                value={editor.etiquetaMetodoNuevo}
                onChange={(e) => editor.setEtiquetaMetodoNuevo(e.target.value)}
                placeholder="Transferencia BBVA"
                className={inputCls}
              />
            </Field>
          )}
        </div>
      )}

      {editor.metodoSeleccionadoId !== "manual" && editor.condicionesPago && (
        <div className="mt-3 rounded-lg border border-indigo-400/15 bg-indigo-900/20 px-3 py-2 text-xs text-text-mid">
          {editor.condicionesPago}
        </div>
      )}
    </Card>
  );
}
