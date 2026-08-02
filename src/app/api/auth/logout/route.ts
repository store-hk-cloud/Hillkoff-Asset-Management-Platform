import { NextResponse } from "next/server";

import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth/cookies";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { getFirebaseAdminAuth } from "@/firebase/admin-auth";
import { logger } from "@/lib/logging/logger";

export async function POST(request: Request) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const session = await getCurrentSession();

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

  if (session) {
    try {
      await getFirebaseAdminAuth().revokeRefreshTokens(session.profile.uid);
    } catch (error) {
      logger.error("Failed to revoke session on logout", error, {
        uid: session.profile.uid,
      });
    }
  }

  return response;
}
