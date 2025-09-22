// app/api/debug-auth/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Next 15: cookies() es async
    const ck = await cookies();
    const present = ck.getAll().map((c) => c.name);

    // Next 15: nuestro helper es async
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Auth session missing!", cookiesPresent: present },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, user: data.user, cookiesPresent: present });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
