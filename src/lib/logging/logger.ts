import "server-only";

type LogLevel = "info" | "warn" | "error";

const sensitiveKeyPattern =
  /password|token|secret|private.?key|authorization|cookie|api.?key|credential|csrf/i;

export interface LogContext {
  readonly correlationId?: string | undefined;
  readonly [key: string]: unknown;
}

function redact(value: unknown, key?: string, depth = 0): unknown {
  if (key && sensitiveKeyPattern.test(key)) {
    return "[REDACTED]";
  }

  if (depth > 6 || value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, undefined, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      redact(entryValue, entryKey, depth + 1),
    ]),
  );
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    severity: level.toUpperCase(),
    message,
    timestamp: new Date().toISOString(),
    ...((redact(context) as Record<string, unknown> | undefined) ?? {}),
  };
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
  error(message: string, error: unknown, context?: LogContext) {
    write("error", message, {
      ...context,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
  },
};
