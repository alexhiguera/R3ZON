import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ModuleTourGate } from "@/components/onboarding/ModuleTourGate";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { createClient } from "@/lib/supabase/server";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
  // El wizard de onboarding renderiza su propio chrome full-screen, así que
  // saltamos el AppShell (sin sidebar/topbar) para una experiencia limpia.
  if (pathname.startsWith("/onboarding")) {
    return (
      <ThemeProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
      </ThemeProvider>
    );
  }

  const { data: perfil } = await supabase
    .from("perfiles_negocio")
    .select("onboarding_completado, onboarding_modulos_vistos")
    .eq("user_id", user.id)
    .single();

  if (perfil && !perfil.onboarding_completado) {
    redirect("/onboarding");
  }

  return (
    <ThemeProvider>
      <OnboardingProvider initialModulosVistos={perfil?.onboarding_modulos_vistos ?? []}>
        <AppShell>
          <ErrorBoundary>{children}</ErrorBoundary>
        </AppShell>
        <ModuleTourGate />
      </OnboardingProvider>
    </ThemeProvider>
  );
}
