// app/auth/callback/route.ts
export const dynamic = "force-dynamic";
// (Opcional) explícito: este handler corre en Node
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * GET /auth/callback?code=...&redirect=/ruta
 * Maneja el intercambio del "code" por la sesión (OAuth / magic link).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // Por defecto, al terminar login te llevo a la plataforma:
  const rawRedirect = url.searchParams.get("redirect") || "/app";

  // Sanea el redirect: sólo permite rutas internas (empiecen por "/")
  const redirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/app";

  if (!code) {
    return NextResponse.redirect(redirect);
  }

  const cookieStore = await nextCookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // Intercambia el code por sesión y la deja en cookies HttpOnly
  await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(redirect);
}

/**
 * POST /auth/callback
 * Body: { session: { access_token, refresh_token } }
 * Útil si en algún flujo cliente quieres empujar la sesión a cookies HttpOnly.
 */
export async function POST(req: Request) {
  const cookieStore = await nextCookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const body = await req.json().catch(() => ({}));
  const access_token = body?.session?.access_token;
  const refresh_token = body?.session?.refresh_token;

  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { ok: false, error: "No session payload" },
      { status: 400 }
    );
  }

  await supabase.auth.setSession({ access_token, refresh_token });
  return NextResponse.json({ ok: true });
}
