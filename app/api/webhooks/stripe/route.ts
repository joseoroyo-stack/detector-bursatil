// app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";           // aseguramos Node runtime
export const dynamic = "force-dynamic";    // no cache

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANTE: usar la service role key en el servidor
);

export async function POST(req: Request) {
  // 1) Verificamos la firma y parseamos el raw body
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    if (!sig || !webhookSecret) throw new Error("Missing signature or secret");
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("⚠️  Webhook signature verification failed:", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      /**
       * Tras completar el checkout de suscripción.
       * Usamos client_reference_id (que enviamos desde /api/checkout) para mapear al usuario.
       */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerId = (session.customer as string) || null;
        const userId = (session.client_reference_id as string) || null;

        // En /api/checkout estamos diferenciando plan por el precio (priceId),
        // no por metadata. Si quieres guardar el plan aquí, puedes inferirlo del line_items
        // mediante expand, pero con el simple flag premium=true ya habilitamos acceso.
        if (userId && customerId) {
          await supabaseAdmin
            .from("users")
            .update({
              stripe_customer_id: customerId,
              premium: true,
              plan: "premium",       // si quieres distinguir, ajusta según priceId en /api/checkout (metadata.plan)
              trial_expires_at: null, // ya no hace falta trial si hay pago
            })
            .eq("id", userId);
        }
        break;
      }

      /**
       * Altas/actualizaciones de suscripciones.
       * Aquí solemos marcar premium=true/false y guardar el stripe_subscription_id.
       */
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status = sub.status; // active | trialing | past_due | canceled | unpaid | incomplete | incomplete_expired
        const active = ["active", "trialing", "past_due"].includes(status);

        await supabaseAdmin
          .from("users")
          .update({
            premium: active,
            stripe_subscription_id: sub.id,
            // plan: si quieres forzar aquí, puedes leer del priceId principal:
            // plan: sub.items.data[0]?.price?.id === process.env.STRIPE_PRICE_COMUNIDAD ? "comunidad" : "premium",
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      /**
       * Baja de la suscripción.
       */
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await supabaseAdmin
          .from("users")
          .update({
            premium: false,
            plan: "free",
            stripe_subscription_id: null,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      default: {
        // Opcional: loguea eventos que te interesen (invoice.payment_failed, etc.)
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: e?.message || "Webhook error" }, { status: 500 });
  }
}
