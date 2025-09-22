// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * Helper del lado servidor para Route Handlers (Next 15):
 * - cookies() es async, así que devolvemos una PROMESA.
 * - Pasa un cookieStore estable: cookies: () => cookieStore
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}
