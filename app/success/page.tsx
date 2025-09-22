// app/success/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pago completado • TradePulse",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default function SuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sessionIdRaw = searchParams["session_id"];
  const sessionId =
    typeof sessionIdRaw === "string"
      ? sessionIdRaw
      : Array.isArray(sessionIdRaw)
      ? sessionIdRaw[0]
      : undefined;

  return (
    <main className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">¡Pago completado!</h1>
      <p className="text-slate-600 mb-6">
        Gracias por tu suscripción. En unos segundos activaremos tu acceso.
      </p>

      {sessionId ? (
        <p className="text-xs text-slate-500 mb-6">
          ID de sesión de Stripe: <code>{sessionId}</code>
        </p>
      ) : null}

      <div className="space-x-3">
        <Link
          href="/"
          className="inline-block px-4 py-2 rounded bg-black text-white"
        >
          Ir a la plataforma
        </Link>
        <Link
          href="/account"
          className="inline-block px-4 py-2 rounded border"
        >
          Ver mi cuenta
        </Link>
      </div>
    </main>
  );
}
