// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import SessionSync from "@/components/SessionSync"; // sincroniza la sesión (client -> server cookies)

export const metadata: Metadata = {
  title: "TradePulse",
  description: "Señales claras, riesgo bajo control.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col page-gradient text-slate-900 dark:text-slate-100">
        {/* Header con degradado azul→teal */}
        <header className="header-bar text-white">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img src="/images/logo.png" alt="TradePulse" width={160} height={40} />
            </Link>
            <nav className="hidden sm:flex items-center gap-6 text-white/90">
              <Link href="/" className="hover:text-white">Inicio</Link>
              <Link href="/landing" className="hover:text-white">Premium</Link>
            </nav>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer con el MISMO degradado que el header */}
        <footer className="header-bar text-white">
          <div className="mx-auto max-w-7xl px-4 py-8 text-sm grid gap-4 md:grid-cols-3">
            <div>
              <div className="font-semibold">TradePulse</div>
              <div className="text-white/90">Señales claras · riesgo bajo control.</div>
            </div>
            <div className="space-y-1">
              <Link href="/aviso-legal" className="block hover:underline">Aviso legal</Link>
              <Link href="/privacidad" className="block hover:underline">Privacidad</Link>
              <Link href="/cookies" className="block hover:underline">Cookies</Link>
            </div>
            <div className="text-white/80">
              © {new Date().getFullYear()} TradePulse. No es asesoramiento financiero.
            </div>
          </div>
        </footer>

        {/* 👇 MUY IMPORTANTE: se monta al final para sincronizar sesión a cookies del server */}
        <SessionSync />
      </body>
    </html>
  );
}
