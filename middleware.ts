// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas
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

  // Proteger todo lo que no sea público
  const res = NextResponse.next();
  if (!isPublic) {
    try {
      const supabase = createMiddlewareClient({ req, res });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const url = req.nextUrl.clone();
        url.pathname = "/landing";
        return NextResponse.redirect(url);
      }
    } catch {
      // si algo falla, deja pasar en vez de romper
      return res;
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
