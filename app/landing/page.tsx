// app/landing/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Feature = { label: string; free?: boolean; premium?: boolean; community?: boolean };

const FEATURES: Feature[] = [
  { label: "Gráfico y señales básicas", free: true, premium: true, community: true },
  { label: "Watchlist y alertas locales", free: true, premium: true, community: true },
  { label: "Scanner Top Picks (semáforo)", premium: true, community: true },
  { label: "Scanner Máximos históricos (near ATH)", premium: true, community: true },
  { label: "Gestión de riesgo avanzada (Soporte Power –3%)", premium: true, community: true },
  { label: "Preferencias guardadas", premium: true, community: true },
  { label: "Soporte prioritario", premium: true, community: true },
  { label: "Vídeo semanal", community: true },
  { label: "Directo mensual", community: true },
];

function Tick({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">✓</span>
  ) : (
    <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-[10px]">—</span>
  );
}

export default function PremiumLanding() {
  const [qs, setQs] = useState("");
  useEffect(() => {
    try {
      setQs(typeof window !== "undefined" ? window.location.search || "" : "");
    } catch {}
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-14">

{/* === HERO === */}
<section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-slate-900 dark:to-slate-900">
  <div className="grid md:grid-cols-2">
    <div className="order-2 md:order-1 flex items-end md:items-center">
      <div className="px-6 sm:px-10 py-10 md:py-16 max-w-xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Análisis simple. Decisiones firmes.
        </h1>
        <p className="mt-4 text-slate-700 dark:text-slate-200">
          Señales claras, riesgo bajo control y un escáner que te ahorra tiempo.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={`/subscribe?plan=premium${qs}`}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-3 text-white font-semibold shadow hover:bg-emerald-700"
          >
            Unirme a Premium
          </a>
        </div>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Sin permanencia · Cancela cuando quieras
        </p>
      </div>
    </div>

    <div className="order-1 md:order-2 relative min-h-[70vh] md:min-h-[80vh]">
      <img
        src="/images/hero.jpg"
        alt="Fundador de TradePulse"
        className="absolute inset-0 h-full w-full object-cover object-[85%_30%]"
      />
      <div className="absolute inset-0 bg-black/15 md:bg-black/10" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 md:w-40 bg-gradient-to-r from-white to-transparent dark:from-slate-900" />
    </div>
  </div>
</section>

      {/* DEMO */}
      <section className="mt-12 grid gap-8 md:grid-cols-2 md:items-center">
        <div className="space-y-4 px-1">
          <h2 className="text-2xl font-bold">Así detectas oportunidades en segundos</h2>
          <p className="text-slate-600 dark:text-slate-300">
            El flujo es simple: elige ticker, mira el semáforo y calcula el tamaño con riesgo controlado.
          </p>
          <ul className="list-disc pl-5 text-slate-700 dark:text-slate-300 text-sm">
            <li>Semáforo claro (verde, naranja, rojo) según confluencias.</li>
            <li>Stop automático con <b>Soporte Power</b> (–3%).</li>
            <li>Top Picks y Near ATH para ideas rápidas.</li>
          </ul>
        </div>
        <div
          className="relative aspect-video overflow-hidden rounded-2xl border bg-slate-100"
          style={{
            backgroundImage: "url('/images/demo.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </section>

      {/* BLOQUE INSPIRACIONAL */}
      <section className="relative mt-12 overflow-hidden rounded-3xl">
        <div
          className="relative h-[320px] w-full"
          style={{
            backgroundImage: "url('/images/city.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white px-4">
            <h2 className="text-3xl font-bold">Trading global con TradePulse</h2>
            <p className="mt-2 max-w-2xl text-slate-200">
              Analiza, gestiona tu riesgo y encuentra oportunidades en EE.UU. y Europa con una interfaz clara.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="mt-12 grid gap-6 lg:grid-cols-3">
        {/* FREE */}
        <article className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <h3 className="text-xl font-bold">Gratis</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">Empieza con lo esencial.</p>
          <div className="mt-3 text-3xl font-extrabold">0€</div>
          <ul className="mt-4 space-y-2 text-sm">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-2">
                <Tick on={!!f.free} />
                <span className={!f.free ? "text-slate-400 line-through" : ""}>{f.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Link
              href={`/subscribe?plan=free${qs}`}
              className="inline-flex items-center rounded-lg border border-sky-300 bg-white px-4 py-2 text-sky-700 font-semibold shadow hover:bg-sky-50 dark:bg-slate-900 dark:text-sky-200"
            >
              Usar versión Gratis
            </Link>
          </div>
        </article>

        {/* PREMIUM */}
        <article className="relative rounded-2xl border-2 border-emerald-500 bg-white p-6 shadow-md dark:border-emerald-600 dark:bg-slate-900/70">
          <span className="absolute -top-3 left-4 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
            Recomendado
          </span>
          <h3 className="text-xl font-bold">Premium</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">Todo lo de Gratis + escáner y riesgo avanzado.</p>
          <div className="mt-3 text-3xl font-extrabold">
            29€ <span className="text-base font-semibold text-slate-500">/ mes</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-2">
                <Tick on={!!f.premium} />
                <span className={!f.premium ? "text-slate-400 line-through" : ""}>{f.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Link
              href={`/subscribe?plan=premium${qs}`}
              className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-white font-semibold shadow hover:bg-emerald-700"
            >
              Unirme a Premium
            </Link>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Si no te convence, vuelves a <b>Gratis</b> automáticamente.
          </p>
        </article>

        {/* COMUNIDAD */}
        <article className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <h3 className="text-xl font-bold">Comunidad</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">Premium + formación y acompañamiento.</p>
          <div className="mt-3 text-3xl font-extrabold">
            49€ <span className="text-base font-semibold text-slate-500">/ mes</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-2">
                <Tick on={!!f.community} />
                <span className={!f.community ? "text-slate-400 line-through" : ""}>{f.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Link
              href={`/subscribe?plan=comunidad${qs}`}
              className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-white font-semibold shadow hover:bg-sky-700"
            >
              Unirme a Comunidad
            </Link>
          </div>
        </article>
      </section>

      {/* TESTIMONIOS */}
      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          { name: "Carlos R.", role: "Swing trader", quote: "El semáforo y el riesgo con Soporte Power me dan mucha tranquilidad." },
          { name: "Marta G.", role: "Inversora particular", quote: "La prueba de 30 días me convenció. Premium es claro y útil." },
          { name: "Iván L.", role: "Day trader", quote: "El escáner me ahorra tiempo y me da ideas listas para operar." },
        ].map((t) => (
          <article key={t.name} className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-sm italic leading-relaxed">“{t.quote}”</p>
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              <b>{t.name}</b> · {t.role}
            </div>
          </article>
        ))}
      </section>

      {/* FAQ + CTA final */}
      <section className="relative mt-12 overflow-hidden rounded-3xl">
        <div
          className="relative h-[320px] w-full"
          style={{
            backgroundImage: "url('/images/london.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/65" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto max-w-5xl px-6 text-white grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-xl font-semibold">Preguntas frecuentes</h3>
                <div className="mt-3 space-y-3 text-sm text-slate-200">
                  <div><b>¿Qué incluye Gratis?</b><p>Gráfico, señales básicas, Watchlist y alertas locales.</p></div>
                  <div><b>¿Qué pasa tras 30 días?</b><p>Si no sigues en Premium, pasas a Gratis automáticamente.</p></div>
                  <div><b>¿Cómo cancelo?</b><p>Desde tu panel, sin permanencia.</p></div>
                  <div><b>¿Puedo pasar a Comunidad?</b><p>Sí, incluye vídeo semanal y directo mensual.</p></div>
                </div>
              </div>
              <div className="self-center text-center md:text-right">
                <h4 className="text-lg font-semibold">Empieza con 30 días Premium</h4>
                <div className="mt-3 flex gap-2 justify-center md:justify-end">
                  <Link
                    href={`/subscribe?plan=premium${qs}`}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-white font-semibold shadow hover:bg-emerald-700"
                  >
                    Probar ahora
                  </Link>
                </div>
                <p className="mt-2 text-xs text-slate-300">Sin permanencia · Downgrade automático a Gratis</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
