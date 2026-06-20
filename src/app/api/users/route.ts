import { NextResponse } from "next/server";

import { managedUserCreateSchema } from "@/features/users/schemas/user.schema";
import { getCurrentSession } from "@/lib/auth/dal";
import { isTrustedMutationRequest } from "@/lib/auth/mutation-security";
import {
  createUserManagementContext,
  userManagementErrorResponse,
} from "@/lib/users/route-utils";
import { UserManagementService } from "@/services/user-management.service";

const service = new UserManagementService();

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const users = await service.list(session.profile);
    return NextResponse.json(
      { success: true, data: users },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return userManagementErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!(await isTrustedMutationRequest(request))) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const user = await service.create(
      managedUserCreateSchema.parse(await request.json()),
      createUserManagementContext(request, session.profile),
    );
    return NextResponse.json(
      { success: true, data: { id: user.uid } },
      { status: 201 },
    );
  } catch (error) {
    return userManagementErrorResponse(error);
  }
}
