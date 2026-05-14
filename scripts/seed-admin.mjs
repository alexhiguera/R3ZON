// Crea el usuario admin de desarrollo usando la service_role key.
// Uso:
//   npm run seed:admin
//
// Lee de .env.local: SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD,
// ADMIN_NOMBRE_NEGOCIO, NEXT_PUBLIC_SUPABASE_URL.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Carga manual de .env.local (sin dependencia)
const env = {};
try {
  for (const line of readFileSync(resolve(".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("✗ No encuentro .env.local"); process.exit(1);
}

const {
  NEXT_PUBLIC_SUPABASE_URL: URL,
  SUPABASE_SERVICE_ROLE_KEY: KEY,
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: password,
  ADMIN_NOMBRE_NEGOCIO: nombre,
} = env;

if (!URL || !KEY) {
  console.error("✗ Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

// Guard anti-producción: este script es destructivo (crea usuarios con
// contraseñas hardcoded). Solo se permite contra el stack local de Supabase
// CLI. Para forzar contra otro entorno: ALLOW_PROD_SEED=1 npm run seed:admin
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(URL);
if (!isLocal && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("✗ seed:admin solo se ejecuta contra Supabase local.");
  console.error("  URL actual:", URL);
  console.error("  Si REALMENTE quieres ejecutarlo contra ese entorno:");
  console.error("    ALLOW_PROD_SEED=1 npm run seed:admin");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const { data, error } = await sb.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { nombre_negocio: nombre, role: "admin" },
});

if (error && !/already.*registered/i.test(error.message)) {
  console.error("✗", error.message); process.exit(1);
}

console.log("✓ Admin listo:", email);
console.log("  Contraseña:", password);
