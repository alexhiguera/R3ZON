import type { HelpStep } from "./HelpDrawer";

export const N8N_WEBHOOK_GUIDE: {
  title: string;
  intro: string;
  steps: HelpStep[];
  footerNote: string;
} = {
  title: "Cómo obtener mi URL de n8n",
  intro:
    "n8n te genera una URL única (webhook) por cada flujo de automatización. Copia esa URL aquí para que tu CRM dispare el flujo automáticamente.",
  steps: [
    {
      title: "Abre tu instancia de n8n",
      body: "Inicia sesión en n8n (n8n.cloud o tu instancia self-hosted). En el menú lateral pulsa “Workflows” y abre el flujo que quieras conectar.",
    },
    {
      title: "Añade un nodo Webhook como trigger",
      body: "Haz clic en el “+” inicial del flujo, busca «Webhook» y selecciónalo. En el panel de la derecha, pon el método HTTP en POST y deja “Path” en blanco para que n8n genere uno único.",
    },
    {
      title: "Copia la Production URL",
      body: "n8n muestra dos URLs: «Test URL» (sólo activa cuando pulsas Listen) y «Production URL» (siempre activa cuando el flujo está publicado). Copia la **Production URL** — es la que pegarás aquí.",
    },
    {
      title: "Activa el flujo",
      body: "En la esquina superior derecha de n8n, conmuta el interruptor a “Active”. Sin esto, el webhook devuelve 404 y tu CRM no podrá disparar el flujo.",
    },
    {
      title: "Pega la URL aquí y guarda",
      body: "Vuelve a esta pantalla, pega la URL en el campo «URL del Webhook» y pulsa Guardar. Puedes probarla con el botón «Enviar prueba» que aparecerá tras guardar.",
    },
  ],
  footerNote:
    "Tu URL se guarda cifrada con pgcrypto en Supabase. Sólo tu negocio puede leerla.",
};

export const N8N_API_KEY_GUIDE: {
  title: string;
  intro: string;
  steps: HelpStep[];
  footerNote: string;
} = {
  title: "Cómo generar una API Key de n8n",
  intro:
    "La API Key se envía como cabecera HTTP cuando tu CRM llama al webhook. Permite que n8n verifique que la petición viene de ti y rechace tráfico no autorizado.",
  steps: [
    {
      title: "Entra en Settings → API",
      body: "En n8n, abre tu menú de usuario (esquina inferior izquierda) → «Settings» → pestaña «API». Si no la ves, asegúrate de tener permisos de Owner o Admin.",
    },
    {
      title: "Crea una nueva API Key",
      body: "Pulsa «Create an API Key», ponle un nombre descriptivo (p. ej. «r3zon CRM») y, opcionalmente, una fecha de expiración.",
    },
    {
      title: "Copia la clave inmediatamente",
      body: "n8n te muestra la clave **una sola vez**. Cópiala en cuanto aparezca — si cierras el diálogo sin copiarla, tendrás que generar una nueva.",
    },
    {
      title: "Pégala aquí y guarda",
      body: "Pega la clave en el campo «API Key» y pulsa Guardar. Si más adelante quieres rotarla, vuelve a Settings → API en n8n y revoca la antigua.",
    },
  ],
  footerNote:
    "La clave se cifra con pgcrypto antes de guardarse. Nunca se muestra en claro tras guardar.",
};

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
