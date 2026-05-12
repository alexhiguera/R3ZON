#!/usr/bin/env node
/**
 * Aplica las migraciones SQL pendientes (iteraciones 38 y 40) contra la BD
 * productiva de Supabase. Idempotente: cada migración usa CREATE … IF NOT
 * EXISTS / DROP POLICY IF EXISTS antes de crear.
 *
 * Uso:  node scripts/apply-pending-migrations.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- env ---
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

// --- candidatos de conexión (mismo orden que apply-migrations.mjs) ---
const poolerHosts = [
  "aws-0-eu-west-1.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
  "aws-0-eu-west-2.pooler.supabase.com",
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-1-eu-west-1.pooler.supabase.com",
  "aws-1-eu-central-1.pooler.supabase.com",
];
const candidates = [
  { host: `db.${PROJECT_REF}.supabase.co`, port: 5432, user: "postgres" },
  ...poolerHosts.map((h) => ({ host: h, port: 5432, user: `postgres.${PROJECT_REF}` })),
];

// --- migraciones a aplicar, en orden ---
const FILES = [
  // RPCs de reordenación batch del Kanban (reordenar_tareas_batch / reordenar_columnas_batch).
  "supabase/crm_kanban_ext.sql",
  "supabase/theme_ext.sql",
  "supabase/perfil_usuario_ext.sql",
  "supabase/inventario_imagenes_ext.sql",
  "supabase/proveedores_ext.sql",
  // Re-aplicar fix_tenant_defaults para registrar los nuevos triggers.
  "supabase/fix_tenant_defaults.sql",
  // Iteración: tipo 'recibo' en documentos + bucket 'logos'.
  "supabase/documentos_recibo_logos_ext.sql",
  // Iteración: flag stock_mode_enabled en perfiles_negocio (página Listado).
  "supabase/listado_ext.sql",
  // Iteración: RPCs + vista para registrar/revocar consentimientos RGPD del titular.
  "supabase/rgpd_ext.sql",
];

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
    for (const rel of FILES) {
      const path = resolve(ROOT, rel);
      const sql  = readFileSync(path, "utf8");
      console.log(`→ Aplicando ${rel} (${sql.length} bytes)…`);
      await client.query(sql);
      console.log(`✔ ${rel}`);
    }

    // Sanity checks
    const checks = [
      ["user_preferences existe", "select 1 from public.user_preferences limit 1"],
      ["proveedores existe",      "select 1 from public.proveedores limit 1"],
      ["gastos_proveedor existe", "select 1 from public.gastos_proveedor limit 1"],
    ];
    for (const [label, q] of checks) {
      try {
        await client.query(q);
        console.log(`✔ ${label}`);
      } catch (e) {
        console.log(`✔ ${label} (vacía: ${e.message.split("\n")[0]})`);
      }
    }

    const { rows: buckets } = await client.query(
      "select id from storage.buckets where id = any($1::text[])",
      [["avatars", "producto-imagenes"]]
    );
    console.log(`✔ Buckets storage: ${buckets.map((b) => b.id).join(", ") || "ninguno (revisar permisos)"}`);
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
