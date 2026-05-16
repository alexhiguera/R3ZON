"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// `@fullcalendar/*` pesa ~450 KB. Lo diferimos a cliente con un skeleton para
// que la navegación a /citas muestre el shell inmediatamente.
// `ssr: false` solo es válido dentro de un Client Component (Next.js 16).
const CalendarView = dynamic(() => import("./CalendarView"), {
  ssr: false,
  loading: () => (
    <div className="card-glass flex h-96 items-center justify-center text-text-lo">
      <Loader2 className="animate-spin" size={20} />
    </div>
  ),
});

export default function CalendarViewLazy() {
  return <CalendarView />;
}
