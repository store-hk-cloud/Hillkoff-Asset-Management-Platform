import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { AuthenticationError } from "@/domain/errors/authentication.error";
import { createUserId } from "@/domain/value-objects/user-id";
import { isUserRole, type UserRole } from "@/domain/value-objects/user-role";
import { getFirebaseAdminAuth } from "@/firebase/admin-auth";
import { getSessionExpiresInMilliseconds } from "@/lib/auth/cookies";

export interface AuthenticatedIdentity {
  readonly uid: ReturnType<typeof createUserId>;
  readonly email: string;
  readonly role: UserRole;
  readonly authTime: number;
}

function mapDecodedToken(token: DecodedIdToken): AuthenticatedIdentity {
  if (!token.email || !isUserRole(token.role)) {
    throw new AuthenticationError(
      "ROLE_MISMATCH",
      "The account does not have a valid application role.",
    );
  }

  return {
    uid: createUserId(token.uid),
    email: token.email,
    role: token.role,
    authTime: token.auth_time,
  };
}

export async function verifyIdToken(
  idToken: string,
): Promise<AuthenticatedIdentity> {
  const decodedToken = await getFirebaseAdminAuth().verifyIdToken(
    idToken,
    true,
  );
  return mapDecodedToken(decodedToken);
}

export async function createSessionCookie(idToken: string): Promise<string> {
  return getFirebaseAdminAuth().createSessionCookie(idToken, {
    expiresIn: getSessionExpiresInMilliseconds(),
  });
}

export async function verifySessionCookie(
  sessionCookie: string,
  checkRevoked = true,
): Promise<AuthenticatedIdentity> {
  try {
    const decodedToken = await getFirebaseAdminAuth().verifySessionCookie(
      sessionCookie,
      checkRevoked,
    );
    return mapDecodedToken(decodedToken);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    throw new AuthenticationError(
      "SESSION_EXPIRED",
      "The session is invalid or has expired.",
      { cause: error },
    );
  }
}
