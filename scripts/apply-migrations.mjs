#!/usr/bin/env node
/**
 * Aplica las migraciones SQL de R3ZON contra el Supabase configurado en
 * .env.local. Usa el "Direct connection" (puerto 5432) como service_role.
 *
 * Ejecuta los archivos en orden, uno detrás de otro. Para evitar problemas
 * con sentencias plpgsql multi-línea (comillas dobles `$$`), envía cada
 * archivo como un único query mediante `client.query()`.
 *
 * Uso:
 *   node scripts/apply-migrations.mjs
 *   node scripts/apply-migrations.mjs --wipe   # borra antes (sólo dev)
 *   node scripts/apply-migrations.mjs --seed   # añade el seed al final
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ----- env -----
const envText = readFileSync(resolve(ROOT, ".env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const PROJECT_REF = env.SUPABASE_PROJECT_REF;
const PASSWORD    = env.SUPABASE_DB_PASSWORD;
if (!PROJECT_REF || !PASSWORD) {
  console.error("✖ Faltan SUPABASE_PROJECT_REF / SUPABASE_DB_PASSWORD en .env.local");
  process.exit(1);
}

// ----- conexión -----
// Usamos el "Session pooler" (puerto 5432) — la única conexión accesible
// vía IPv4 sin comprar el add-on. Host: aws-1-{region}.pooler.supabase.com.
// Como fallback intentamos primero la directa, luego el pooler.
// Posibles hosts del Session Pooler (puerto 5432) — intentamos varias regiones
// porque no podemos saber a priori en qué AWS region está el proyecto.
const poolerHosts = [
  "aws-0-eu-west-1.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
  "aws-0-eu-west-2.pooler.supabase.com",
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-1-eu-west-1.pooler.supabase.com",
  "aws-1-eu-central-1.pooler.supabase.com",
];
const candidates = [
  // 1) Direct (IPv6) — solo va si el equipo tiene IPv6 habilitado.
  { host: `db.${PROJECT_REF}.supabase.co`, port: 5432, user: "postgres" },
  // 2) Session pooler (IPv4) en cada región.
  ...poolerHosts.map((h) => ({ host: h, port: 5432, user: `postgres.${PROJECT_REF}` })),
];

const args = new Set(process.argv.slice(2));
const DO_WIPE = args.has("--wipe");
const DO_SEED = args.has("--seed");

// Orden FIJO de los archivos.
const FILES = [
  "supabase/schema.sql",
  "supabase/auth_extension.sql",
  "supabase/crm_kanban_ext.sql",
  "supabase/agenda_ext.sql",
];
if (DO_SEED) FILES.push("supabase/seed_clientes.sql");

const WIPE_SQL = `
begin;
drop table if exists public.agenda_eventos       cascade;
drop table if exists public.google_connections   cascade;
drop table if exists public.comunicaciones       cascade;
drop table if exists public.kanban_columnas      cascade;
drop table if exists public.tareas_kanban        cascade;
drop table if exists public.finanzas             cascade;
drop table if exists public.consentimientos_rgpd cascade;
drop table if exists public.contactos_empresa    cascade;
drop table if exists public.contactos_cliente    cascade;
drop table if exists public.empresas             cascade;
drop table if exists public.clientes             cascade;
drop table if exists public.citas                cascade;
drop table if exists public.config_keys          cascade;
drop table if exists public.dispositivos_conocidos cascade;
drop table if exists public.terminos_versiones   cascade;
commit;
`;

async function tryConnect() {
  for (const c of candidates) {
    const client = new pg.Client({
      host: c.host,
      port: c.port,
      database: "postgres",
      user: c.user,
      password: PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      console.log(`✔ Conectado a ${c.host}:${c.port} como ${c.user}`);
      return client;
    } catch (err) {
      console.warn(`⚠ ${c.host}: ${err.code || err.message}`);
      try { await client.end(); } catch {}
    }
  }
  throw new Error("No se pudo conectar a Supabase.");
}

async function run() {
  const client = await tryConnect();

  try {
    if (DO_WIPE) {
      console.log("→ Wipe de tablas existentes…");
      await client.query(WIPE_SQL);
      console.log("✔ Wipe completado");
    }

    for (const rel of FILES) {
      const path = resolve(ROOT, rel);
      const sql  = readFileSync(path, "utf8");
      console.log(`→ Aplicando ${rel} (${sql.length} bytes)…`);
      await client.query(sql);
      console.log(`✔ ${rel}`);
    }

    // Sanity check final
    const { rows } = await client.query(`
      select table_name
        from information_schema.tables
       where table_schema = 'public'
       order by table_name
    `);
    console.log("\n📦 Tablas en public:");
    for (const r of rows) console.log("  · " + r.table_name);

    if (DO_SEED) {
      const { rows: cnt } = await client.query("select count(*)::int as n from public.clientes");
      console.log(`\n🌱 clientes en BD: ${cnt[0].n}`);
    }
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("\n✖ Error:", err.message);
  if (err.detail) console.error("   detail:", err.detail);
  if (err.hint)   console.error("   hint:",   err.hint);
  process.exit(1);
});
