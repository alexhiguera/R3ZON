"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/** Clases base para inputs/selects/textarea — punto único de verdad. */
export const INPUT_CLS =
  "w-full rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm " +
  "text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none " +
  "focus:ring-2 focus:ring-cyan/20 disabled:cursor-not-allowed disabled:opacity-50";

const ALTURA = "h-10";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(ALTURA, INPUT_CLS, className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(ALTURA, INPUT_CLS, className)} {...rest}>
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(INPUT_CLS, "resize-none py-2", className)}
      {...rest}
    />
  );
});
