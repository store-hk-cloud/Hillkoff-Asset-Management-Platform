import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";

export function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function csrfTokensMatch(
  cookieToken: string | undefined,
  requestToken: string,
): boolean {
  if (!cookieToken) {
    return false;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const requestBuffer = Buffer.from(requestToken);

  return (
    cookieBuffer.length === requestBuffer.length &&
    timingSafeEqual(cookieBuffer, requestBuffer)
  );
}

export function requestHasAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
