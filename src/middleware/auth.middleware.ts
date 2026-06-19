import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_ROUTE } from "@/lib/constants";

const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/profile",
  "/assets",
  "/warehouse",
  "/installations",
  "/repairs",
  "/pm",
  "/inventory",
  "/notifications",
] as const;

export function applyAuthenticationBoundary(request: NextRequest) {
  const sessionCookieName =
    process.env.AUTH_SESSION_COOKIE_NAME ?? "hillkoff_session";
  const hasSessionCookie = Boolean(
    request.cookies.get(sessionCookieName)?.value,
  );
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtectedRoute && !hasSessionCookie) {
    const loginUrl = new URL(LOGIN_ROUTE, request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}
