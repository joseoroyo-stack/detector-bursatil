// app/login/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams(); // <- dentro de un componente que irá envuelto en <Suspense />
  const redirectTo = sp.get("redirect") || "/app";

  const supabase = createClientComponentClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.session) throw new Error("No se recibió la sesión.");

      // Empuja la sesión a cookies HttpOnly en el servidor
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
      setErr(e?.message || "Error de acceso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold mb-4">Iniciar sesión</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm block mb-1">Email</label>
          <input
            type="email"
            required
            className="w-full rounded border px-3 py-2 bg-background"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
        </div>
        <div>
          <label className="text-sm block mb-1">Contraseña</label>
          <input
            type="password"
            required
            className="w-full rounded border px-3 py-2 bg-background"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {err && <p className="text-sm text-rose-600">{err}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          {loading ? "Accediendo…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Cargando login…</div>}>
      <LoginForm />
    </Suspense>
  );
}
