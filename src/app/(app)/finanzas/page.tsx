import { Wallet } from "lucide-react";
import { Placeholder } from "@/components/ui/Placeholder";

export default function Page() {
  return (
    <Placeholder
      eyebrow="Contabilidad"
      title="Finanzas"
      description="Ingresos y gastos con cálculo automático de IVA e IRPF."
      Icon={Wallet}
    />
  );
}
