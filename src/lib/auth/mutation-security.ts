import "server-only";

import { cookies } from "next/headers";

import { CSRF_COOKIE_NAME } from "@/lib/auth/cookies";
import { csrfTokensMatch, requestHasAllowedOrigin } from "@/lib/auth/csrf";

export async function isTrustedMutationRequest(
  request: Request,
): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const requestToken = request.headers.get("x-csrf-token") ?? "";

  return (
    requestHasAllowedOrigin(request) &&
    csrfTokensMatch(cookieToken, requestToken)
  );
}
