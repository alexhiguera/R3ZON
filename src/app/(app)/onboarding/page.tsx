import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type OnboardingInitial, OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles_negocio")
    .select(
      "id, nombre_negocio, cif_nif, sector, email_contacto, telefono, direccion, logo_url, moneda, zona_horaria, plan, onboarding_paso, onboarding_datos, onboarding_completado",
    )
    .eq("user_id", user.id)
    .single();

  if (!perfil) {
    // El trigger crea perfiles_negocio en signup; si no existe es un caso límite.
    redirect("/login");
  }

  if (perfil.onboarding_completado) {
    redirect("/dashboard");
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const initial: OnboardingInitial = {
    perfilId: perfil.id,
    paso: perfil.onboarding_paso ?? 0,
    datos: (perfil.onboarding_datos as Record<string, unknown>) ?? {},
    perfil: {
      nombre_negocio: perfil.nombre_negocio,
      cif_nif: perfil.cif_nif,
      sector: perfil.sector,
      email_contacto: perfil.email_contacto,
      telefono: perfil.telefono,
      direccion: perfil.direccion,
      logo_url: perfil.logo_url,
      moneda: perfil.moneda,
      zona_horaria: perfil.zona_horaria,
      plan: perfil.plan,
    },
    usuario: {
      nombre_completo: (meta.full_name as string) ?? null,
      cargo: (meta.cargo as string) ?? null,
      avatar_url: (meta.avatar_url as string) ?? null,
    },
  };

  return <OnboardingWizard initial={initial} />;
}
