"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase/client";

/**
 * Sistema de permisos R3ZON — ver ROLES.md.
 *
 * Niveles:
 *   - admin_global: super admin de plataforma. Acceso total.
 *   - owner:        dueño del tenant (perfiles_negocio.user_id). Acceso total dentro de su negocio.
 *   - miembro:      empleado invitado. Permisos = baseline(rol) sobrescritos por `permisos`.
 *   - anon:         sin sesión válida.
 *
 * El hook consulta la vista `v_permisos_actuales` que computa todo en una sola query.
 */

export type Recurso =
  | "clientes"
  | "finanzas"
  | "tareas"
  | "citas"
  | "documentos"
  | "inventario"
  | "equipo"
  | "ajustes"
  | "datos";

export type Accion = "read" | "write" | "delete";

export type NivelPermisos = "admin_global" | "owner" | "miembro" | "anon";

export type PermisosTabla = Partial<Record<Recurso, Partial<Record<Accion, boolean>>>>;

export type EstadoPermisos = {
  loading: boolean;
  nivel: NivelPermisos;
  rol: string | null;
  permisos: PermisosTabla;
  /** ¿El usuario puede ejecutar `accion` sobre `recurso`? */
  can: (recurso: Recurso, accion: Accion) => boolean;
  /** Acceso total: admin global u owner. */
  esAdmin: boolean;
};

const PERMISOS_VACIOS: PermisosTabla = {};

export function usePermissions(): EstadoPermisos {
  const [loading, setLoading] = useState(true);
  const [nivel, setNivel] = useState<NivelPermisos>("anon");
  const [rol, setRol] = useState<string | null>(null);
  const [permisos, setPermisos] = useState<PermisosTabla>(PERMISOS_VACIOS);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("v_permisos_actuales")
        .select("nivel, rol, permisos")
        .maybeSingle();
      if (cancelado) return;
      if (error || !data) {
        setNivel("anon");
        setRol(null);
        setPermisos(PERMISOS_VACIOS);
      } else {
        setNivel((data.nivel as NivelPermisos) ?? "anon");
        setRol((data.rol as string | null) ?? null);
        setPermisos((data.permisos as PermisosTabla | null) ?? PERMISOS_VACIOS);
      }
      setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const esAdmin = nivel === "admin_global" || nivel === "owner";

  const can = (recurso: Recurso, accion: Accion): boolean => {
    if (esAdmin) return true;
    return Boolean(permisos[recurso]?.[accion]);
  };

  return { loading, nivel, rol, permisos, can, esAdmin };
}
