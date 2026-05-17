"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { MODULOS, type ModuloId, planPermite } from "@/lib/sidebarModulos";
import { createClient } from "@/lib/supabase/client";
import { direccionSchema, empresaSchema, preferenciasSchema, usuarioSchema } from "./schemas";
import { Step0Bienvenida } from "./steps/Step0Bienvenida";
import { Step1Usuario } from "./steps/Step1Usuario";
import { Step2Empresa } from "./steps/Step2Empresa";
import { Step3DireccionLogo } from "./steps/Step3DireccionLogo";
import { Step4Preferencias } from "./steps/Step4Preferencias";
import { Step5Modulos } from "./steps/Step5Modulos";
import { LEGAL_OPCIONAL, LEGAL_REQUIRED, LEGAL_VERSION, Step6Legal } from "./steps/Step6Legal";
import { Step7Plan } from "./steps/Step7Plan";

const STEP_LABELS = [
  "Inicio",
  "Tú",
  "Empresa",
  "Contacto",
  "Preferencias",
  "Módulos",
  "Legal",
  "Plan",
];
const HIDDEN_MODULES_KEY = "r3zon:sidebar-hidden-modules:v1";

export type OnboardingInitial = {
  perfilId: string;
  paso: number;
  datos: Record<string, unknown>;
  perfil: {
    nombre_negocio: string | null;
    cif_nif: string | null;
    sector: string | null;
    email_contacto: string | null;
    telefono: string | null;
    direccion: string | null;
    logo_url: string | null;
    moneda: string;
    zona_horaria: string;
    plan: string;
  };
  usuario: {
    nombre_completo: string | null;
    cargo: string | null;
    avatar_url: string | null;
  };
};

