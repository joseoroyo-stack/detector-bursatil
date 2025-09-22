// app/pricing/page.tsx
"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function PricingPage() {
  const supabase = supabaseBrowser();
  const [loading, setLoading] = useState<null | "premium" | "comunidad">(null);
  const [error, setError] = useState<string | null>(null);
  const [isLogged, setIsLogged] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLogged(!!data.user));
  }, []);

  function goFree() {
    // Trial 30 días = acceso completo
    if (isLogged) window.location.href = "/";
    else window.location.href = "/login?redirect=/";
  }

  async function goCheckout(plan: "premium" | "comunidad") {
    // ⛔️ Si NO hay sesión, primero login y volver a /pricing
    if (!isLogged) {
      window.location.href = "/login?redirect=/pricing";
      return;
    }

    try {
      setError(null);
      setLoading(plan);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || `Error ${res.status}`);
        setLoading(null);
        return;
      }

      const j = await res.json();
      if (j.url) {
        window.location.href = j.url;
      } else {
        setError("No se recibió URL de Stripe.");
        setLoading(null);
      }
    } catch (e: any) {
      setError(e?.message || "Error inesperado");
      setLoading(null);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto py-16">
      {/* Gratis */}
      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-bold mb-2">Gratis</h2>
        <p className="mb-4">Acceso completo 30 días</p>
        <button onClick={goFree} className="px-4 py-2 rounded bg-gray-900 text-white">
          Empezar gratis
        </button>
      </div>

      {/* Premium */}
      <div className="p-6 border-2 border-green-500 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-2">Premium</h2>
        <p className="mb-4">29 € / mes</p>
        <button
         onClick={() => window.location.href = "/subscribe?plan=premium"}
         className="px-4 py-2 rounded bg-black text-white"
        >
         Suscribirme a Premium
        </button>
      </div>

      {/* Comunidad */}
      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-bold mb-2">Comunidad</h2>
        <p className="mb-4">49 € / mes</p>
       <button
         onClick={() => window.location.href = "/subscribe?plan=comunidad"}
         className="px-4 py-2 rounded bg-blue-600 text-white"
        >
         Unirme a Comunidad
        </button>
      </div>

      {error && <div className="col-span-3 text-red-600 mt-4">{error}</div>}
    </div>
  );
}
