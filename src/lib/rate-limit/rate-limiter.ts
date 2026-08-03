import "server-only";

import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly retryAfterMs: number;
}

export interface RateLimitOptions {
  readonly max: number;
  readonly windowMs: number;
}

/**
 * Fixed-window rate limiter backed by Firestore, since the app has no
 * Redis/in-memory store shared across serverless instances. `key` should
 * already be scoped to the action being limited (e.g. `login:<ip>`).
 */
export async function checkRateLimit(
  key: string,
  { max, windowMs }: RateLimitOptions,
): Promise<RateLimitResult> {
  if (!key.trim() || key.length > 512) {
    throw new Error("Rate-limit key must be between 1 and 512 characters.");
  }
  if (
    !Number.isInteger(max) ||
    max < 1 ||
    !Number.isInteger(windowMs) ||
    windowMs < 1
  ) {
    throw new Error("Rate-limit options are invalid.");
  }

  const documentId = createHash("sha256").update(key).digest("hex");
  const ref = getFirebaseAdminFirestore()
    .collection("rate_limits")
    .doc(documentId);
  const now = Date.now();

  return getFirebaseAdminFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    const windowStart = (
      data?.windowStart as Timestamp | undefined
    )?.toMillis();
    const count = typeof data?.count === "number" ? data.count : 0;

    const windowExpired = !windowStart || now - windowStart >= windowMs;

    if (windowExpired) {
      transaction.set(ref, {
        count: 1,
        windowStart: Timestamp.fromMillis(now),
        expiresAt: Timestamp.fromMillis(now + windowMs),
      });
      return { allowed: true, retryAfterMs: 0 };
    }

    if (count >= max) {
      return { allowed: false, retryAfterMs: windowStart + windowMs - now };
    }

    transaction.update(ref, { count: count + 1 });
    return { allowed: true, retryAfterMs: 0 };
  });
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip")?.trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
