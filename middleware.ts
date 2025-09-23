// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// Si ya lo tienes instalado, puedes dejar esto; si no, se puede quitar en este parche
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🔧 PARCHE: forzar que "/" vaya a "/landing" SIEMPRE
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/landing";
    return NextResponse.redirect(url);
  }

  // --- Si quieres mantener la protección por sesión para el resto, deja este bloque ---
  const res = NextResponse.next();
  try {
    const supabase = createMiddlewareClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    const publicPaths = [
      "/landing",
      "/login",
      "/pricing",
      "/canceled",
      "/legal",
      "/legal/aviso",
      "/legal/privacidad",
      "/legal/terminos",
      "/auth/callback",
    ];

    const isPublic =
      publicPaths.some((p) => pathname === p || pathname.startsWith(p)) ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml";

    if (!session && !isPublic) {
      const url = req.nextUrl.clone();
      url.pathname = "/landing";
      return NextResponse.redirect(url);
    }

    return res;
  } catch {
    // Si algo falla con Supabase en el middleware, al menos no rompas la navegación
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
