import { H2, LegalDoc, UL } from "@/components/legal/LegalDoc";

export const metadata = { title: "Política de Privacidad · ANTARES" };

export default function Page() {
  return (
    <LegalDoc eyebrow="RGPD · LOPDGDD" title="Política de Privacidad">
      <p>
        En R3ZON protegemos tus datos personales conforme al <b>Reglamento (UE) 2016/679 (RGPD)</b>{" "}
        y la{" "}
        <b>
          Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y Garantía de
          los Derechos Digitales (LOPDGDD)
        </b>
        .
      </p>

      <H2>1. Responsable del tratamiento</H2>
      <UL>
        <li>Identidad: [Razón social] · NIF: [NIF]</li>
        <li>Dirección: [Dirección postal]</li>
        <li>Correo: privacidad@r3zon.app</li>
        <li>Delegado de Protección de Datos (DPO): dpo@r3zon.app</li>
      </UL>

      <H2>2. Datos que tratamos</H2>
      <UL>
        <li>
          <b>Datos de cuenta:</b> nombre, email, contraseña cifrada, nombre del negocio.
        </li>
        <li>
          <b>Datos de uso:</b> dirección IP, dispositivo, navegador, fecha y hora de acceso.
        </li>
        <li>
          <b>Datos comerciales:</b> los que tú introduces sobre tus clientes, citas, tareas y
          finanzas (eres el <i>responsable</i> y nosotros actuamos como <i>encargado</i>).
        </li>
      </UL>

      <H2>3. Finalidades y bases jurídicas</H2>
      <UL>
        <li>
          <b>Prestación del servicio</b> — base: ejecución de contrato (art. 6.1.b RGPD).
        </li>
        <li>
          <b>Seguridad y prevención de fraude</b> (registro de dispositivos, alertas) — base:
          interés legítimo (art. 6.1.f).
        </li>
        <li>
          <b>Cumplimiento legal</b> (facturación, conservación contable) — base: obligación legal
          (art. 6.1.c).
        </li>
        <li>
          <b>Comunicaciones comerciales</b> — base: consentimiento (art. 6.1.a), revocable en
          cualquier momento.
        </li>
      </UL>

      <H2>4. Plazos de conservación</H2>
      <p>
        Los datos se conservarán mientras se mantenga la relación contractual y, posteriormente,
        durante los plazos legales aplicables (p. ej. 6 años para documentos contables, art. 30
        Código de Comercio).
      </p>

      <H2>5. Destinatarios y transferencias</H2>
      <UL>
        <li>
          <b>Supabase Inc.</b> (proveedor de base de datos y autenticación, servidores en la UE).
        </li>
        <li>
          <b>Resend Inc.</b> (envío transaccional de emails de seguridad).
        </li>
        <li>
          Proveedores de identidad federada (Google, Apple, Facebook) si decides iniciar sesión con
          ellos.
        </li>
      </UL>
      <p>
        Cuando exista transferencia internacional, se aplicarán las{" "}
        <b>Cláusulas Contractuales Tipo</b> aprobadas por la Comisión Europea.
      </p>

      <H2>6. Tus derechos</H2>
      <p>Puedes ejercer en cualquier momento los siguientes derechos:</p>
      <UL>
        <li>Acceso, rectificación, supresión y oposición.</li>
        <li>Limitación del tratamiento y portabilidad.</li>
        <li>Retirar el consentimiento prestado en cualquier momento.</li>
        <li>
          Reclamar ante la <b>Agencia Española de Protección de Datos</b> (
          <a href="https://www.aepd.es" className="text-cyan hover:underline">
            aepd.es
          </a>
          ).
        </li>
      </UL>
      <p>
        Para ejercerlos, escríbenos a <b>privacidad@r3zon.app</b> aportando copia de tu DNI o
        documento equivalente.
      </p>

      <H2>7. Medidas de seguridad</H2>
      <p>
        Aplicamos cifrado en tránsito (TLS 1.3) y en reposo (AES-256), aislamiento multi-tenant
        mediante Row Level Security, contraseñas con hash bcrypt y autenticación en dos factores
        opcional.
      </p>
    </LegalDoc>
  );
}
