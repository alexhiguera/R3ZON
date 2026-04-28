/**
 * No hay acceso de red desde el entorno de desarrollo al pooler de Supabase.
 * Este script genera el archivo SQL listo para pegar en el Editor SQL del
 * Supabase Dashboard → no requiere service_role key ni conexión externa.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const env = {};
for (const line of readFileSync(resolve(".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const ADMIN_EMAIL    = env.ADMIN_EMAIL    || "admin@r3zon.dev";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "R3z0n!Admin-Dev-2026";
const ADMIN_NOMBRE   = env.ADMIN_NOMBRE_NEGOCIO || "R3ZON Dev";

const sql = `-- ============================================================
-- Crear usuario admin — pegar en Supabase Dashboard > SQL Editor
-- ============================================================
DO $$
DECLARE v_uid uuid;
BEGIN
  -- 1. Evitar duplicado
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = '${ADMIN_EMAIL}') THEN
    RAISE NOTICE 'Usuario ya existe: ${ADMIN_EMAIL}';
    RETURN;
  END IF;

  -- 2. Crear usuario con contraseña cifrada (bcrypt via pgcrypto)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at,
    raw_user_meta_data, raw_app_meta_data,
    aud, role, created_at, updated_at,
    confirmation_token, recovery_token
  )
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    '${ADMIN_EMAIL}',
    crypt('${ADMIN_PASSWORD}', gen_salt('bf', 10)),
    now(),
    '{"nombre_negocio": "${ADMIN_NOMBRE}", "role": "admin"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    'authenticated', 'authenticated',
    now(), now(), '', ''
  )
  RETURNING id INTO v_uid;

  RAISE NOTICE 'Admin creado: % (UUID: %)', '${ADMIN_EMAIL}', v_uid;
END $$;
`;

const outPath = resolve("scripts/admin.sql");
writeFileSync(outPath, sql, "utf8");
console.log("✓ SQL generado en:", outPath);
console.log("");
console.log("  Pasos:");
console.log("  1. Abre https://supabase.com/dashboard/project/htsryzrwdgllqnzbreyq/editor");
console.log("  2. Pega el contenido de scripts/admin.sql");
console.log("  3. Clic en 'Run'");
console.log("");
console.log("  Credenciales:");
console.log("  Email:     ", ADMIN_EMAIL);
console.log("  Contraseña:", ADMIN_PASSWORD);
