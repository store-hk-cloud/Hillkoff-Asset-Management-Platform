import type { ZodError } from "zod";

export type FieldErrors = Readonly<Record<string, string>>;

export function getFieldErrors(error: ZodError): FieldErrors {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || fieldErrors[field]) {
      continue;
    }
    fieldErrors[field] = issue.message;
  }

  return fieldErrors;
}
