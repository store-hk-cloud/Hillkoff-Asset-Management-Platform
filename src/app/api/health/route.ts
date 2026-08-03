import { NextResponse } from "next/server";

import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";
import { getCorrelationId, withCorrelationId } from "@/lib/http/correlation";
import { logger } from "@/lib/logging/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request);
  const deep = new URL(request.url).searchParams.get("deep") === "1";

  if (!deep) {
    return withCorrelationId(
      NextResponse.json(
        {
          status: "ok",
          service: "hillkoff-asset-management-web",
          checks: { web: "ok" },
          correlationId,
        },
        { headers: { "Cache-Control": "no-store" } },
      ),
      correlationId,
    );
  }

  try {
    await getFirebaseAdminFirestore().collection("users").limit(1).get();
    return withCorrelationId(
      NextResponse.json(
        {
          status: "ok",
          service: "hillkoff-asset-management-web",
          checks: { web: "ok", firestore: "ok" },
          correlationId,
        },
        { headers: { "Cache-Control": "no-store" } },
      ),
      correlationId,
    );
  } catch (error) {
    logger.error("Health check failed", error, { correlationId });
    return withCorrelationId(
      NextResponse.json(
        {
          status: "degraded",
          service: "hillkoff-asset-management-web",
          checks: { web: "ok", firestore: "unavailable" },
          correlationId,
        },
        {
          status: 503,
          headers: { "Cache-Control": "no-store" },
        },
      ),
      correlationId,
    );
  }
}
