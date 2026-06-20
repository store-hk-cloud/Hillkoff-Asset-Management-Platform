import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import {
  createUserManagementContext,
  userManagementErrorResponse,
} from "@/lib/users/route-utils";
import { UserManagementService } from "@/services/user-management.service";

const service = new UserManagementService();
type Context = { params: Promise<{ userId: string }> };

export async function POST(request: Request, context: Context) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const { userId } = await context.params;
    const user = await service.get(userId, session.profile);
    await service.sendPasswordReset(
      user.email,
      session.profile,
      createUserManagementContext(request, session.profile),
    );
    return NextResponse.json({ success: true, data: { id: user.uid } });
  } catch (error) {
    return userManagementErrorResponse(error);
  }
}
