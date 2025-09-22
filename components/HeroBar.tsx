// components/HeroBar.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HeroBar() {
  return (
    <section className="relative mb-2">
      <div className="rounded-2xl border border-white/60 bg-white/70 shadow-md backdrop-blur dark:border-white/10 dark:bg-slate-900/50">
        <div className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
              Opera con confianza, no con ruido.
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Gráfico claro, señales sencillas y riesgo bajo control. Todo en un solo lugar.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-medium dark:bg-emerald-900/40 dark:text-emerald-200">
                Enfoque práctico
              </span>
              <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-xs font-medium dark:bg-sky-900/40 dark:text-sky-200">
                Señales limpias
              </span>
              <span className="inline-flex items-center rounded-full bg-lime-100 text-lime-800 px-2 py-0.5 text-xs font-medium dark:bg-lime-900/40 dark:text-lime-200">
                Gestión del riesgo
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/landing">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Prueba Premium 30 días
              </Button>
            </Link>
            <a
              href={process.env.NEXT_PUBLIC_AFFILIATE_URL || "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="border-sky-300 bg-white/70 hover:bg-white">
                Operar ahora
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
