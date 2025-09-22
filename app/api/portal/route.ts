// app/api/portal/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// función auxiliar para asegurar que la URL es válida
function getBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_SITE_URL || "";

  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    new URL(url); // valida que sea una URL correcta
  } catch {
    // fallback al dominio de Vercel
    url = "https://detector-bursatil-ok.vercel.app";
  }

  return url;
}

export async function POST() {
  try {
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No hay cliente de Stripe asociado" },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Error inesperado" },
      { status: 500 }
    );
  }
}
