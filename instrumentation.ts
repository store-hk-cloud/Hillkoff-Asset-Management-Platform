import type { InstrumentationOnRequestError } from "next/dist/server/instrumentation/types";

import { logger } from "@/lib/logging/logger";

export const onRequestError: InstrumentationOnRequestError = (
  error,
  request,
  context,
) => {
  const correlationId = request.headers["x-correlation-id"];

  logger.error("Unhandled Next.js request error", error, {
    correlationId:
      typeof correlationId === "string" ? correlationId : undefined,
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
