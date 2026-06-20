# Localization and Theme

The presentation layer supports Thai and English without changing domain,
repository, transaction, or security behavior.

## Language

- Thai (`th`) is the default language.
- English (`en`) can be selected from the header or login page.
- The selection is stored in the `hillkoff_locale` cookie for one year.
- Server Components read the locale from the cookie.
- Client Components use the type-safe `LanguageProvider`.
- Translation keys are defined in `src/lib/i18n/dictionaries.ts`.

Business data such as asset names, customer names, notes, and audit records is
never automatically translated.

## Theme

- Light and dark themes are available from the header or login page.
- The selected theme is stored locally on the device.
- If no theme is stored, the operating-system preference is used.
- Theme variables are defined in `src/app/globals.css`.
- The theme initializer runs before hydration to avoid a light-theme flash.

## Extension rules

1. Reuse an existing translation key when the meaning is identical.
2. Add both Thai and English values for every new key.
3. Keep domain status values stable; translate only their display labels.
4. Do not place translated labels in Firestore documents or audit logs.
5. Validate mobile layout in both languages because English labels may be
   wider than Thai labels.
