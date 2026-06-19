# Asset Management Module

## Scope

Phase 3 introduces the first business module with three top-level collections:

- `assets`
- `asset_events`
- `audit_logs`

It supports list, search, create, edit, archive, detail, timeline, repair
history, preventive-maintenance history, installation history, and document
metadata display.

## Aggregate and transaction boundary

`Asset` is the aggregate root. `AssetLifecycleService` owns create, edit, and
archive transitions. `AssetAccessService` owns role and scope policy.

Every successful mutation commits three documents in one Firestore transaction:

1. Current asset state in `assets`.
2. Immutable business history in `asset_events`.
3. Immutable security/operation record in `audit_logs`.

If uniqueness, optimistic version, or any write fails, the whole transaction is
rolled back.

## Permissions

| Role       | Read scope            | Create/Edit/Archive |
| ---------- | --------------------- | ------------------- |
| admin      | All assets            | Yes                 |
| warehouse  | All assets            | Yes                 |
| technician | All assets            | No                  |
| sales      | All assets            | No                  |
| executive  | All assets            | No                  |
| branch     | Matching `branchId`   | No                  |
| customer   | Matching `customerId` | No                  |

Direct browser writes to all three collections are denied. Mutations use
verified Next.js sessions, CSRF protection, application services, and the Admin
SDK.

## Search

The aggregate stores normalized `searchKeywords` derived from asset code, name,
category, serial number, and location. Firestore uses exact token matching with
scope/status filters and reviewed composite indexes.

This avoids loading an unbounded collection. A dedicated search platform can
replace the repository implementation later without changing domain contracts.

## Detail tabs

- Overview reads current aggregate state.
- Timeline displays all `asset_events`.
- Repair History filters `repair` events.
- PM History filters `preventive_maintenance` events.
- Installation History filters `installation` events.
- Documents displays document metadata held by the aggregate.

Repair, PM, installation, and document event types are prepared for future
modules. Phase 3 does not create repair or maintenance workflows.

Warehouse events (`warehouse_received`, `branch_transferred`, and
`customer_sold`) are appended by the Warehouse module and appear in the same
Asset Timeline.

New assets also receive an immutable Public ID with canonical QR and NFC URLs.
Existing assets require the documented identity backfill migration.

## Archive behavior

Archive is a soft lifecycle transition. Archived assets remain queryable and
retain all history, but cannot be edited. No asset/event/audit document is
physically deleted.
