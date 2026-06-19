import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthenticationError } from "@/domain/errors/authentication.error";
import {
  CSRF_COOKIE_NAME,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth/cookies";
import { csrfTokensMatch, requestHasAllowedOrigin } from "@/lib/auth/csrf";
import { AuthenticationService } from "@/services/authentication.service";

const requestSchema = z.object({
  idToken: z.string().min(1),
  csrfToken: z.string().min(1),
});

const authenticationService = new AuthenticationService();

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const cookieStore = await cookies();
    const cookieCsrfToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    if (
      !requestHasAllowedOrigin(request) ||
      !csrfTokensMatch(cookieCsrfToken, payload.csrfToken)
    ) {
      throw new AuthenticationError(
        "CSRF_VALIDATION_FAILED",
        "The request could not be verified.",
      );
    }

    const sessionCookie = await authenticationService.createSession(
      payload.idToken,
    );
    const response = NextResponse.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    response.cookies.set(
      getSessionCookieName(),
      sessionCookie,
      getSessionCookieOptions(),
    );
    response.cookies.delete(CSRF_COOKIE_NAME);
    return response;
  } catch (error) {
    const authenticationError =
      error instanceof AuthenticationError ? error : null;
    const status =
      authenticationError?.code === "CSRF_VALIDATION_FAILED" ? 403 : 401;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: authenticationError?.code ?? "INVALID_CREDENTIALS",
          message:
            authenticationError?.message ??
            "The credentials could not be verified.",
        },
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
