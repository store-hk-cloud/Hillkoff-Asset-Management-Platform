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

## Branch transfer custody

Branch transfers use `asset_transfers` and require two-sided confirmation:

1. The source creates a transfer. The Asset remains in source stock but is
   locked by `activeTransferId`.
2. The source confirms dispatch. Custody becomes `in_transit`, `branchId`
   becomes null, and the Asset is not counted in any branch stock.
3. The destination scans QR/NFC, Asset ID, or Serial Number and confirms
   receipt. Only then does the destination `branchId` become active and the
   Asset enter destination stock.
4. A pending transfer can be cancelled. An in-transit transfer can be rejected
   with a reason, remains outside every branch stock while returning, and enters
   source stock only after the source confirms receipt.

Every transition writes the Asset, transfer aggregate, Asset Event, and Audit
Log atomically. The immutable branch-transfer Movement Log is created when the
destination successfully receives the Asset.

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
| `branch_transfer` | Completed after destination scan and receipt confirmation       |
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
Canonical Hillkoff branch IDs are `HK1`, `Pa-Pang`, `HQ`, `MHD`, `TD`, and
`Ratika`. Branch selection derives the Thai location name from this master data.
Branch transfers always derive the source from the current Asset. Receiving is
reserved for an external source and records its type and name.