export function OnboardingWizard({ initial }: { initial: OnboardingInitial }) {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState(Math.min(initial.paso, STEP_LABELS.length - 1));
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // --- Estado por paso ---
  const [usuario, setUsuario] = useState({
    nombre_completo: initial.usuario.nombre_completo ?? "",
    cargo: initial.usuario.cargo ?? "",
    avatar_url: initial.usuario.avatar_url ?? "",
  });
  const [empresa, setEmpresa] = useState({
    nombre_negocio: initial.perfil.nombre_negocio ?? "",
    cif_nif: initial.perfil.cif_nif ?? "",
    sector: initial.perfil.sector ?? "",
    telefono: initial.perfil.telefono ?? "",
  });
  const [direccion, setDireccion] = useState({
    direccion: initial.perfil.direccion ?? "",
    email_contacto: initial.perfil.email_contacto ?? "",
    logo_url: initial.perfil.logo_url ?? "",
  });
  const [preferencias, setPreferencias] = useState({
    moneda: initial.perfil.moneda || "EUR",
    zona_horaria: initial.perfil.zona_horaria || "Europe/Madrid",
  });
  const [ocultos, setOcultos] = useState<Set<ModuloId>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(HIDDEN_MODULES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? (arr as ModuloId[]) : []);
    } catch {
      return new Set();
    }
  });
  const [legal, setLegal] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const plan = (initial.perfil.plan as "free" | "pro" | "business") || "free";

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Persiste los ocultos automáticamente (mismo formato que useModulosOcultos).
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HIDDEN_MODULES_KEY, JSON.stringify(Array.from(ocultos)));
    window.dispatchEvent(new CustomEvent("r3zon:modulos-changed"));
  }, [ocultos]);

  const setUsuarioField = <K extends keyof typeof usuario>(k: K, v: (typeof usuario)[K]) => {
    setUsuario((u) => ({ ...u, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const setEmpresaField = <K extends keyof typeof empresa>(k: K, v: (typeof empresa)[K]) => {
    setEmpresa((u) => ({ ...u, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const setDireccionField = <K extends keyof typeof direccion>(k: K, v: (typeof direccion)[K]) => {
    setDireccion((u) => ({ ...u, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const setPreferenciasField = <K extends keyof typeof preferencias>(
    k: K,
    v: (typeof preferencias)[K],
  ) => setPreferencias((u) => ({ ...u, [k]: v }));

  const toggleModulo = (id: ModuloId) => {
    setOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Guardado de progreso en DB ---
  async function persistir(
    parciales: Record<string, string | null>,
    datos: Record<string, unknown>,
    paso: number,
    finalizar = false,
  ) {
    const { error } = await supabase.rpc("guardar_paso_onboarding", {
      p_paso: paso,
      p_datos: datos,
      p_parciales: parciales,
      p_finalizar: finalizar,
    });
    if (error) {
      flash(`No se pudo guardar el progreso: ${error.message}`);
      return false;
    }
    return true;
  }

  // Avanza siempre tras persistir.
  async function avanzar(parciales: Record<string, string | null>, datos: Record<string, unknown>) {
    setBusy("save");
    const ok = await persistir(parciales, datos, step + 1);
    setBusy(null);
    if (ok) setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  // --- Handlers de continue/skip por paso ---
  const onContinuar = async () => {
    if (step === 0) {
      await avanzar({}, {});
      return;
    }
    if (step === 1) {
      const parsed = usuarioSchema.safeParse(usuario);
      if (!parsed.success) return setErrors(zodErrors(parsed.error));
      // Guarda en auth.users metadata
      setBusy("save");
      await supabase.auth.updateUser({
        data: {
          full_name: parsed.data.nombre_completo,
          cargo: parsed.data.cargo,
          avatar_url: parsed.data.avatar_url,
        },
      });
      setBusy(null);
      await avanzar(
        {},
        {
          usuario: {
            nombre_completo: parsed.data.nombre_completo,
            cargo: parsed.data.cargo,
            avatar_url: parsed.data.avatar_url,
          },
        },
      );
      return;
    }
    if (step === 2) {
      const parsed = empresaSchema.safeParse(empresa);
      if (!parsed.success) return setErrors(zodErrors(parsed.error));
      await avanzar(
        {
          nombre_negocio: parsed.data.nombre_negocio,
          cif_nif: parsed.data.cif_nif ?? "",
          sector: parsed.data.sector ?? "",
          telefono: parsed.data.telefono ?? "",
        },
        {},
      );
      return;
    }
    if (step === 3) {
      const parsed = direccionSchema.safeParse(direccion);
      if (!parsed.success) return setErrors(zodErrors(parsed.error));
      await avanzar(
        {
          direccion: parsed.data.direccion ?? "",
          email_contacto: parsed.data.email_contacto ?? "",
          logo_url: parsed.data.logo_url ?? "",
        },
        {},
      );
      return;
    }
    if (step === 4) {
      const parsed = preferenciasSchema.safeParse(preferencias);
      if (!parsed.success) return setErrors(zodErrors(parsed.error));
      await avanzar({ moneda: parsed.data.moneda, zona_horaria: parsed.data.zona_horaria }, {});
      return;
    }
    if (step === 5) {
      await avanzar({}, { modulos_ocultos: Array.from(ocultos) });
      return;
    }
    if (step === 6) {
      // Persistencia legal vía RPC existente (con p_finalizar=false).
      const required = LEGAL_REQUIRED.every((d) => !!legal[d.tipo]);
      if (!required) {
        flash("Marca las casillas obligatorias para continuar.");
        return;
      }
      setBusy("save");
      const consentimientos = [...LEGAL_REQUIRED, ...LEGAL_OPCIONAL].map((d) => ({
        tipo: d.tipo,
        version: LEGAL_VERSION,
        aceptado: !!legal[d.tipo],
      }));
      const { error } = await supabase.rpc("registrar_onboarding", {
        p_consentimientos: consentimientos,
        p_user_agent: navigator.userAgent,
        p_finalizar: false,
      });
      setBusy(null);
      if (error) return flash(`No se pudo registrar el consentimiento: ${error.message}`);
      await avanzar({}, { legal_aceptado_en: new Date().toISOString() });
      return;
    }
  };

  const onSkip = async () => {
    // "Rellenar más tarde" — persiste lo que haya, sin validar campos opcionales,
    // y avanza. NO disponible en step 0, 6 ni 7.
    if (step === 1) {
      setBusy("skip");
      await supabase.auth.updateUser({
        data: {
          full_name: usuario.nombre_completo || null,
          cargo: usuario.cargo || null,
          avatar_url: usuario.avatar_url || null,
        },
      });
      setBusy(null);
      await avanzar({}, { usuario_skipped: true });
      return;
    }
    if (step === 2) {
      await avanzar(
        {
          nombre_negocio: empresa.nombre_negocio || "",
          cif_nif: empresa.cif_nif || "",
          sector: empresa.sector || "",
          telefono: empresa.telefono || "",
        },
        { empresa_skipped: true },
      );
      return;
    }
    if (step === 3) {
      await avanzar(
        {
          direccion: direccion.direccion || "",
          email_contacto: direccion.email_contacto || "",
          logo_url: direccion.logo_url || "",
        },
        { direccion_skipped: true },
      );
      return;
    }
    if (step === 4) {
      await avanzar(
        { moneda: preferencias.moneda, zona_horaria: preferencias.zona_horaria },
        { preferencias_skipped: true },
      );
      return;
    }
    if (step === 5) {
      await avanzar({}, { modulos_skipped: true });
      return;
    }
  };

  const onBack = () => setStep((s) => Math.max(0, s - 1));

  // --- Paso final: plan ---
  const finalizarConFree = async () => {
    setBusy("free");
    const ok = await persistir({}, { plan_elegido: "free" }, STEP_LABELS.length - 1, true);
    if (!ok) {
      setBusy(null);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  };

  const finalizarConPago = async (plan: "pro" | "business") => {
    setBusy(`checkout-${plan}`);
    // Marca completado primero para que al volver de Stripe no caiga otra vez al wizard.
    const ok = await persistir({}, { plan_elegido: plan }, STEP_LABELS.length - 1, true);
    if (!ok) {
      setBusy(null);
      return;
    }
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) {
      setBusy(null);
      flash(json.error ?? "No se pudo iniciar el checkout. Te dejamos en el dashboard.");
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    window.location.href = json.url;
  };

  // --- Render por paso ---
  const stepNode = useMemo(() => {
    switch (step) {
      case 0:
        return <Step0Bienvenida nombre={initial.usuario.nombre_completo} />;
      case 1:
        return <Step1Usuario values={usuario} errors={errors} onChange={setUsuarioField} />;
      case 2:
        return <Step2Empresa values={empresa} errors={errors} onChange={setEmpresaField} />;
      case 3:
        return (
          <Step3DireccionLogo
            perfilId={initial.perfilId}
            values={direccion}
            errors={errors}
            onChange={setDireccionField}
            onError={flash}
          />
        );
      case 4:
        return <Step4Preferencias values={preferencias} onChange={setPreferenciasField} />;
      case 5: {
        // Filtra módulos no permitidos por plan para que el "set" inicial no incluya bloqueados.
        const ocultosFiltrados = new Set<ModuloId>(
          Array.from(ocultos).filter((id) => {
            const def = MODULOS.find((m) => m.id === id);
            return !!def && planPermite(plan, def.minPlan);
          }),
        );
        return <Step5Modulos plan={plan} ocultos={ocultosFiltrados} onToggle={toggleModulo} />;
      }
      case 6:
        return <Step6Legal checked={legal} onChange={setLegal} />;
      case 7:
        return (
          <Step7Plan onSelectFree={finalizarConFree} onSelectPaid={finalizarConPago} busy={busy} />
        );
      default:
        return null;
    }
  }, [step, usuario, empresa, direccion, preferencias, ocultos, legal, errors, busy]);

  // --- Configuración de footer por paso ---
  const stepConfig = (() => {
    if (step === 0) {
      return {
        title: "Bienvenido a R3ZON ANTARES",
        subtitle: undefined,
        continueLabel: "Empezar",
        showBack: false,
        showSkip: false,
      };
    }
    if (step === 1) {
      return {
        title: "Cuéntanos sobre ti",
        subtitle: "Estos datos personalizan tu experiencia y aparecen en tus comunicaciones.",
        continueLabel: "Continuar",
        showBack: true,
        showSkip: true,
      };
    }
    if (step === 2) {
      return {
        title: "Tu negocio",
        subtitle: "Datos esenciales de tu empresa. Aparecerán en facturas y documentos.",
        continueLabel: "Continuar",
        showBack: true,
        showSkip: true,
      };
    }
    if (step === 3) {
      return {
        title: "Contacto y logo",
        subtitle: "Cómo te encuentran tus clientes y cómo te ven en facturas y emails.",
        continueLabel: "Continuar",
        showBack: true,
        showSkip: true,
      };
    }
    if (step === 4) {
      return {
        title: "Preferencias",
        subtitle: "Ajustamos la app a tu mercado.",
        continueLabel: "Continuar",
        showBack: true,
        showSkip: true,
      };
    }
    if (step === 5) {
      return {
        title: "Módulos a usar",
        subtitle: "Mantén tu menú lateral con solo lo que necesitas.",
        continueLabel: "Continuar",
        showBack: true,
        showSkip: true,
      };
    }
    if (step === 6) {
      return {
        title: "Consentimientos legales",
        subtitle: undefined,
        continueLabel: "Aceptar y continuar",
        showBack: true,
        showSkip: false,
      };
    }
    return {
      title: "Tu plan",
      subtitle: "Empieza gratis o desbloquea más capacidades.",
      continueLabel: "",
      showBack: true,
      showSkip: false,
      customFooter: true as const,
    };
  })();

  const continueDisabled = step === 6 ? !LEGAL_REQUIRED.every((d) => !!legal[d.tipo]) : false;

  return (
    <>
      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200 shadow-lg backdrop-blur-md"
        >
          <span className="flex items-center gap-1.5">
            <AlertCircle size={12} /> {toast}
          </span>
        </div>
      )}
      <WizardShell
        total={STEP_LABELS.length}
        current={step}
        labels={STEP_LABELS}
        title={stepConfig.title}
        subtitle={stepConfig.subtitle}
        onBack={stepConfig.showBack ? onBack : undefined}
        showBack={stepConfig.showBack}
        onContinue={onContinuar}
        onSkip={stepConfig.showSkip ? onSkip : undefined}
        continueLabel={stepConfig.continueLabel}
        continueDisabled={continueDisabled}
        busy={busy === "save" || busy === "skip"}
        customFooter={
          "customFooter" in stepConfig && stepConfig.customFooter ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 text-sm font-medium text-text-hi hover:border-cyan/40"
            >
              ← Atrás
            </button>
          ) : undefined
        }
      >
        {stepNode}
      </WizardShell>
    </>
  );
}

function zodErrors(err: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = issue.path[0] as string;
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}
