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
import { logger } from "@/lib/logging/logger";
import { checkRateLimit, clientIp } from "@/lib/rate-limit/rate-limiter";
import { AuthenticationService } from "@/services/authentication.service";

const LOGIN_RATE_LIMIT = { max: 20, windowMs: 15 * 60 * 1000 };

const requestSchema = z.object({
  idToken: z.string().min(1),
  csrfToken: z.string().min(1),
});

const authenticationService = new AuthenticationService();

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rateLimit = await checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT);
  if (!rateLimit.allowed) {
    logger.warn("Login rate limit exceeded", { ip });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many login attempts. Try again later.",
        },
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      },
    );
  }

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
