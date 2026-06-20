import { NextResponse } from "next/server";

import { getFirebaseAdminFirestore } from "@/firebase/admin-firestore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";

  if (!deep) {
    return NextResponse.json(
      {
        status: "ok",
        service: "hillkoff-asset-management-web",
        checks: { web: "ok" },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await getFirebaseAdminFirestore().collection("users").limit(1).get();
    return NextResponse.json(
      {
        status: "ok",
        service: "hillkoff-asset-management-web",
        checks: { web: "ok", firestore: "ok" },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        service: "hillkoff-asset-management-web",
        checks: { web: "ok", firestore: "unavailable" },
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
