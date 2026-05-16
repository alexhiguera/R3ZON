import { H2, LegalDoc, UL } from "@/components/legal/LegalDoc";

export const metadata = { title: "Términos y Condiciones · ANTARES" };

export default function Page() {
  return (
    <LegalDoc eyebrow="Contrato de servicio" title="Términos y Condiciones">
      <p>
        Las presentes condiciones regulan el uso de la plataforma <b>R3ZON ANTARES</b> ("el
        Servicio") y constituyen un contrato vinculante entre el usuario y R3ZON.
      </p>

      <H2>1. Aceptación</H2>
      <p>
        Al registrarse, el usuario declara haber leído, comprendido y aceptado en su totalidad estos
        términos, junto con la Política de Privacidad y la Política de Cookies.
      </p>

      <H2>2. Descripción del servicio</H2>
      <p>
        R3ZON ofrece un sistema de gestión integral en la nube para autónomos y pequeñas empresas:
        CRM, agenda, tareas, facturación e integración con servicios de terceros.
      </p>

      <H2>3. Cuenta y seguridad</H2>
      <UL>
        <li>El usuario es responsable de la confidencialidad de su contraseña.</li>
        <li>
          Debe notificar de inmediato cualquier acceso no autorizado a <b>seguridad@r3zon.app</b>.
        </li>
        <li>
          Recomendamos activar la <b>verificación en dos pasos (2FA)</b>.
        </li>
      </UL>

      <H2>4. Planes y facturación</H2>
      <UL>
        <li>El plan Free no requiere tarjeta y tiene límites de uso.</li>
        <li>
          Los planes de pago se renuevan automáticamente. El usuario puede cancelar en cualquier
          momento desde su panel.
        </li>
        <li>Las facturas incluirán IVA conforme a la normativa española vigente.</li>
      </UL>

      <H2>5. Uso aceptable</H2>
      <p>El usuario se compromete a no:</p>
      <UL>
        <li>Realizar actividades ilegales o que vulneren derechos de terceros.</li>
        <li>Cargar contenido malicioso, spam o información falsa.</li>
        <li>Realizar ingeniería inversa o intentar acceder a cuentas ajenas.</li>
        <li>Sobrecargar la infraestructura mediante automatizaciones abusivas.</li>
      </UL>

      <H2>6. Propiedad de los datos</H2>
      <p>
        Los datos introducidos por el usuario son de su exclusiva propiedad. R3ZON actúa como{" "}
        <b>encargado del tratamiento</b> y los procesa únicamente para prestar el servicio. El
        usuario puede exportar sus datos en cualquier momento.
      </p>

      <H2>7. Disponibilidad y SLA</H2>
      <p>
        R3ZON se compromete a mantener una disponibilidad del 99,5% mensual, excluyendo ventanas de
        mantenimiento programadas con 48h de antelación.
      </p>

      <H2>8. Limitación de responsabilidad</H2>
      <p>
        Salvo dolo o negligencia grave, la responsabilidad máxima de R3ZON se limita al importe
        abonado por el usuario en los 12 meses anteriores al incidente.
      </p>

      <H2>9. Resolución</H2>
      <p>
        Cualquiera de las partes puede resolver el contrato con un preaviso de 30 días. R3ZON podrá
        suspender el servicio en caso de incumplimiento grave por parte del usuario.
      </p>

      <H2>10. Ley aplicable y fuero</H2>
      <p>
        Este contrato se rige por la legislación española. Cualquier controversia se someterá a los
        Juzgados y Tribunales del domicilio del consumidor o, si éste es empresario, los del
        domicilio de R3ZON.
      </p>
    </LegalDoc>
  );
}
