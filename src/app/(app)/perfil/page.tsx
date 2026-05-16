"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { MisCitas } from "@/components/perfil/MisCitas";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";

const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ACCEPT = ["image/png", "image/jpeg", "image/webp"];

type Rol = "owner" | "admin" | "miembro";

const PERMISOS_POR_ROL: Record<Rol, string[]> = {
  owner: [
    "Gestión completa del negocio",
    "Facturación y suscripción",
    "Invitar y revocar miembros",
    "Configurar integraciones",
    "Acceso total a todos los módulos",
  ],
  admin: [
    "Editar clientes, productos y documentos",
    "Acceso a TPV, stock y agenda",
    "Sin acceso a facturación ni gestión de equipo",
  ],
  miembro: ["Lectura y edición limitada según asignación", "Sin acceso a ajustes del negocio"],
};

type Toast = { kind: "ok" | "err"; msg: string } | null;

export default function PerfilPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [telefono, setTelefono] = useState<string>("");
  const [puesto, setPuesto] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [rol, setRol] = useState<Rol>("owner");
  const [negocio, setNegocio] = useState<string>("");
  const [toast, setToast] = useState<Toast>(null);
  const { confirm: confirmDialog, dialog: confirmDialogNode } = useConfirmDialog();

  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const meta = (user.user_metadata ?? {}) as {
        display_name?: string;
        telefono?: string;
        puesto?: string;
        avatar_url?: string;
      };
      setUserId(user.id);
      setEmail(user.email ?? "");
      setCreatedAt(user.created_at ?? "");
      setDisplayName(meta.display_name ?? "");
      setTelefono(meta.telefono ?? "");
      setPuesto(meta.puesto ?? "");
      setAvatarUrl(meta.avatar_url ?? null);

      const { data: perfil } = await supabase
        .from("perfiles_negocio")
        .select("user_id, nombre_negocio")
        .eq("user_id", user.id)
        .maybeSingle();

      if (perfil) {
        setRol(perfil.user_id === user.id ? "owner" : "miembro");
        setNegocio(perfil.nombre_negocio ?? "");
      } else {
        // Si no es el owner, intenta resolver desde miembros_negocio (vista).
        const { data: m } = await supabase
          .from("miembros_negocio")
          .select("rol")
          .eq("user_id", user.id)
          .maybeSingle();
        if (m?.rol === "admin" || m?.rol === "miembro" || m?.rol === "owner") {
          setRol(m.rol as Rol);
        }
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  async function guardar() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName.trim() || null,
        telefono: telefono.trim() || null,
        puesto: puesto.trim() || null,
        avatar_url: avatarUrl,
      },
    });
    setSaving(false);
    if (error) flash({ kind: "err", msg: error.message });
    else flash({ kind: "ok", msg: "Perfil actualizado." });
  }

  async function subirAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!AVATAR_ACCEPT.includes(file.type)) {
      flash({ kind: "err", msg: "Formato no soportado (usa PNG, JPG o WEBP)." });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      flash({ kind: "err", msg: "El avatar supera 2 MB." });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) {
      setUploading(false);
      if (/bucket .* not found/i.test(upErr.message)) {
        flash({
          kind: "err",
          msg: "Bucket 'avatars' no existe. Aplica supabase/perfil_usuario_ext.sql.",
        });
      } else {
        flash({ kind: "err", msg: upErr.message });
      }
      return;
    }
    const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    setAvatarUrl(pub.publicUrl);
    const { error: metaErr } = await supabase.auth.updateUser({
      data: { avatar_url: pub.publicUrl },
    });
    setUploading(false);
    if (metaErr) flash({ kind: "err", msg: formatSupabaseError(metaErr) });
    else flash({ kind: "ok", msg: "Avatar actualizado." });
  }

  async function quitarAvatar() {
    const ok = await confirmDialog({
      title: "Eliminar avatar",
      message:
        "Tu foto de perfil se quitará de la cuenta. Podrás volver a subir una en cualquier momento.",
      confirmLabel: "Eliminar",
      tone: "warning",
    });
    if (!ok) return;
    setAvatarUrl(null);
    await supabase.auth.updateUser({ data: { avatar_url: null } });
    flash({ kind: "ok", msg: "Avatar eliminado." });
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Cuenta" title="Mi perfil" />
        <div className="card-glass flex items-center gap-2 p-6 text-sm text-text-mid">
          <Loader2 className="animate-spin" size={14} /> Cargando perfil…
        </div>
      </div>
    );
  }

  const initials = (displayName || email || "U").slice(0, 2).toUpperCase();
  const altaFmt = createdAt
    ? new Date(createdAt).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cuenta"
        title="Mi perfil"
        description="Información personal, avatar y permisos en el negocio."
      />

      {toast && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {toast.kind === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[260px,1fr]">
        {/* Avatar */}
        <div className="card-glass flex flex-col items-center gap-4 p-5">
          <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-cyan/30 bg-gradient-to-br from-cyan/15 to-fuchsia/15">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName || email}
                fill
                sizes="128px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-cyan">
                {initials}
              </span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={AVATAR_ACCEPT.join(",")}
            onChange={subirAvatar}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-400/30 bg-indigo-900/40 px-3 py-1.5 text-xs font-semibold text-text-hi hover:border-cyan/40 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {avatarUrl ? "Cambiar avatar" : "Subir avatar"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={quitarAvatar}
              className="inline-flex items-center gap-1.5 text-[11px] text-danger hover:underline"
            >
              <Trash2 size={11} /> Eliminar
            </button>
          )}
          <p className="text-center text-[10px] text-text-lo">PNG · JPG · WEBP — máx 2 MB</p>
        </div>

        {/* Info */}
        <div className="card-glass space-y-4 p-5">
          <h2 className="font-display text-lg font-bold text-text-hi">Información personal</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre para mostrar" full>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Higuera"
              />
            </Field>
            <Field label="Email" hint="Solo lectura — se cambia desde Ajustes › Seguridad.">
              <Input value={email} disabled />
            </Field>
            <Field label="Alta en ANTARES">
              <Input value={altaFmt} disabled />
            </Field>
            <Field label="Teléfono">
              <Input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+34 600 000 000"
              />
            </Field>
            <Field label="Puesto / Rol interno">
              <Input
                value={puesto}
                onChange={(e) => setPuesto(e.target.value)}
                placeholder="Fundador, Comercial, Contable…"
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={guardar}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2 text-sm font-bold text-bg disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar cambios
            </button>
          </div>
        </div>
      </div>

      <MisCitas />

      {/* Permisos */}
      <div className="card-glass space-y-3 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-cyan" />
          <h2 className="font-display text-lg font-bold text-text-hi">Permisos</h2>
          <span className="ml-auto rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan">
            {rol}
          </span>
        </div>
        <p className="text-xs text-text-mid">
          {negocio ? (
            <>
              Negocio: <strong className="text-text-hi">{negocio}</strong>.
            </>
          ) : null}{" "}
          Tus permisos derivan del rol asignado.
        </p>
        <ul className="space-y-1.5 text-sm text-text-mid">
          {PERMISOS_POR_ROL[rol].map((p) => (
            <li key={p} className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      {confirmDialogNode}
    </div>
  );
}
