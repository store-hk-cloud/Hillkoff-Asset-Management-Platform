import "server-only";

import { cookies } from "next/headers";

import {
  LOCALE_COOKIE_NAME,
  resolveLocale,
  type Locale,
} from "@/lib/i18n/config";
import { translate, type TranslationKey } from "@/lib/i18n/dictionaries";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export async function getServerTranslator() {
  const locale = await getServerLocale();
  return {
    locale,
    t(key: TranslationKey) {
      return translate(locale, key);
    },
  };
}
