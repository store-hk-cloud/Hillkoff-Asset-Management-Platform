export const CORRELATION_ID_HEADER = "x-correlation-id";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createCorrelationId(): string {
  return crypto.randomUUID();
}

export function getCorrelationId(request: Request): string {
  const candidate = request.headers.get(CORRELATION_ID_HEADER);
  return candidate && UUID_PATTERN.test(candidate)
    ? candidate
    : createCorrelationId();
}

export function withCorrelationId<T extends Response>(
  response: T,
  correlationId: string,
): T {
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}
