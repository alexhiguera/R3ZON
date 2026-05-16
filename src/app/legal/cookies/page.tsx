import { H2, LegalDoc, UL } from "@/components/legal/LegalDoc";

export const metadata = { title: "Política de Cookies · ANTARES" };

export default function Page() {
  return (
    <LegalDoc eyebrow="Cookies" title="Política de Cookies">
      <p>
        De acuerdo con el artículo 22.2 de la <b>LSSI-CE</b> y la{" "}
        <b>Guía sobre el uso de las cookies</b> de la Agencia Española de Protección de Datos, te
        informamos de las cookies que utiliza ANTARES.
      </p>

      <H2>1. ¿Qué es una cookie?</H2>
      <p>
        Una cookie es un pequeño archivo que se descarga en tu dispositivo al acceder a determinadas
        páginas web o aplicaciones, y que permite, entre otras cosas, almacenar y recuperar
        información sobre tus hábitos de navegación.
      </p>

      <H2>2. Cookies que utilizamos</H2>

      <div className="overflow-x-auto rounded-xl border border-indigo-400/20">
        <table className="w-full text-left text-xs">
          <thead className="bg-indigo-900/40 text-text-mid">
            <tr>
              <th className="p-3">Cookie</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Finalidad</th>
              <th className="p-3">Duración</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-400/10">
            <tr>
              <td className="p-3 font-mono">sb-access-token</td>
              <td className="p-3">Técnica</td>
              <td className="p-3">Mantener sesión iniciada</td>
              <td className="p-3">1 hora</td>
            </tr>
            <tr>
              <td className="p-3 font-mono">sb-refresh-token</td>
              <td className="p-3">Técnica</td>
              <td className="p-3">Renovar la autenticación</td>
              <td className="p-3">7 días</td>
            </tr>
            <tr>
              <td className="p-3 font-mono">r3zon-prefs</td>
              <td className="p-3">Preferencias</td>
              <td className="p-3">Idioma, tema, ajustes UI</td>
              <td className="p-3">1 año</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2>3. Tipos de cookies por finalidad</H2>
      <UL>
        <li>
          <b>Técnicas (exentas de consentimiento):</b> imprescindibles para el funcionamiento del
          servicio.
        </li>
        <li>
          <b>De preferencias:</b> recuerdan opciones de personalización.
        </li>
        <li>
          <b>Analíticas:</b> únicamente si has dado tu consentimiento explícito.
        </li>
      </UL>
      <p>
        <b>ANTARES no utiliza cookies publicitarias ni de seguimiento de terceros.</b>
      </p>

      <H2>4. Configuración y revocación</H2>
      <p>
        Puedes configurar tu navegador para aceptar, rechazar o eliminar las cookies en cualquier
        momento:
      </p>
      <UL>
        <li>
          <a
            className="text-cyan hover:underline"
            href="https://support.google.com/chrome/answer/95647"
          >
            Chrome
          </a>{" "}
          ·{" "}
          <a
            className="text-cyan hover:underline"
            href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
          >
            Safari
          </a>{" "}
          ·{" "}
          <a
            className="text-cyan hover:underline"
            href="https://support.mozilla.org/es/kb/borrar-cookies"
          >
            Firefox
          </a>{" "}
          ·{" "}
          <a
            className="text-cyan hover:underline"
            href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d"
          >
            Edge
          </a>
        </li>
      </UL>

      <H2>5. Actualización</H2>
      <p>
        Podemos modificar esta política para adaptarla a cambios legales. Te recomendamos revisarla
        periódicamente.
      </p>
    </LegalDoc>
  );
}
