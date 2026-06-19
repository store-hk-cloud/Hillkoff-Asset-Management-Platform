# Folder Structure

## `src/app`

Next.js routing, route groups, layouts, loading states, error boundaries, and
API route handlers.

## `src/components`

Reusable presentation code. `ui` is reserved for shadcn primitives, `layouts`
contains structural shells, `providers` contains client providers, and `shared`
contains cross-feature components.

## `src/features`

Business modules compose feature UI, validation, client API adapters, and
feature-local behavior while depending on application and domain contracts.
The first module is `features/assets`.

## `src/domain`

Framework-independent entities, value objects, domain events, domain errors,
repository contracts, and domain service contracts.

## `src/services`

Application service contracts and cross-feature orchestration. Domain policy
does not belong here.

## `src/repositories`

Infrastructure implementations of contracts declared in `src/domain`. Firebase
types must be mapped before leaving this boundary.

## `src/firebase`

Lazy initialization and typed access to Firebase client and admin SDKs.

## `src/middleware`

Composable request policies used by the Next.js `src/proxy.ts` entry point.

## `src/hooks`

Cross-feature React hooks. Feature-local hooks remain inside their feature.

## `src/types`

Transport, environment, and general utility types. Domain concepts must be
declared in `src/domain`, not duplicated here.

## `src/lib`

Small framework-neutral utilities, environment validation, constants, and
result primitives.

## `functions`

Independent Firebase Cloud Functions TypeScript workspace. It has its own
runtime configuration and build output.

## `bigquery`

Version-controlled schemas, migrations, and analytical queries.

## `docs`

Architecture decisions, routing, conventions, environment setup, and future
operational documentation.
