import "server-only";

import type { UserId } from "@/domain/value-objects/user-id";
import { getClientEnvironment } from "@/lib/env";

export function isAllowedProfilePhotoUrl(
  photoURL: string | null,
  userId: UserId,
): boolean {
  if (photoURL === null) {
    return true;
  }

  try {
    const url = new URL(photoURL);
    const expectedObjectPath = encodeURIComponent(`users/${userId}/profile/`);

    return (
      url.protocol === "https:" &&
      url.hostname === "firebasestorage.googleapis.com" &&
      url.pathname.startsWith(
        `/v0/b/${getClientEnvironment().NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${expectedObjectPath}`,
      )
    );
  } catch {
    return false;
  }
}
