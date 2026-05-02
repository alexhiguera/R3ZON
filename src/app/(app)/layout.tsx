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

  // `x-pathname` lo inyecta `proxy.ts`. `x-invoke-path` desapareció en Next.js 16.
  const pathname = (await headers()).get("x-pathname") ?? "";

  // Si el onboarding no está completado y no estamos ya en él → redirigir.
  // Importante: si ya estamos en /onboarding hay que SALIR antes de hacer la
  // consulta para evitar el loop 307 cuando el header viniera vacío.
  if (pathname.startsWith("/onboarding")) {
    return <AppShell>{children}</AppShell>;
  }

  const { data: perfil } = await supabase
    .from("perfiles_negocio")
    .select("onboarding_completado")
    .eq("user_id", user.id)
    .single();

  if (perfil && !perfil.onboarding_completado) {
    redirect("/onboarding");
  }

  return <AppShell>{children}</AppShell>;
}
