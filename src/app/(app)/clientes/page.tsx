import { Users } from "lucide-react";
import { Placeholder } from "@/components/ui/Placeholder";

export default function Page() {
  return (
    <Placeholder
      eyebrow="CRM"
      title="Clientes"
      description="Gestiona tu cartera, etiquetas y consentimientos RGPD."
      Icon={Users}
    />
  );
}
