// app/success/page.tsx
"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function Success() {
  const sp = useSearchParams();
  const plan = sp.get("plan"); // "premium" | "comunidad" | null

  useEffect(() => {
    // Redirige a HOME tras 1.5s
    const t = setTimeout(() => {
      window.location.href = "/";
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="max-w-lg mx-auto py-16 text-center">
      <h1 className="text-2xl font-semibold">¡Pago completado!</h1>
      <p className="mt-2">
        {plan === "comunidad"
          ? "Has desbloqueado toda la plataforma + Comunidad (vídeo semanal y directo mensual)."
          : "Has desbloqueado toda la plataforma (plan Premium)."}
      </p>
      <p className="mt-4 opacity-70">Te llevamos a la página principal…</p>
      <a href="/" className="inline-block mt-6 px-4 py-2 rounded bg-black text-white">
        Ir ahora
      </a>
    </main>
  );
}
