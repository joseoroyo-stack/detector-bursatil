// app/login/LoginClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Lee ?redirect=... desde window.location.search (sin useSearchParams)
 */
function getRedirectFromLocation(defaultPath = "/app") {
  try {
    if (typeof window === "undefined") return defaultPath;
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("redirect");
    return r && r.startsWith("/") ? r : defaultPath;
  } catch {
    return defaultPath;
  }
}

export default function LoginClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [redirectTo, setRedirectTo] = useState<string>("/app");

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Inicializa redirect leyendo la URL del navegador
  useEffect(() => {
    setRedirectTo(getRedirectFromLocation("/app"));
  }, []);

  // Si ya hay sesión, redirige directamente
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        router.replace(redirectTo);
      }
    })();
  }, [redirectTo, router, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) throw error;
      if (!data?.session) throw new Error("No se recibió la sesión.");

      // Empuja la sesión a cookies HttpOnly del servidor
      const res = await fetch("/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: data.session }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "No se pudo guardar la sesión.");
      }

      router.replace(redirectTo);
    } catch (e: any) {
      setErr(e?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto py-10 px-4">
      <h1 className="text-xl font-bold mb-4">Iniciar sesión</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            required
            className="w-full border rounded px-3 py-2 bg-background"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Contraseña</label>
          <input
            type="password"
            required
            className="w-full border rounded px-3 py-2 bg-background"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="********"
          />
        </div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button
          type="submit"
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60 w-full"
          disabled={loading}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
