import type { NextRequest, NextResponse } from "next/server";

export type MiddlewareHandler = (
  request: NextRequest,
) => NextResponse | Promise<NextResponse>;
