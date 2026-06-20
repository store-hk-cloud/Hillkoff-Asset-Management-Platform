# Architecture

## Style

The platform begins as a modular monolith with event-driven integration.
Business capabilities can later be extracted without changing their domain
contracts.

## Dependency direction

```text
Presentation -> Application -> Domain
Infrastructure ----------------> Domain
```

The domain layer does not import Next.js, Firebase, BigQuery, or UI code.

## Layers

- Presentation: `src/app`, `src/components`, and `src/hooks`.
- Application: `src/services` and future feature use cases.
- Domain: `src/domain`.
- Infrastructure: `src/repositories`, `src/firebase`, `functions`, and
  `bigquery`.

## Runtime boundaries

- Next.js runs the web application and route handlers on Vercel.
- Firebase provides authentication, Firestore, and object storage.
- Cloud Functions handles asynchronous and Firebase-native workloads.
- BigQuery stores analytical data, not operational transactions.

## Foundation constraints

- No business module exists in Phase 1.
- Firebase security rules deny all access until authorization policies exist.
- Direct database access must not bypass application and domain rules.
- Shared types are declared once at the narrowest valid boundary.

## Identity boundary

Firebase Authentication custom claims carry the canonical application role.
Next.js uses Firebase server session cookies, while Firestore and Storage Rules
validate Firebase ID-token claims for direct client access. Detailed behavior
is documented in [Authentication](authentication.md).

# Progressive Web App

The web application is installable on Android and iOS through a Web App
Manifest and a narrowly scoped service worker. The service worker caches only
the offline shell, icons, manifest, and immutable framework assets. Protected
pages, APIs, sessions, Firebase data, and business transactions remain
network-only. See `docs/pwa-installation.md`.
