// app/login/page.tsx
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto py-10 px-4">Cargando…</div>}>
      <LoginClient />
    </Suspense>
  );
}
