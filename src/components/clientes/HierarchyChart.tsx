"use client";

import {
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
} from "@xyflow/react";
import { useMemo } from "react";
import "@xyflow/react/dist/style.css";
import { Crown, Plus, Users2 } from "lucide-react";
import type { Contacto } from "./types";

const NODE_W = 220;
const NODE_H = 92;
const GAP_X = 32;
const GAP_Y = 60;

// ─── Tree layout ──────────────────────────────────────────────────────────
// Algoritmo simple: cada nodo ocupa el ancho de sus descendientes hojas.
// Devuelve coordenadas {x,y} en píxeles para cada contacto.
function computeLayout(contactos: Contacto[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (contactos.length === 0) return positions;

  const childrenByParent = new Map<string | null, Contacto[]>();
  contactos.forEach((c) => {
    const k = c.reports_to ?? null;
    if (!childrenByParent.has(k)) childrenByParent.set(k, []);
    childrenByParent.get(k)!.push(c);
  });

  // Si hay padres "huérfanos" (reports_to apunta a alguien que ya no existe),
  // los tratamos como raíces.
  const ids = new Set(contactos.map((c) => c.id));
  contactos.forEach((c) => {
    if (c.reports_to && !ids.has(c.reports_to)) {
      const k = null;
      if (!childrenByParent.has(k)) childrenByParent.set(k, []);
      if (!childrenByParent.get(k)!.includes(c)) childrenByParent.get(k)!.push(c);
    }
  });

  // Anchura del subárbol en "unidades" de nodo.
  const widthCache = new Map<string, number>();
  const widthOf = (id: string): number => {
    if (widthCache.has(id)) return widthCache.get(id)!;
    const kids = childrenByParent.get(id) ?? [];
    const w = kids.length === 0 ? 1 : kids.reduce((sum, k) => sum + widthOf(k.id), 0);
    widthCache.set(id, w);
    return w;
  };

  const place = (id: string, depth: number, leftUnit: number) => {
    const w = widthOf(id);
    const centerUnit = leftUnit + w / 2;
    positions.set(id, {
      x: centerUnit * (NODE_W + GAP_X) - NODE_W / 2,
      y: depth * (NODE_H + GAP_Y),
    });
    let cursor = leftUnit;
    (childrenByParent.get(id) ?? []).forEach((kid) => {
      const kw = widthOf(kid.id);
      place(kid.id, depth + 1, cursor);
      cursor += kw;
    });
  };

  const roots = childrenByParent.get(null) ?? [];
  let cursor = 0;
  roots.forEach((r) => {
    place(r.id, 0, cursor);
    cursor += widthOf(r.id);
  });

  return positions;
}

// ─── Custom node ──────────────────────────────────────────────────────────
type ContactoNodeData = {
  contacto: Contacto;
};

function ContactoNode({ data }: NodeProps<Node<ContactoNodeData>>) {
  const c = data.contacto;
  const iniciales = `${c.nombre.charAt(0)}${c.apellidos?.charAt(0) ?? ""}`.toUpperCase();

  return (
    <div
      className="card-glass flex items-center gap-2.5 px-3 py-2.5"
      style={{ width: NODE_W, height: NODE_H }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-indigo-400/40 !border-indigo-400/50"
      />
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-900/60 font-display text-xs font-bold text-indigo-300">
        {iniciales}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate font-display text-[0.82rem] font-bold text-text-hi">
            {c.nombre} {c.apellidos ?? ""}
          </span>
          {c.es_decisor && <Crown size={11} className="shrink-0 text-warn" />}
        </div>
        <div className="truncate text-[0.68rem] text-text-mid">{c.puesto || "Sin puesto"}</div>
        {c.departamento && (
          <div className="truncate text-[0.62rem] text-text-lo">{c.departamento}</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-indigo-400/40 !border-indigo-400/50"
      />
    </div>
  );
}

const NODE_TYPES = { contacto: ContactoNode };

// ─── Component ────────────────────────────────────────────────────────────
export function HierarchyChart({
  contactos,
  onAddFirst,
}: {
  contactos: Contacto[];
  onAddFirst?: () => void;
}) {
  const { nodes, edges } = useMemo(() => {
    const positions = computeLayout(contactos);
    const nodes: Node<ContactoNodeData>[] = contactos.map((c) => ({
      id: c.id,
      type: "contacto",
      position: positions.get(c.id) ?? { x: 0, y: 0 },
      data: { contacto: c },
      draggable: true,
    }));
    const edges: Edge[] = contactos
      .filter((c) => c.reports_to && contactos.some((x) => x.id === c.reports_to))
      .map((c) => ({
        id: `e-${c.reports_to}-${c.id}`,
        source: c.reports_to!,
        target: c.id,
        type: "smoothstep",
        animated: false,
        style: { stroke: "rgba(129,140,248,0.5)", strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "rgba(129,140,248,0.7)",
          width: 16,
          height: 16,
        },
      }));
    return { nodes, edges };
  }, [contactos]);

  if (contactos.length === 0) {
    return (
      <div className="card-glass flex flex-col items-center gap-3 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300">
          <Users2 size={24} />
        </span>
        <div className="font-display text-lg font-bold text-text-hi">
          Aún no hay jerarquía definida
        </div>
        <p className="max-w-sm text-sm text-text-mid">
          Empieza añadiendo a la persona de mayor cargo (CEO o director general). Después, al crear
          nuevos contactos podrás indicar a quién reportan y el organigrama se dibujará solo.
        </p>
        {onAddFirst && (
          <button
            onClick={onAddFirst}
            className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 text-sm font-bold text-bg"
          >
            <Plus size={14} /> Añadir CEO / Director
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card-glass overflow-hidden" style={{ height: 560 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
        nodesConnectable={false}
        edgesFocusable={false}
        className="hierarchy-flow"
      >
        <Background color="rgba(129,140,248,0.12)" gap={24} size={1} />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!rounded-xl !border !border-indigo-400/25 !bg-indigo-900/70 !backdrop-blur"
        />
      </ReactFlow>
    </div>
  );
}
