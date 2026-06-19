# Engineering Conventions

## Before implementation

1. Search the repository for an existing service, type, component, and
   repository.
2. Identify the owning bounded context.
3. Present planned files and system impact for approval.
4. Implement only after approval.

## TypeScript

- Strict mode is mandatory.
- Do not use `any`.
- Parse external input at runtime.
- Do not leak Firestore document types into domain or presentation code.
- Prefer discriminated unions for stateful commands and results.

## Domain and repository rules

- Repository interfaces live in the domain layer.
- Implementations live in infrastructure.
- Domain services contain policy spanning more than one entity.
- Application services orchestrate use cases and transactions.
- UI code never owns business rules.

## UI

- Mobile-first layouts are mandatory.
- Reuse shadcn primitives before creating new shared components.
- Feature-specific components stay in their feature.
- Accessibility is part of the definition of done.

## Scalability

- Commands are designed for idempotency.
- Events are versioned.
- Async integrations must support retry and dead-letter handling.
- Operational and analytical workloads remain separated.
