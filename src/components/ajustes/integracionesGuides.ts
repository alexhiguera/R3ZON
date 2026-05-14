import type { HelpStep } from "./HelpDrawer";

export const GOOGLE_OAUTH_GUIDE: {
  title: string;
  intro: string;
  steps: HelpStep[];
  footerNote: string;
} = {
  title: "Cómo conectar Google Workspace",
  intro:
    "Conectar tu cuenta de Google permite a r3zon leer y crear eventos en tu Calendar y subir archivos a Drive en tu nombre. Sólo accede a lo que autorizas explícitamente.",
  steps: [
    {
      title: "Pulsa «Conectar Google»",
      body: "Te llevará a la pantalla oficial de Google. Esto ocurre en google.com — r3zon nunca ve tu contraseña.",
    },
    {
      title: "Elige la cuenta correcta",
      body: "Si tienes varias cuentas Google, asegúrate de elegir la del negocio (no la personal). El email que elijas será el que aparezca como “Conectado” aquí.",
    },
    {
      title: "Revisa y acepta los permisos",
      body: "Google te pedirá conceder permisos de Calendar y Drive. Pulsa «Permitir». Si sale el aviso «Esta app no está verificada», pulsa «Configuración avanzada» → «Continuar» (estamos en proceso de verificación oficial).",
    },
    {
      title: "Vuelves automáticamente al CRM",
      body: "Tras aceptar, Google te redirige aquí y el botón cambiará a «Conectado» mostrando tu email. Ya puedes sincronizar la Agenda.",
    },
  ],
  footerNote:
    "Tus tokens OAuth se guardan cifrados con pgcrypto. Puedes revocarlos en cualquier momento desde Google → Seguridad → Apps con acceso a tu cuenta.",
};
