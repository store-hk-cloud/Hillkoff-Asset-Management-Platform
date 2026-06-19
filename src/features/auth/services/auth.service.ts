"use client";

import {
  signInWithEmailAndPassword,
  signOut,
  type AuthError,
} from "firebase/auth";

import { initializeFirebaseAuth } from "@/firebase/auth";
import type { LoginInput } from "@/features/auth/schemas/auth.schema";

interface CsrfResponse {
  readonly csrfToken: string;
}

function mapAuthenticationError(error: unknown): Error {
  const authError = error as Partial<AuthError>;

  switch (authError.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    case "auth/too-many-requests":
      return new Error("มีการพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง");
    case "auth/user-disabled":
      return new Error("บัญชีนี้ถูกระงับการใช้งาน");
    default:
      return error instanceof Error
        ? error
        : new Error("ไม่สามารถเข้าสู่ระบบได้");
  }
}

export async function login(input: LoginInput): Promise<void> {
  try {
    const auth = await initializeFirebaseAuth();
    const credential = await signInWithEmailAndPassword(
      auth,
      input.email,
      input.password,
    );
    const [idToken, csrfResponse] = await Promise.all([
      credential.user.getIdToken(true),
      fetch("/api/auth/csrf", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      }),
    ]);

    if (!csrfResponse.ok) {
      throw new Error("Unable to initialize a secure session.");
    }

    const { csrfToken } = (await csrfResponse.json()) as CsrfResponse;
    const sessionResponse = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ idToken, csrfToken }),
    });

    if (!sessionResponse.ok) {
      await signOut(auth);
      const body = (await sessionResponse.json()) as {
        error?: { message?: string };
      };
      throw new Error(body.error?.message ?? "Unable to create session.");
    }
  } catch (error) {
    throw mapAuthenticationError(error);
  }
}

export async function logout(): Promise<void> {
  const auth = await initializeFirebaseAuth();

  await Promise.allSettled([
    signOut(auth),
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    }),
  ]);
}
