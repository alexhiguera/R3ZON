import { LegalDoc, H2 } from "@/components/legal/LegalDoc";

export const metadata = { title: "Aviso Legal · R3ZON" };

export default function Page() {
  return (
    <LegalDoc eyebrow="Información legal" title="Aviso Legal">
      <p>
        En cumplimiento de la <b>Ley 34/2002, de 11 de julio, de Servicios de la
        Sociedad de la Información y de Comercio Electrónico (LSSI-CE)</b>, se
        informa al usuario de los siguientes datos identificativos del prestador
        del servicio.
      </p>

      <H2>1. Titular del sitio web</H2>
      <ul className="ml-5 list-disc space-y-1.5">
        <li>Denominación social: [Razón social del titular]</li>
        <li>NIF/CIF: [NIF/CIF]</li>
        <li>Domicilio: [Dirección postal completa]</li>
        <li>Email de contacto: legal@r3zon.app</li>
        <li>Inscripción registral: [Datos del registro mercantil, si aplica]</li>
      </ul>

      <H2>2. Objeto</H2>
      <p>
        El presente aviso legal regula el uso del sitio web y la aplicación
        R3ZON Business OS (en adelante, "la Plataforma"), una herramienta SaaS
        destinada a la gestión integral de pequeños negocios y profesionales
        autónomos.
      </p>

      <H2>3. Condiciones de uso</H2>
      <p>
        El acceso a la Plataforma implica la aceptación plena y sin reservas de
        las disposiciones contenidas en este aviso, así como en la política de
        privacidad y los términos y condiciones aplicables.
      </p>

      <H2>4. Propiedad intelectual e industrial</H2>
      <p>
        Todos los contenidos de la Plataforma (textos, marcas, logotipos, código
        fuente, diseño gráfico) son propiedad del titular o cuentan con la
        debida licencia. Queda prohibida su reproducción, distribución o
        modificación sin autorización expresa.
      </p>

      <H2>5. Responsabilidad</H2>
      <p>
        El titular no se hace responsable de los daños o perjuicios derivados
        del uso indebido de la Plataforma, de la imposibilidad de acceso o de
        las interrupciones del servicio motivadas por causas ajenas a su
        control.
      </p>

      <H2>6. Legislación aplicable</H2>
      <p>
        El presente aviso se rige por la legislación española. Para cualquier
        controversia, las partes se someten a los juzgados y tribunales del
        domicilio del titular, salvo que la normativa vigente disponga otro
        fuero.
      </p>


    </LegalDoc>
  );
}
