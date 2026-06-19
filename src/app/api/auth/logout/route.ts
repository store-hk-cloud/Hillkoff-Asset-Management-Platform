import { NextResponse } from "next/server";

import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth/cookies";
import { requestHasAllowedOrigin } from "@/lib/auth/csrf";

export async function POST(request: Request) {
  if (!requestHasAllowedOrigin(request)) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const response = NextResponse.json(
    { success: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  response.cookies.set(getSessionCookieName(), "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}
