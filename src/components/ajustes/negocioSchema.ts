import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

// Validador laxo de CIF/NIF español: 1 letra/dígito + 7 dígitos + 1 letra/dígito.
const cifNifRegex = /^[A-Za-z0-9][0-9]{7}[A-Za-z0-9]$/;

const cifNifSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v.toUpperCase()))
  .refine(
    (v) => v === null || cifNifRegex.test(v),
    "Formato de CIF/NIF inválido (9 caracteres)"
  );

// E.164 laxo: + opcional y 7-15 dígitos (admite espacios que limpiamos).
const telefonoSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v.replace(/\s+/g, "")))
  .refine(
    (v) => v === null || /^\+?[0-9]{7,15}$/.test(v),
    "Teléfono inválido (7-15 dígitos, prefijo + opcional)"
  );

const emailSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v.toLowerCase()))
  .refine(
    (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Email inválido"
  );

export const negocioSchema = z.object({
  nombre_negocio: z
    .string({ error: "El nombre del negocio es obligatorio" })
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(120, "Máximo 120 caracteres"),
  cif_nif: cifNifSchema,
  direccion: optionalText(240),
  email_contacto: emailSchema,
  telefono: telefonoSchema,
});

export type NegocioFormValues = z.input<typeof negocioSchema>;
export type NegocioFormParsed = z.output<typeof negocioSchema>;
