export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-glow">
            <span className="font-display text-xl font-extrabold text-white">R3</span>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-cyan shadow-[0_0_10px_#22d3ee]" />
          </div>
          <div className="text-center">
            <div className="font-display text-2xl font-extrabold tracking-tight">
              R3ZON
            </div>
            <div className="accent-bar mx-auto mt-1.5" style={{ width: 56 }} />
          </div>
        </div>

        <div className="card-glass overflow-hidden">
          <div className="rainbow-bar" />
          <div className="p-6 sm:p-8">{children}</div>
        </div>

        <p className="mt-6 text-center text-xs text-text-lo">
          Al continuar aceptas nuestros{" "}
          <a href="/legal/terminos" className="text-cyan hover:underline">
            Términos
          </a>{" "}
          y la{" "}
          <a href="/legal/privacidad" className="text-cyan hover:underline">
            Política de Privacidad
          </a>
          .
        </p>
      </div>
    </div>
  );
}
