import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, isLocale, resolveLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/dictionaries";

describe("i18n", () => {
  it("uses Thai as the default locale", () => {
    expect(DEFAULT_LOCALE).toBe("th");
    expect(resolveLocale(undefined)).toBe("th");
    expect(resolveLocale("invalid")).toBe("th");
  });

  it("accepts only supported locales", () => {
    expect(isLocale("th")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ja")).toBe(false);
  });

  it("returns type-safe Thai and English translations", () => {
    expect(translate("th", "action.login")).toBe("เข้าสู่ระบบ");
    expect(translate("en", "action.login")).toBe("Sign in");
  });
});
