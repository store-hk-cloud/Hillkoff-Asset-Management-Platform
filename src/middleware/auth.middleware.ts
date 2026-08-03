import { NextResponse, type NextRequest } from "next/server";

import {
  CORRELATION_ID_HEADER,
  createCorrelationId,
} from "@/lib/http/correlation";
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
  "/users",
  "/service-jobs",
  "/technician",
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
  const correlationId = createCorrelationId();

  if (isProtectedRoute && !hasSessionCookie) {
    const loginUrl = new URL(LOGIN_ROUTE, request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set(CORRELATION_ID_HEADER, correlationId);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CORRELATION_ID_HEADER, correlationId);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}
