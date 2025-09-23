// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/landing";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Solo aplicamos el middleware en la home
export const config = {
  matcher: ["/"],
};
