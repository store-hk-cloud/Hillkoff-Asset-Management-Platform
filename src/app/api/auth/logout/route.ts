import { NextResponse } from "next/server";

import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth/cookies";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { getCorrelationId, withCorrelationId } from "@/lib/http/correlation";
import { getFirebaseAdminAuth } from "@/firebase/admin-auth";
import { logger } from "@/lib/logging/logger";

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request);
  if (!(await isTrustedMutationRequest(request))) {
    return withCorrelationId(
      NextResponse.json({ success: false, correlationId }, { status: 403 }),
      correlationId,
    );
  }

  const session = await getCurrentSession();

  let revocationFailed = false;
  if (session) {
    try {
      await getFirebaseAdminAuth().revokeRefreshTokens(session.profile.uid);
    } catch (error) {
      revocationFailed = true;
      logger.error("Failed to revoke session on logout", error, {
        correlationId,
        uid: session.profile.uid,
      });
    }
  }

  const response = withCorrelationId(
    NextResponse.json(
      revocationFailed
        ? {
            success: false,
            error: {
              code: "SESSION_REVOCATION_FAILED",
              message: "The session could not be revoked. Please try again.",
            },
            correlationId,
          }
        : { success: true, correlationId },
      {
        status: revocationFailed ? 503 : 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    ),
    correlationId,
  );

  response.cookies.set(getSessionCookieName(), "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}
