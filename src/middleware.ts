import type { NextRequest } from "next/server";

import { applyAuthenticationBoundary } from "@/middleware/auth.middleware";

export function middleware(request: NextRequest) {
  return applyAuthenticationBoundary(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};