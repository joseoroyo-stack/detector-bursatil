"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type FormState = {
  full_name: string;
  country: string;
  phone: string;
  experience: "novato" | "intermedio" | "avanzado" | "";
  marketing_consent: boolean;
  email: string;
  password: string;
};

type Plan = "premium" | "comunidad" | "free";

export default function SubscribeClient() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  // Estado derivado de la URL (sin useSearchParams)
  const [plan, setPlan] = useState<Plan>("premium");
  const [utm, setUtm] = useState({
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        const rawPlan = (sp.get("plan") || "premium") as Plan;
        setPlan(rawPlan);

        setUtm({
          utm_source: sp.get("utm_source") || "",
          utm_medium: sp.get("utm_medium") || "",
          utm_campaign: sp.get("utm_campaign") || "",
          utm_term: sp.get("utm_term") || "",
          utm_content: sp.get("utm_content") || "",
        });
      }
    } catch {
      /* noop */
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    full_name: "",
    country: "",
    phone: "",
    experience: "",
    marketing_consent: false,
    email: "",
    password: "",
  });

  const title =
    plan === "free" ? "Activar cuenta Gratis" :
    plan === "premium" ? "Suscripción Premium" : "Suscripción Comunidad";

  async function ensureAuth(email: string, password: string) {
    // 1) ¿ya logueado?
    const { data: sessionD } = await supabase.auth.getSession();
    if (sessionD.session) return sessionD.session;

    // 2) intentar signUp (si existe, signIn)
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpErr) {
      const code = (signUpErr as any)?.code || "";
      const msg = signUpErr.message || "";
      const already =
        code === "user_already_exists" ||
        /already registered|already exists/i.test(msg);

      if (already) {
        const { error: siErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (siErr) throw new Error("Este correo ya está registrado y la contraseña no coincide.");
      } else {
        throw signUpErr;
      }
    }

    // 3) empujar sesión a cookies HttpOnly (lado servidor)
    const { data: after } = await supabase.auth.getSession();
    if (!after.session) throw new Error("No hay sesión tras autenticación.");
    await fetch("/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({ event: "SIGNED_IN", session: after.session }),
    });

    return after.session;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      // Asegura autenticación (crea o entra)
      await ensureAuth(form.email.trim(), form.password);

      // Guardar perfil + UTM (el server necesita la cookie de sesión)
      const r1 = await fetch("/api/profile-upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          full_name: form.full_name,
          country: form.country,
          phone: form.phone,
          experience: form.experience,
          marketing_consent: form.marketing_consent,
          utm,
          planRequested: plan,
        }),
      });
      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok) throw new Error(j1?.error || "No se pudo guardar tu perfil");

      if (plan === "free") {
        // Alta gratis/trial sin Stripe
        const r = await fetch("/api/free-enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ plan, utm }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo activar Gratis");
        router.replace("/"); // entra en la app
        return;
      }

      // Checkout Stripe para premium/comunidad
      const r2 = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ plan, ...utm }),
      });
      const j2 = await r2.json().catch(() => ({}));
      if (!r2.ok || !j2?.url) throw new Error(j2?.error || "No se pudo iniciar el pago");
      window.location.href = j2.url;
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {plan === "free"
          ? "Rellena tus datos y activamos tu cuenta Gratis (con prueba completa 30 días)."
          : "Rellena tus datos. En el siguiente paso irás al pago seguro con Stripe."}
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2 bg-background"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            required
          />
        </div>
        {/* Password */}
        <div>
          <label className="block text-sm mb-1">Contraseña</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 bg-background"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            minLength={6}
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            Si el email ya está registrado, iniciaremos sesión con esta contraseña.
          </p>
        </div>

        {/* Perfil */}
        <div>
          <label className="block text-sm mb-1">Nombre completo</label>
          <input
            className="w-full border rounded px-3 py-2 bg-background"
            value={form.full_name}
            onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">País</label>
          <input
            className="w-full border rounded px-3 py-2 bg-background"
            value={form.country}
            onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Teléfono</label>
          <input
            className="w-full border rounded px-3 py-2 bg-background"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Experiencia</label>
          <select
            className="w-full border rounded px-3 py-2 bg-background"
            value={form.experience}
            onChange={(e) => setForm((s) => ({ ...s, experience: e.target.value as any }))}
          >
            <option value="">Selecciona…</option>
            <option value="novato">Novato</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.marketing_consent}
            onChange={(e) => setForm((s) => ({ ...s, marketing_consent: e.target.checked }))}
          />
          Acepto recibir novedades (opcional)
        </label>

        {err && <div className="text-sm text-rose-600">{err}</div>}

        <button
          type="submit"
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading
            ? "Procesando…"
            : plan === "free"
            ? "Activar Gratis"
            : plan === "premium"
            ? "Ir al pago Premium"
            : "Ir al pago Comunidad"}
        </button>
      </form>
    </main>
  );
}
