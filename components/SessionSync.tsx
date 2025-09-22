// components/SessionSync.tsx
"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function SessionSync() {
  useEffect(() => {
    const sb = supabaseBrowser();

    // Enviar la sesión actual al servidor en el primer render
    sb.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s) {
        fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            session: {
              access_token: s.access_token,
              refresh_token: s.refresh_token,
            },
          }),
        }).catch(() => {});
      }
    });

    // Mantener el server en sync cuando cambie el estado de auth
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      if (!s) return;
      fetch("/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          session: {
            access_token: s.access_token,
            refresh_token: s.refresh_token,
          },
        }),
      }).catch(() => {});
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
