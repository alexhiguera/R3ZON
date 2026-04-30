/**
 * Tipos del módulo Clientes (modelo B2B puro).
 * Un Cliente = empresa/entidad jurídica con datos fiscales y N contactos.
 */

export type Cliente = {
  id: string;
  negocio_id: string;
  nombre: string;            // razón social / nombre comercial
  cif: string | null;
  sector: string | null;
  sitio_web: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  codigo_postal: string | null;
  num_empleados: number | null;
  facturacion_anual: number | null;
  estado: "activa" | "prospecto" | "inactiva";
  notas: string | null;
  etiquetas: string[];
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Contacto = {
  id: string;
  negocio_id: string;
  cliente_id: string;
  reports_to: string | null;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  puesto: string | null;
  departamento: string | null;
  es_decisor: boolean;
  notas: string | null;
};
