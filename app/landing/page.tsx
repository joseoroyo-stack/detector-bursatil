"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Landing() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">Radar Bursátil</Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#beneficios" className="hover:text-black text-neutral-600">Beneficios</a>
            <a href="#como-funciona" className="hover:text-black text-neutral-600">Cómo funciona</a>
            <a href="#precios" className="hover:text-black text-neutral-600">Precios</a>
            <a href="#faq" className="hover:text-black text-neutral-600">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-sm text-neutral-600 hover:text-black">Entrar</Link>
            <Link href="/" passHref>
              <Button className="text-sm">Abrir el detector</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-4xl md:text-5xl font-bold tracking-tight"
            >
              Señales claras para invertir mejor, sin complicaciones.
            </motion.h1>
            <p className="text-neutral-600 mt-4 text-lg">
              Introduce un ticker y recibe un veredicto simple (verde / naranja / rojo),
              con entrada, stop y objetivos calculados por riesgo.
            </p>
            <div className="flex gap-3 mt-6">
              <Link href="/" passHref>
                <Button size="lg">Probar ahora</Button>
              </Link>
              <a href="#precios" className="text-sm md:text-base px-4 py-2.5 rounded-xl border bg-white hover:bg-neutral-50">
                Ver precios
              </a>
            </div>
            <p className="text-xs text-neutral-500 mt-3">Sin configuraciones raras. Sin 200 indicadores. Decisiones claras.</p>
          </div>

          {/* Mock “captura” */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white border rounded-2xl p-4 shadow-sm"
          >
            <div className="h-56 md:h-72 w-full rounded-xl bg-[linear-gradient(180deg,#f8fafc,#fff)] border flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm text-neutral-500">Vista previa</div>
                <div className="mt-2 text-xl font-semibold">Detector de entradas</div>
                <div className="mt-4 inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-600" />
                  <span className="text-sm text-neutral-700">Operación factible</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <MiniStat label="Tendencia" value="Alcista" />
              <MiniStat label="MACD" value="Positivo" />
              <MiniStat label="ATR(14)" value="0.92" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Beneficios */}
      <section id="beneficios" className="bg-white border-t">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-18">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Por qué elegirnos</h2>
          <p className="text-neutral-600 mt-2">Hecho para decidir en segundos, no para configurar durante horas.</p>

          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <Feature
              title="Análisis simplificado"
              desc="SMA, MACD, ATR y soportes/resistencias combinados en un solo veredicto."
            />
            <Feature
              title="Noticias con contexto"
              desc="Tono fundamental (positivo/mixto/negativo) para evitar sesgos y rumores."
            />
            <Feature
              title="Plan de trade listo"
              desc="Entrada, stop y objetivos por múltiplos de riesgo según tu capital."
            />
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-14 md:py-18">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Cómo funciona</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Step n={1} title="Escribe un ticker" desc="Ej. AAPL, MSFT, SAN.MC…" />
          <Step n={2} title="Analizamos por ti" desc="Técnico + noticias → semáforo claro." />
          <Step n={3} title="Actúa con confianza" desc="Plan de entrada/stop/objetivos listo." />
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="bg-white border-t">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-18">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Planes y precios</h2>
          <p className="text-neutral-600 mt-2">Empieza con lo esencial, sube cuando lo necesites.</p>

          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <PriceCard
              name="Básico"
              price="19 €/mes"
              bullets={[
                "Análisis técnico",
                "Semáforo de señales",
                "Plan de entrada/stop",
              ]}
              cta="Empezar"
            />
            <PriceCard
              name="Pro"
              price="39 €/mes"
              badge="Recomendado"
              bullets={[
                "Técnico + fundamental",
                "Comunidad privada",
                "Alertas semanales",
              ]}
              highlight
              cta="Probar Pro"
            />
            <PriceCard
              name="Premium"
              price="79 €/mes"
              bullets={[
                "Todo lo de Pro",
                "Directos mensuales",
                "Vídeos semanales exclusivos",
                "Soporte prioritario",
              ]}
              cta="Unirme"
            />
          </div>

          <p className="text-xs text-neutral-500 mt-4">
            * Precios orientativos. Puedes cambiar o cancelar cuando quieras. Descuento anual disponible.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-14 md:py-18">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Preguntas frecuentes</h2>
        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <Faq q="¿Necesito experiencia previa?" a="No. La plataforma está pensada para simplificar: semáforo y plan listos." />
          <Faq q="¿Incluye noticias reales?" a="Sí. Integramos titulares y un tono agregado. En plan Pro se priorizan fuentes." />
          <Faq q="¿Puedo operar desde aquí?" a="Integramos enlaces afiliados a brókers. Operas en tu cuenta, desde su plataforma." />
          <Faq q="¿Puedo cancelar en cualquier momento?" a="Sí. Sin permanencias. Tu acceso termina al finalizar el periodo pagado." />
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-neutral-900">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-18 text-center">
          <h3 className="text-white text-2xl md:text-3xl font-semibold">Empieza hoy a invertir con claridad.</h3>
          <p className="text-neutral-300 mt-2">Obtén tu primera señal en menos de un minuto.</p>
          <div className="mt-6">
            <Link href="/" passHref>
              <Button size="lg" className="bg-white text-black hover:bg-neutral-100">Abrir el detector</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between text-sm text-neutral-600">
          <span>© {new Date().getFullYear()} Radar Bursátil</span>
          <div className="flex items-center gap-4">
            <a href="#precios" className="hover:text-black">Precios</a>
            <a href="#faq" className="hover:text-black">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Mini componentes ---------- */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm">{n}</div>
        <div className="font-semibold">{title}</div>
      </div>
      <p className="text-neutral-600 text-sm mt-2">{desc}</p>
    </div>
  );
}

function PriceCard({
  name, price, bullets, badge, highlight, cta,
}: {
  name: string;
  price: string;
  bullets: string[];
  badge?: string;
  highlight?: boolean;
  cta: string;
}) {
  return (
    <Card className={`rounded-2xl ${highlight ? "border-black shadow-md" : ""}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{name}</CardTitle>
          {badge && (
            <span className="text-xs px-2 py-1 rounded-full bg-black text-white">{badge}</span>
          )}
        </div>
        <CardDescription className="text-xl text-black">{price}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-black" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Separator className="my-4" />
        <Link href="/" passHref>
          <Button className="w-full">{cta}</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="font-medium">{q}</div>
      <p className="text-neutral-600 text-sm mt-1">{a}</p>
    </div>
  );
}
