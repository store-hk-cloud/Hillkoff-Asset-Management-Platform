import { NextResponse } from "next/server";

import { AuthenticationError } from "@/domain/errors/authentication.error";
import { requestHasAllowedOrigin } from "@/lib/auth/csrf";
import { getCurrentSession } from "@/lib/auth/dal";
import { isAllowedProfilePhotoUrl } from "@/lib/auth/profile-photo";
import { profileUpdateSchema } from "@/features/user-profile/schemas/profile.schema";
import { FirestoreUserRepository } from "@/repositories/firestore/firestore-user.repository";

const userRepository = new FirestoreUserRepository();

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  return NextResponse.json(
    { success: true, data: session.profile },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  if (!requestHasAllowedOrigin(request)) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const update = profileUpdateSchema.parse(await request.json());

    if (!isAllowedProfilePhotoUrl(update.photoURL, session.profile.uid)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PROFILE_IMAGE",
            message: "The profile image must belong to this account.",
          },
        },
        { status: 400 },
      );
    }

    const profile = await userRepository.updateProfile(
      session.profile.uid,
      update,
    );

    return NextResponse.json(
      { success: true, data: profile },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const isVersionConflict =
      error instanceof AuthenticationError && error.code === "VERSION_CONFLICT";

    return NextResponse.json(
      {
        success: false,
        error: {
          code: isVersionConflict ? "VERSION_CONFLICT" : "INVALID_PROFILE",
          message: isVersionConflict
            ? error.message
            : "The profile could not be updated.",
        },
      },
      { status: isVersionConflict ? 409 : 400 },
    );
  }
}
