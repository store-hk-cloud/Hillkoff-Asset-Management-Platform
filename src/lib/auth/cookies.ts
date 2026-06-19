import "server-only";

import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { getServerEnvironment } from "@/lib/env";

export const CSRF_COOKIE_NAME = "hillkoff_csrf";

export function getSessionCookieName(): string {
  return getServerEnvironment().AUTH_SESSION_COOKIE_NAME;
}

export function getSessionExpiresInMilliseconds(): number {
  const days = getServerEnvironment().AUTH_SESSION_EXPIRES_IN_DAYS;
  return days * 24 * 60 * 60 * 1000;
}

export function getSessionCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionExpiresInMilliseconds() / 1000,
  };
}

export function getCsrfCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 10 * 60,
  };
}
