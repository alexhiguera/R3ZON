import type { ModuloId } from "@/lib/sidebarModulos";

export type TourSlide = {
  title: string;
  body: string;
};

export const TOURS: Record<ModuloId, TourSlide[]> = {
  dashboard: [
    {
      title: "Tu cuadro de mando",
      body: "El Inicio resume KPIs, próximas citas, tareas pendientes y la actividad reciente de tu negocio en un solo vistazo.",
    },
    {
      title: "Personalízalo a tu ritmo",
      body: "Conforme uses los módulos, este panel se irá enriqueciendo con datos reales. Vuelve a él en cualquier momento desde el menú lateral.",
    },
  ],
  clientes: [
    {
      title: "Tus clientes B2B en un solo sitio",
      body: "Empresas, contactos asociados, sector, facturación anual y notas. Todo lo que necesitas para vender y dar seguimiento.",
    },
    {
      title: "Vista lista o tarjetas",
      body: "Cambia entre vista de lista compacta o tarjetas visuales. Exporta, filtra y crea nuevos clientes con un clic.",
    },
    {
      title: "Ficha 360º",
      body: "Entra en cualquier cliente para ver su organigrama, historial de citas, tareas asociadas y documentos.",
    },
  ],
  proveedores: [
    {
      title: "Gestiona tus proveedores",
      body: "Mantén un catálogo limpio de proveedores con sus contactos, condiciones y notas internas.",
    },
    {
      title: "Centralizado con el resto",
      body: "Los proveedores se cruzan con compras, gastos y documentos para tener visibilidad real del flujo.",
    },
  ],
  citas: [
    {
      title: "Tu agenda inteligente",
      body: "Calendario con vista día / semana / mes. Crea citas con clientes y recibe recordatorios automáticos.",
    },
    {
      title: "Sincroniza con Google",
      body: "En planes Pro+ puedes enlazar tu Google Calendar para que las citas viajen contigo allá donde vayas.",
    },
  ],
  tareas: [
    {
      title: "Kanban para tu equipo",
      body: "Tablero estilo Trello con columnas Pendiente / En curso / Hecho. Arrastra y suelta para mover tarjetas.",
    },
    {
      title: "Vincula tareas a clientes",
      body: "Cada tarea puede asociarse a un cliente o cita para no perder contexto.",
    },
  ],
  fichajes: [
    {
      title: "Control horario laboral",
      body: "Tu equipo ficha entrada y salida con un clic. Cumplimiento del registro horario obligatorio.",
    },
    {
      title: "Informes y exportación",
      body: "Genera informes mensuales por trabajador, listos para enviar a tu gestoría.",
    },
  ],
  listado: [
    {
      title: "Productos y servicios",
      body: "Catálogo de lo que vendes con precio, IVA, stock opcional y categorización.",
    },
    {
      title: "Conectado al TPV y documentos",
      body: "Los artículos se reutilizan en el TPV y en presupuestos/facturas. Edita una vez, se actualiza en todas partes.",
    },
  ],
  tpv: [
    {
      title: "Punto de venta para mostrador",
      body: "Caja rápida tipo TPV: añade artículos, cobra con efectivo o tarjeta y emite ticket en segundos.",
    },
    {
      title: "Cierre de caja",
      body: "Al final del día revisa el resumen de ventas, métodos de cobro y descuadres si los hay.",
    },
  ],
  documentos: [
    {
      title: "Presupuestos, facturas y albaranes",
      body: "Genera documentos profesionales con tu logo y datos fiscales. Envíalos por email directamente al cliente.",
    },
    {
      title: "OCR de tickets",
      body: "Sube una foto de un ticket y ANTARES extrae automáticamente fecha, importe e impuestos.",
    },
  ],
  finanzas: [
    {
      title: "Finanzas consolidadas",
      body: "Vista global de ingresos, gastos, márgenes y previsión de tesorería de tu negocio.",
    },
    {
      title: "Multi-cuenta y multi-moneda",
      body: "Gestiona varias cuentas bancarias, conciliación de movimientos y reportes contables.",
    },
  ],
};
