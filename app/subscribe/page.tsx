// app/subscribe/page.tsx
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import SubscribeClient from "./SubscribeClient";

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-10">Cargando…</div>}>
      <SubscribeClient />
    </Suspense>
  );
}
