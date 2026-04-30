import { PageHeader } from "@/components/ui/PageHeader";
import CalendarView from "@/components/agenda/CalendarView";

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Tu calendario"
        description="Arrastra una cita para moverla. Estira el borde para cambiar la duración. Pulsa Sincronizar para traer tus eventos de Google."
      />
      <CalendarView />
    </div>
  );
}
