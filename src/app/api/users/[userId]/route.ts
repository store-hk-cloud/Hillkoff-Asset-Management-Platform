import { NextResponse } from "next/server";

import { managedUserUpdateSchema } from "@/features/users/schemas/user.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import {
  createUserManagementContext,
  userManagementErrorResponse,
} from "@/lib/users/route-utils";
import { UserManagementService } from "@/services/user-management.service";

const service = new UserManagementService();
type Context = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, context: Context) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const { userId } = await context.params;
    const user = await service.get(userId, session.profile);
    return NextResponse.json(
      { success: true, data: user },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return userManagementErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const { userId } = await context.params;
    const user = await service.update(
      userId,
      managedUserUpdateSchema.parse(await request.json()),
      createUserManagementContext(request, session.profile),
    );
    return NextResponse.json({
      success: true,
      data: { id: user.uid, version: user.version },
    });
  } catch (error) {
    return userManagementErrorResponse(error);
  }
}
