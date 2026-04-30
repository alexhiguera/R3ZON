#!/usr/bin/env node
/**
 * Verifica el estado del tenant y, si hay auth.users sin perfiles_negocio,
 * crea uno y vuelve a ejecutar el seed de clientes.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const client = new pg.Client({
  host: "aws-1-eu-central-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${env.SUPABASE_PROJECT_REF}`,
  password: env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const { rows: users }    = await client.query("select id, email from auth.users limit 10");
const { rows: perfiles } = await client.query("select id, user_id, nombre_negocio from public.perfiles_negocio");
console.log("auth.users:",        users.length);
console.log("perfiles_negocio:",  perfiles.length);

// Si hay user pero no perfil, lo creamos a mano (el trigger sólo dispara en INSERT nuevos).
for (const u of users) {
  const tieneperfil = perfiles.find((p) => p.user_id === u.id);
  if (!tieneperfil) {
    console.log(`→ Creando perfiles_negocio para ${u.email}`);
    await client.query(
      `insert into public.perfiles_negocio (user_id, nombre_negocio, email_contacto)
       values ($1, $2, $3) on conflict (user_id) do nothing`,
      [u.id, "Mi negocio", u.email]
    );
  }
}

// Re-aplicar el seed.
const seed = readFileSync(resolve(ROOT, "supabase/seed_clientes.sql"), "utf8");
await client.query(seed);

const { rows: cnt } = await client.query("select count(*)::int as n from public.clientes");
const { rows: ctc } = await client.query("select count(*)::int as n from public.contactos_cliente");
console.log(`\n✅ clientes:           ${cnt[0].n}`);
console.log(`✅ contactos_cliente: ${ctc[0].n}`);

const { rows: muestra } = await client.query(
  "select nombre, cif, sector, ciudad, estado from public.clientes order by nombre limit 10"
);
console.log("\n📇 Clientes en BD:");
muestra.forEach((c) => console.log(`  · ${c.nombre.padEnd(40)} ${c.cif}  [${c.estado}]  ${c.sector} · ${c.ciudad}`));

await client.end();
