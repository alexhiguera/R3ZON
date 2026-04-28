import { Kanban } from "lucide-react";
import { Placeholder } from "@/components/ui/Placeholder";

export default function Page() {
  return (
    <Placeholder
      eyebrow="Productividad"
      title="Tareas Kanban"
      description="Tablero arrastrable con prioridades y fechas límite."
      Icon={Kanban}
    />
  );
}
