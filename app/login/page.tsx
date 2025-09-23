// app/login/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Cargando login…</div>}>
      <LoginClient />
    </Suspense>
  );
}
