// app/api/free-enroll/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // Guardar datos de perfil básicos + trial de 30 días
    const trialDays = 30;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    const update = {
      full_name: body?.full_name ?? null,
      country: body?.country ?? null,
      phone: body?.phone ?? null,
      experience: body?.experience ?? null, // "novato" | "intermedio" | "avanzado"
      marketing_consent: !!body?.marketing_consent,
      plan: "free",
      premium: true, // acceso completo durante el trial
      trial_expires_at: trialEnd.toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from("users")
      .update(update)
      .eq("id", user.id);

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("free-enroll error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
