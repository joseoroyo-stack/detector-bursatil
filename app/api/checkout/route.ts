// app/api/checkout/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { stripe } from "@/lib/stripe";

function getBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim();
  if (!/^https?:\/\//i.test(raw)) return `https://${raw}`;
  return raw;
}

export async function POST(req: Request) {
  try {
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

    const PRICE_PREMIUM = process.env.STRIPE_PRICE_PREMIUM!;
    const PRICE_COMUNIDAD = process.env.STRIPE_PRICE_COMUNIDAD!;
    const priceId = plan === "premium" ? PRICE_PREMIUM : PRICE_COMUNIDAD;

    if (!priceId) {
      return NextResponse.json({ error: "Price ID missing in env" }, { status: 500 });
    }

    // Cargamos perfil
    const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id || null;

    // 1) Si hay customerId guardado, comprobamos que exista en la cuenta ACTUAL de Stripe
    if (customerId) {
      try {
        const cust = await stripe.customers.retrieve(customerId);
        // Si el customer está borrado (deleted customer) lo tratamos como inexistente
        if ((cust as any)?.deleted) {
          customerId = null;
        }
      } catch (err: any) {
        // No existe en este modo (probablemente era de test y ahora estás en live)
        customerId = null;
      }
    }

    // 2) Si no tenemos customer válido, creamos uno nuevo y lo guardamos en BD
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email || undefined,
        name: profile?.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    // 3) Creamos sesión de checkout
    const siteUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId!,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/subscribe?plan=${plan}`,
      client_reference_id: user.id,
      // Opcional: manda el plan para usarlo en el webhook si quieres
      metadata: { plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
