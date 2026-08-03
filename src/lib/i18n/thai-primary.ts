import type { Locale } from "@/lib/i18n/config";

/**
 * Keeps Thai as the first readable label while retaining the English term for
 * teams that use both languages in service operations.
 */
export function thaiPrimary(
  locale: Locale,
  thai: string,
  english: string,
): string {
  return locale === "th" ? thai : `${thai} / ${english}`;
}
