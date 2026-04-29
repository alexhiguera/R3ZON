"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  children?: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
};

export function Tooltip({ text, children, side = "top", className }: Props) {
  const [visible, setVisible] = useState(false);

  const posClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side];

  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 w-52 rounded-xl border border-indigo-400/25",
            "bg-[rgba(20,18,60,0.98)] px-3 py-2 text-xs leading-relaxed text-text-mid",
            "shadow-xl backdrop-blur-sm",
            posClass
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}

/** Icono de ayuda "?" con tooltip integrado — para labels de formulario */
export function Help({ text, side = "top" }: { text: string; side?: Props["side"] }) {
  return (
    <Tooltip text={text} side={side}>
      <HelpCircle
        size={13}
        className="cursor-help text-indigo-400/50 hover:text-indigo-300"
        tabIndex={0}
      />
    </Tooltip>
  );
}
