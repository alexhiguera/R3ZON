import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

const cifNifRegex = /^[A-Za-z0-9][0-9]{7}[A-Za-z0-9]$/;
const cifNifSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v.toUpperCase()))
  .refine((v) => v === null || cifNifRegex.test(v), "Formato de CIF/NIF inválido (9 caracteres)");

const telefonoSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v.replace(/\s+/g, "")))
  .refine(
    (v) => v === null || /^\+?[0-9]{7,15}$/.test(v),
    "Teléfono inválido (7-15 dígitos, prefijo + opcional)",
  );

const emailSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v.toLowerCase()))
  .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email inválido");

// Paso 1 — Usuario (opcional, puede saltarse con "Rellenar más tarde")
export const usuarioSchema = z.object({
  nombre_completo: optionalText(120),
  cargo: optionalText(80),
  avatar_url: optionalText(500),
});
export type UsuarioFormValues = z.input<typeof usuarioSchema>;

// Paso 2 — Empresa esencial (nombre_negocio obligatorio para CONTINUAR pero NO para "Rellenar más tarde")
export const empresaSchema = z.object({
  nombre_negocio: z.string().trim().min(2, "Mínimo 2 caracteres").max(120, "Máximo 120 caracteres"),
  cif_nif: cifNifSchema,
  sector: optionalText(80),
  telefono: telefonoSchema,
});
export type EmpresaFormValues = z.input<typeof empresaSchema>;

// Paso 3 — Dirección y contacto
export const direccionSchema = z.object({
  direccion: optionalText(240),
  email_contacto: emailSchema,
  logo_url: optionalText(500),
});
export type DireccionFormValues = z.input<typeof direccionSchema>;

// Paso 4 — Preferencias
export const preferenciasSchema = z.object({
  moneda: z.string().trim().min(1).max(8),
  zona_horaria: z.string().trim().min(1).max(80),
});
export type PreferenciasFormValues = z.input<typeof preferenciasSchema>;
