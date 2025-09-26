// app/scanner/layout.tsx
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ScannerLayout({ children }: { children: React.ReactNode }) {
  // tu helper es async
  let supabase: Awaited<ReturnType<typeof supabaseServer>>;
  try {
    supabase = await supabaseServer();
  } catch {
    // si fallara algo raro con cookies/SSR => fail-open
    return <>{children}</>;
  }

  // 1) usuario
  let user = null as any;
  try {
    const res = await supabase.auth.getUser();
    user = res.data.user;
  } catch {
    // si falla auth => mostramos login
  }

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

  // 2) perfil (fail-open si hay cualquier problema)
  type Profile = { plan?: string | null; premium?: boolean | null; trial_expires_at?: string | null; trial_ends_at?: string | null };
  let profile: Profile | null = null;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("plan, premium, trial_expires_at, trial_ends_at")
      .eq("id", user.id)
      .single();

    if (error) {
      // RLS o columnas inexistentes: NO bloqueamos la app
      return <>{children}</>;
    }
    profile = data as Profile | null;
  } catch {
    return <>{children}</>; // fail-open
  }

  // 3) lógica de acceso (solo bloqueamos cuando estamos seguros)
  const now = new Date();
  const rawTrialEnd = profile?.trial_expires_at ?? profile?.trial_ends_at ?? null;
  const trialActive = rawTrialEnd ? new Date(rawTrialEnd) > now : false;
  const plan = (profile?.plan ?? "free") as "free" | "premium" | "comunidad";
  const premiumFlag = Boolean(profile?.premium);

  const hasFullAccess = trialActive || premiumFlag || plan === "premium" || plan === "comunidad";

  if (hasFullAccess) return <>{children}</>;

  // Gratis (cuando sabemos con certeza que no hay trial ni premium)
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-4">Acceso limitado (plan Gratis)</h1>
      <p className="mb-6">
        Tu periodo de prueba ha finalizado. Dispones de <b>Gráfico y señales básicas</b> y
        <b> Watchlist y alertas locales</b>. Para desbloquear el escáner completo, pásate a Premium.
      </p>

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
