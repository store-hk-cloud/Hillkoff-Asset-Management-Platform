import "server-only";

type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  readonly correlationId?: string | undefined;
  readonly [key: string]: unknown;
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    severity: level.toUpperCase(),
    message,
    timestamp: new Date().toISOString(),
    ...context,
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
