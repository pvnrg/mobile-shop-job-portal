import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isPublicSite = req.nextUrl.pathname === "/";
  // Customer udhar statements, shared by link over WhatsApp — no login.
  const isPublicStatement = req.nextUrl.pathname.startsWith("/s/");

  if (isPublicSite || isPublicStatement) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|api/logo|api/site-media|_next/static|_next/image|favicon.ico|uploads).*)"],
};
