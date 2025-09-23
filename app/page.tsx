// app/page.tsx
import { redirect } from "next/navigation";

// opcional, pero ayuda a que no lo prerendere
export const dynamic = "force-dynamic";

export default function Home() {
  // Redirige SIEMPRE el home a la landing
  redirect("/landing");
}
