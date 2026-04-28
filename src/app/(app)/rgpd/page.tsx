import { ShieldCheck } from "lucide-react";
import { Placeholder } from "@/components/ui/Placeholder";

export default function Page() {
  return (
    <Placeholder
      eyebrow="Cumplimiento"
      title="Consentimientos RGPD"
      description="Registro de consentimientos firmados con sello de tiempo."
      Icon={ShieldCheck}
    />
  );
}
