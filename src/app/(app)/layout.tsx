import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pathname = (await headers()).get("x-invoke-path") ?? "";

  // Si el onboarding no está completado y no estamos ya en él → redirigir
  const { data: perfil } = await supabase
    .from("perfiles_negocio")
    .select("onboarding_completado")
    .eq("user_id", user.id)
    .single();

  if (perfil && !perfil.onboarding_completado && !pathname.startsWith("/onboarding")) {
    redirect("/onboarding");
  }

  return <AppShell>{children}</AppShell>;
}
