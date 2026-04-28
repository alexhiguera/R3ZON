import { ScanLine } from "lucide-react";
import { Placeholder } from "@/components/ui/Placeholder";

export default function Page() {
  return (
    <Placeholder
      eyebrow="Captura"
      title="Escanear ticket"
      description="OCR 100% en el dispositivo con Tesseract.js — coste servidor 0€."
      Icon={ScanLine}
    />
  );
}
