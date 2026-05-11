export type PerfilNegocio = {
  id: string;
  user_id: string;
  nombre_negocio: string;
  cif_nif: string | null;
  sector: string | null;
  email_contacto: string | null;
  telefono: string | null;
  direccion: string | null;
  logo_url: string | null;
  moneda: string;
  zona_horaria: string;
  plan: string;
  stock_mode_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type TabId =
  | "negocio"
  | "facturacion"
  | "integraciones"
  | "equipo"
  | "suscripcion"
  | "seguridad"
  | "apariencia"
  | "listado"
  | "cumplimiento";
