// app/api/checkout/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { stripe } from "@/lib/stripe";

// Auxiliar: asegura que la URL base sea válida y con protocolo
function getBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_SITE_URL || "";

  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    new URL(url);
  } catch {
    // Fallback a tu dominio de Vercel (cámbialo si usas uno propio)
    url = "https://detector-bursatil-ok.vercel.app";
  }
  return url;
}

export async function POST(req: Request) {
  try {
    // ⚠️ En Next 14/15, cookies() es asíncrono para usarlo con auth-helpers
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const plan = (body?.plan || "premium") as "premium" | "comunidad";

    const PRICE_PREMIUM = process.env.STRIPE_PRICE_PREMIUM;
    const PRICE_COMUNIDAD = process.env.STRIPE_PRICE_COMUNIDAD;
    const priceId = plan === "premium" ? PRICE_PREMIUM : PRICE_COMUNIDAD;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID missing in env" },
        { status: 500 }
      );
    }

    // Obtenemos/creamos customer en Stripe
    const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email || undefined,
        name: profile?.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Guardamos el customerId en la tabla users
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const siteUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId!,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/subscribe?plan=${plan}`,
      client_reference_id: user.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
