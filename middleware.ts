// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/") {
    // ✅ Si vengo con ?ticker, NO redirijo (dejo que la home cargue el gráfico)
    if (req.nextUrl.searchParams.has("ticker")) return NextResponse.next();

    const url = req.nextUrl.clone();
    url.pathname = "/landing";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
