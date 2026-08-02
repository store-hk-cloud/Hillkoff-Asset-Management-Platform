import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { logger } from "@/lib/logging/logger";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import {
  createUserManagementContext,
  userManagementErrorResponse,
} from "@/lib/users/route-utils";
import { UserManagementService } from "@/services/user-management.service";

const service = new UserManagementService();
type Context = { params: Promise<{ userId: string }> };
const PASSWORD_RESET_RATE_LIMIT = { max: 20, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request, context: Context) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const rateLimit = await checkRateLimit(
    `password-reset:${session.profile.uid}`,
    PASSWORD_RESET_RATE_LIMIT,
  );
  if (!rateLimit.allowed) {
    logger.warn("Password reset rate limit exceeded", {
      actorUid: session.profile.uid,
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many password reset requests. Try again later.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      },
    );
  }

  const requestContext = createUserManagementContext(request, session.profile);
  try {
    const { userId } = await context.params;
    const user = await service.get(userId, session.profile);
    await service.sendPasswordReset(
      user.email,
      session.profile,
      requestContext,
    );
    return NextResponse.json({ success: true, data: { id: user.uid } });
  } catch (error) {
    return userManagementErrorResponse(error, requestContext.correlationId);
  }
}
