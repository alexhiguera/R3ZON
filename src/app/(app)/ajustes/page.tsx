import { Settings } from "lucide-react";
import { Placeholder } from "@/components/ui/Placeholder";

export default function Page() {
  return (
    <Placeholder
      eyebrow="Configuración"
      title="Ajustes"
      description="Perfil del negocio, claves de API cifradas e integraciones."
      Icon={Settings}
    />
  );
}
