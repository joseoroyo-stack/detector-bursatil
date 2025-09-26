// app/scanner/layout.tsx
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";

export const dynamic = "force-dynamic"; // evita cache, depende de sesión/DB

export default async function ScannerLayout({
  children,
}: { children: React.ReactNode }) {
  // tu helper es async → mejor esperar explícitamente al cliente
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si no está logueado, pedir login (idealmente con redirect para volver a /scanner)
  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <h1 className="text-2xl font-bold mb-2">Inicia sesión para probar 30 días</h1>
        <p className="mb-6">Con una cuenta podrás usar toda la plataforma durante 30 días.</p>
        <div className="flex gap-3">
          <Link href="/login?redirect=/scanner" className="px-4 py-2 rounded bg-black text-white">Entrar</Link>
          <Link href="/pricing" className="px-4 py-2 rounded border">Ver planes</Link>
        </div>
      </div>
    );
  }

  // Lee perfil (plan y fin de trial). Soportamos ambas columnas: trial_expires_at | trial_ends_at
  const { data: profile } = await supabase
    .from("users")
    .select("plan, premium, trial_expires_at, trial_ends_at")
    .eq("id", user.id)
    .single();

  const now = new Date();
  const rawTrialEnd =
    (profile as any)?.trial_expires_at ??
    (profile as any)?.trial_ends_at ??
    null;

  const trialActive = rawTrialEnd ? new Date(rawTrialEnd) > now : false;

  const plan = (profile?.plan ?? null) as null | "free" | "premium" | "comunidad";
  const premiumFlag = Boolean((profile as any)?.premium);
  const hasFullAccess =
    trialActive || premiumFlag || plan === "premium" || plan === "comunidad";

  // Acceso completo → muestra tu scanner original (children)
  if (hasFullAccess) return <>{children}</>;

  // Gratis tras el trial → modo básico + CTA
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-4">Acceso limitado (plan Gratis)</h1>
      <p className="mb-6">
        Tu periodo de prueba ha finalizado. Dispones de <b>Gráfico y señales básicas</b> y
        <b> Watchlist y alertas locales</b>. Para desbloquear el escáner completo, pásate a Premium.
      </p>

      {/* Aquí puedes renderizar tu vista básica (gráfico + señales) */}
      <div className="rounded border p-6 mb-8">
        <p className="opacity-70">Aquí iría tu vista básica del gráfico y señales.</p>
      </div>

      <div className="flex gap-3">
        <Link href="/pricing" className="px-4 py-2 rounded bg-black text-white">
          Hazte Premium (29€/mes)
        </Link>
        <Link href="/pricing" className="px-4 py-2 rounded border">
          Unirme a Comunidad (49€/mes)
        </Link>
      </div>
    </div>
  );
}
