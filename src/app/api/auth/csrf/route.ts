import { NextResponse } from "next/server";

import { CSRF_COOKIE_NAME, getCsrfCookieOptions } from "@/lib/auth/cookies";
import { createCsrfToken } from "@/lib/auth/csrf";

export const dynamic = "force-dynamic";

export function GET() {
  const token = createCsrfToken();
  const response = NextResponse.json(
    { csrfToken: token },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  response.cookies.set(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  return response;
}
