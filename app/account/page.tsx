// app/account/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AccountPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>("gratis");
  const [trialEnd, setTrialEnd] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) {
          router.push("/landing");
          return;
        }

        setEmail(user.email || null);

        const { data, error } = await supabase
          .from("users")
          .select("plan, premium, trial_end")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        setPlan(data?.premium ? (data?.plan || "premium") : "gratis");
        setTrialEnd(data?.trial_end || null);
      } catch (e: any) {
        console.error(e);
        setErr("Error al cargar los datos de tu cuenta");
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase, router]);

  async function openPortal() {
    try {
      setErr(null);
      setPortalLoading(true);
      const res = await fetch("/api/portal", { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j?.error || `Error ${res.status}`);
      window.location.href = j.url;
    } catch (e: any) {
      setErr(e.message);
      setPortalLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/landing");
  }

  if (loading) return <main className="max-w-xl mx-auto py-12">Cargando...</main>;

  return (
    <main className="max-w-xl mx-auto py-12 space-y-6">
      <h1 className="text-2xl font-bold">Tu cuenta</h1>

      <div className="rounded-xl border bg-white p-4 shadow dark:bg-slate-900 dark:border-slate-800 space-y-2">
        <p><b>Email:</b> {email}</p>
        <p><b>Plan actual:</b> {plan}</p>
        {trialEnd && (
          <p>
            <b>Trial hasta:</b>{" "}
            {new Date(trialEnd).toLocaleDateString("es-ES")}
          </p>
        )}
      </div>

      {plan !== "gratis" && (
        <button
          onClick={openPortal}
          disabled={portalLoading}
          className="w-full px-4 py-2 rounded bg-black text-white"
        >
          {portalLoading ? "Abriendo portal..." : "Gestionar suscripción"}
        </button>
      )}

      <button
        onClick={logout}
        className="w-full px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      >
        Cerrar sesión
      </button>

      {err && <p className="text-red-600 mt-4">{err}</p>}
    </main>
  );
}
