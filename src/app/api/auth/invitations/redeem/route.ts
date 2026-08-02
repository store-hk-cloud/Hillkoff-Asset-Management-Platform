import { NextResponse } from "next/server";

import { UserManagementError } from "@/domain/errors/user-management.error";
import { redeemInvitationSchema } from "@/features/users/schemas/invitation.schema";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { logger } from "@/lib/logging/logger";
import { checkRateLimit, clientIp } from "@/lib/rate-limit/rate-limiter";
import { UserInvitationManagementService } from "@/services/user-invitation-management.service";

const service = new UserInvitationManagementService();
const REDEEM_RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const ip = clientIp(request);
  const rateLimit = await checkRateLimit(`invite-redeem:${ip}`, REDEEM_RATE_LIMIT);
  if (!rateLimit.allowed) {
    logger.warn("Invitation redemption rate limit exceeded", { ip });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many attempts. Try again later.",
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
    const { token } = redeemInvitationSchema.parse(await request.json());
    const redirectUrl = await service.redeem(token);
    return NextResponse.json(
      { success: true, data: { redirectUrl } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const managementError = error instanceof UserManagementError ? error : null;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: managementError?.code ?? "INVITATION_INVALID",
          message:
            managementError?.message ??
            "The invitation could not be processed.",
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
