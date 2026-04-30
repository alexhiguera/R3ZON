import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: Parameters<NonNullable<CookieMethodsServer["setAll"]>>[0]) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/_next") ||
    pathname === "/";

  // Sin sesión + ruta protegida → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Con sesión: comprobar 2FA pendiente
  if (user) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    // Si el usuario tiene MFA habilitada (nextLevel='aal2') pero la sesión es aal1
    // y no estamos ya en la pantalla 2FA → forzar verificación.
    if (
      aal?.nextLevel === "aal2" &&
      aal?.currentLevel === "aal1" &&
      !pathname.startsWith("/2fa") &&
      !pathname.startsWith("/auth")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/2fa";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
