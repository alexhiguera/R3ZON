import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsTabs } from "@/components/ajustes/SettingsTabs";
import { createClient } from "@/lib/supabase/server";
import type { PerfilNegocio } from "@/components/ajustes/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil, error } = await supabase
    .from("perfiles_negocio")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !perfil) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Configuración"
          title="Ajustes"
          description="No se encontró el perfil del negocio. Completa el onboarding para continuar."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Configuración"
        title="Ajustes"
        description="Perfil del negocio, integraciones, equipo, suscripción y seguridad."
      />
      <SettingsTabs perfil={perfil as PerfilNegocio} />
    </div>
  );
}
