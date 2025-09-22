// app/api/profile-upsert/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req: Request) {
  const cookieStore = await nextCookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    full_name,
    country,
    phone,
    experience,
    marketing_consent,
    utm,
    planRequested,
  } = await req.json().catch(() => ({}));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase
    .from("users")
    .update({
      full_name,
      country,
      phone,
      experience,
      marketing_consent,
      utm_source: utm?.utm_source || null,
      utm_medium: utm?.utm_medium || null,
      utm_campaign: utm?.utm_campaign || null,
      utm_term: utm?.utm_term || null,
      utm_content: utm?.utm_content || null,
      plan: planRequested || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
