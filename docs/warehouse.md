# Warehouse Module

## Scope

The Warehouse module supports:

- Receiving an asset into a branch.
- Transferring an asset between branches.
- Selling and assigning an asset to a customer.
- Reviewing immutable movement history.

## Atomic transaction

Every warehouse command uses one Firestore transaction:

1. Read the current asset and verify its optimistic version.
2. Update the asset custody and location.
3. Create `movement_logs/{movementId}`.
4. Create `asset_events/{eventId}`.
5. Create `audit_logs/{auditId}`.

No partial result is committed.

## Domain ownership

- `WarehouseMovementService` validates movement state transitions.
- `WarehouseManagementService` performs authorization and orchestration.
- `WarehouseRepository` owns the four-record Firestore transaction.
- The existing Asset aggregate, Asset Event, Audit Log, authentication DAL, and
  CSRF boundary are reused.

## Movement types

| Type              | Effect                                                          |
| ----------------- | --------------------------------------------------------------- |
| `received`        | Custody becomes branch and customer assignment is cleared       |
| `branch_transfer` | Branch and location change                                      |
| `customer_sale`   | Custody becomes customer while source branch remains in history |

## Permissions

| Role                | Receive | Transfer | Sell | View movements       |
| ------------------- | ------- | -------- | ---- | -------------------- |
| admin               | Yes     | Yes      | Yes  | All                  |
| warehouse           | Yes     | Yes      | Yes  | All                  |
| sales               | No      | No       | Yes  | No                   |
| executive           | No      | No       | No   | All                  |
| branch              | No      | No       | No   | Involved branch only |
| technician/customer | No      | No       | No   | No                   |

All direct Firestore writes to assets, movement logs, asset events, and audit
logs remain denied.

Custody fields (`branchId`, `customerId`, and `locationName`) are read-only in
generic Asset Edit. They can change only through Warehouse commands, preventing
movement history from being bypassed.

## Mobile workflow

Each action accepts Serial Number, internal Asset ID, or Asset Code and is
suitable for keyboard, barcode, or QR scanner integration. Serial Number or QR
is recommended. Asset Code remains supported only when exactly one machine uses
that code; an ambiguous code is rejected instead of selecting an arbitrary
machine. The current asset state is shown before confirmation.
Forms use a single-column mobile layout, large touch targets, and disable repeat
submission while a transaction is pending.

## Backward compatibility

Assets created before Phase 4 may not contain `custodyType` or
`lastMovementAt`. Repository mapping infers custody from `customerId` and treats
the missing movement timestamp as null.
