import Link from "next/link";

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-indigo-400/15 bg-bg/60 backdrop-blur-glass">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <img
            src="/R3ZON-ANTARES-negativo.svg"
            alt="ANTARES"
            className="h-10 w-10 dark:block hidden"
          />
          <img
            src="/R3ZON-ANTARES.svg"
            alt="ANTARES"
            className="h-10 w-10 dark:hidden block"
          />
          <div>
            <div className="font-display text-base font-extrabold tracking-tight text-text-hi">
              ANTARES
            </div>
            <p className="mt-1 max-w-xs text-xs text-text-lo">
              Sistema operativo de negocio para autónomos y pequeñas empresas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div>
            <div className="section-label mb-2">Producto</div>
            <ul className="space-y-1.5">
              <li><Link href="/servicios" className="text-text-mid hover:text-text-hi">Servicios</Link></li>
              <li><Link href="/precios" className="text-text-mid hover:text-text-hi">Precios</Link></li>
              <li><Link href="/descargas" className="text-text-mid hover:text-text-hi">Descargas</Link></li>
            </ul>
          </div>
          <div>
            <div className="section-label mb-2">Cuenta</div>
            <ul className="space-y-1.5">
              <li><Link href="/login" className="text-text-mid hover:text-text-hi">Acceso</Link></li>
              <li><Link href="/registro" className="text-text-mid hover:text-text-hi">Registro</Link></li>
            </ul>
          </div>
          <div>
            <div className="section-label mb-2">Legal</div>
            <ul className="space-y-1.5">
              <li><Link href="/legal/aviso-legal" className="text-text-mid hover:text-text-hi">Aviso legal</Link></li>
              <li><Link href="/legal/privacidad" className="text-text-mid hover:text-text-hi">Privacidad</Link></li>
              <li><Link href="/legal/cookies" className="text-text-mid hover:text-text-hi">Cookies</Link></li>
              <li><Link href="/legal/terminos" className="text-text-mid hover:text-text-hi">Términos</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-indigo-400/10 px-4 py-4 text-center text-xs text-text-lo sm:px-6">
        © {year} R3ZON · Todos los derechos reservados.
      </div>
    </footer>
  );
}
