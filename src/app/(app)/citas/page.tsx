import { Calendar } from "lucide-react";
import { Placeholder } from "@/components/ui/Placeholder";

export default function Page() {
  return (
    <Placeholder
      eyebrow="Agenda"
      title="Citas"
      description="Calendario con recordatorios y estados de reserva."
      Icon={Calendar}
    />
  );
}
