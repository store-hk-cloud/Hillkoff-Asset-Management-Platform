import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { UserProfile } from "@/domain/entities/user-profile";
import { AuthenticationError } from "@/domain/errors/authentication.error";
import { AccessControlService } from "@/domain/services/access-control.service";
import type { UserRole } from "@/domain/value-objects/user-role";
import { getSessionCookieName } from "@/lib/auth/cookies";
import { verifySessionCookie } from "@/lib/auth/session";
import { LOGIN_ROUTE } from "@/lib/constants";
import { FirestoreUserRepository } from "@/repositories/firestore/firestore-user.repository";

export interface AuthenticatedSession {
  readonly profile: UserProfile;
}

const userRepository = new FirestoreUserRepository();
const accessControlService = new AccessControlService();

export const getCurrentSession = cache(
  async (): Promise<AuthenticatedSession | null> => {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(getSessionCookieName())?.value;

    if (!sessionCookie) {
      return null;
    }

    try {
      const identity = await verifySessionCookie(sessionCookie);
      const profile = await userRepository.findById(identity.uid);

      if (!profile) {
        throw new AuthenticationError(
          "PROFILE_NOT_FOUND",
          "User profile was not found.",
        );
      }

      if (profile.status !== "active") {
        throw new AuthenticationError(
          "ACCOUNT_DISABLED",
          "The account is disabled.",
        );
      }

      if (profile.role !== identity.role || profile.email !== identity.email) {
        throw new AuthenticationError(
          "ROLE_MISMATCH",
          "Authentication claims do not match the user profile.",
        );
      }

      return { profile };
    } catch {
      return null;
    }
  },
);

export async function requireSession(): Promise<AuthenticatedSession> {
  const session = await getCurrentSession();

  if (!session) {
    redirect(LOGIN_ROUTE);
  }

  return session;
}

export async function requireRole(
  allowedRoles: readonly UserRole[],
): Promise<AuthenticatedSession> {
  const session = await requireSession();
  accessControlService.requireAnyRole(session.profile.role, allowedRoles);
  return session;
}
