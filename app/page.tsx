// app/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import HomeClient from "./home-client";

export default async function Page() {
  const supabase = supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Si NO hay sesión → manda a la landing pública
  if (!session) {
    redirect("/landing");
  }

  // Si hay sesión → renderiza la app (client side)
  return <HomeClient />;
}
