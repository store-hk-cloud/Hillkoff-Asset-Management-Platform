import { NextResponse } from "next/server";

import { UserManagementError } from "@/domain/errors/user-management.error";
import { redeemInvitationSchema } from "@/features/users/schemas/invitation.schema";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import { UserInvitationManagementService } from "@/services/user-invitation-management.service";

const service = new UserInvitationManagementService();

export async function POST(request: Request) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
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
