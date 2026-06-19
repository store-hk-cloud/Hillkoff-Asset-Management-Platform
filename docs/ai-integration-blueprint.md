# AI Integration Blueprint

## Objective

AI agents must execute the same application commands as human workflows. They
must never write Firestore directly or bypass domain validation, role checks,
transactions, audit logs, and asset events.

## Layers

```text
AI Client
  -> Agent Command API
    -> Command Dispatcher
      -> Application Service
        -> Domain Service
          -> Repository Transaction
            -> Event / Audit / Notification / Analytics outbox
```

## Initial commands

- `CreateRepairTicket`
- `AssignTechnician`
- `CompletePM`
- `TransferAsset`
- `SellAsset`

`POST /api/agent/commands` accepts a command envelope with an idempotency key.
Current execution requires an authenticated admin session and CSRF validation.
Future service-to-service access should use workload identity, signed tokens,
command scopes, quotas, and approval policies.

## Safety model

- Validate command-specific payloads with existing schemas.
- Authorize through existing Application Services.
- Use optimistic locking and Firestore transactions.
- Persist a `command_events` receipt.
- Require idempotency keys.
- Preserve correlation IDs across Audit Logs and Asset Events.
- Never expose Firebase Admin credentials to an agent.

## Future agent capabilities

- Read-only planning APIs separated from mutation commands.
- Human approval for high-impact commands.
- Dry-run validation and cost/impact previews.
- Tool schemas generated from command contracts.
- Fine-grained command scopes per agent identity.
- Event subscriptions for autonomous monitoring.
