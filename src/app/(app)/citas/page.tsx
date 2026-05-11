import { PageHeader } from "@/components/ui/PageHeader";
import CalendarViewLazy from "@/components/agenda/CalendarViewLazy";

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Tu calendario"
        description="Arrastra una cita para moverla. Estira el borde para cambiar la duración. Pulsa Sincronizar para traer tus eventos de Google."
      />
      <CalendarViewLazy />
    </div>
  );
}
