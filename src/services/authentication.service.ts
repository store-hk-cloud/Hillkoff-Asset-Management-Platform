import "server-only";

import { AuthenticationError } from "@/domain/errors/authentication.error";
import { createSessionCookie, verifyIdToken } from "@/lib/auth/session";
import { FirestoreUserRepository } from "@/repositories/firestore/firestore-user.repository";

const MAX_RECENT_SIGN_IN_AGE_SECONDS = 5 * 60;

export class AuthenticationService {
  constructor(
    private readonly userRepository = new FirestoreUserRepository(),
  ) {}

  async createSession(idToken: string): Promise<string> {
    const identity = await verifyIdToken(idToken);
    const now = Math.floor(Date.now() / 1000);

    if (now - identity.authTime > MAX_RECENT_SIGN_IN_AGE_SECONDS) {
      throw new AuthenticationError(
        "INVALID_CREDENTIALS",
        "A recent sign-in is required.",
      );
    }

    const profile = await this.userRepository.findById(identity.uid);

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

    const sessionCookie = await createSessionCookie(idToken);
    await this.userRepository.recordLogin(identity.uid);
    return sessionCookie;
  }
}
