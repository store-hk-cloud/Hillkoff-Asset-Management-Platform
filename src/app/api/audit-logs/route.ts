import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/dal";
import { getCorrelationId, withCorrelationId } from "@/lib/http/correlation";
import { logger } from "@/lib/logging/logger";
import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

export const dynamic = "force-dynamic";

function serialize(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null) return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => serialize(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      serialize(entry, depth + 1),
    ]),
  );
}

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request);
  const session = await getCurrentSession();

  if (!session) {
    return withCorrelationId(
      NextResponse.json({ success: false }, { status: 401 }),
      correlationId,
    );
  }

  if (
    session.profile.role !== "admin" &&
    session.profile.role !== "executive"
  ) {
    return withCorrelationId(
      NextResponse.json({ success: false }, { status: 403 }),
      correlationId,
    );
  }

  const limitValue = new URL(request.url).searchParams.get("limit") ?? "50";
  const limit = Math.min(
    Math.max(Number.parseInt(limitValue, 10) || 50, 1),
    100,
  );

  try {
    const snapshot = await getFirebaseAdminFirestore()
      .collection("audit_logs")
      .orderBy("occurredAt", "desc")
      .limit(limit)
      .get();

    const data = snapshot.docs.map((document) => {
      const raw = document.data();
      return {
        id: document.id,
        action: raw.action ?? null,
        entityType: raw.entityType ?? null,
        entityId: raw.entityId ?? null,
        actorId: raw.actorId ?? null,
        actorDisplayName: raw.actorDisplayName ?? null,
        actorRole: raw.actorRole ?? null,
        changes: serialize(raw.changes ?? {}),
        occurredAt: serialize(raw.occurredAt),
        correlationId: raw.correlationId ?? null,
        ipAddress: raw.ipAddress ?? null,
        userAgent: raw.userAgent ?? null,
      };
    });

    return withCorrelationId(
      NextResponse.json(
        { success: true, data, meta: { limit, count: data.length } },
        { headers: { "Cache-Control": "no-store" } },
      ),
      correlationId,
    );
  } catch (error) {
    logger.error("Audit log query failed", error, { correlationId });
    return withCorrelationId(
      NextResponse.json(
        {
          success: false,
          error: { code: "AUDIT_LOG_UNAVAILABLE" },
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      ),
      correlationId,
    );
  }
}
