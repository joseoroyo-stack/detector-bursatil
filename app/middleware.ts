// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Rutas públicas que NO requieren sesión
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
    pathname.startsWith("/api") ||              // deja pasar APIs
    pathname.startsWith("/_next") ||            // assets Next
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml";

  // Si NO hay sesión y la ruta NO es pública → redirige a /landing
  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/landing";
    // opcional: si quieres recordar a dónde iba el usuario:
    // url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

// Aplica el middleware a todo excepto estáticos/imagenes/etc.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
