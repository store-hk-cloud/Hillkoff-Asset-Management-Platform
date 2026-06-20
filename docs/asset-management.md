# Asset Management Module

## Scope

The module uses these primary collections:

- `assets`
- `asset_events`
- `audit_logs`
- `asset_catalog`
- `asset_serials`

It supports list, search, create, edit, archive, detail, timeline, repair
history, preventive-maintenance history, installation history, and document
metadata display.

## Aggregate and transaction boundary

`Asset` is the aggregate root. `AssetLifecycleService` owns create, edit, and
archive transitions. `AssetAccessService` owns role and scope policy.

Every successful mutation commits the aggregate, event, audit record, product
master, and serial registry in one Firestore transaction.

1. Current asset state in `assets`.
2. Immutable business history in `asset_events`.
3. Immutable security/operation record in `audit_logs`.

`assetCode` identifies a product/model and may be shared by many physical
machines. `serialNumber`, internal Asset ID, and Public ID identify one physical
machine. New and edited machines require a serial number.

`asset_serials/{normalizedSerial}` enforces serial uniqueness without relying
on a race-prone query. A query check remains as a compatibility guard for
records created before the registry existed. If uniqueness, optimistic version,
or any write fails, the whole transaction is rolled back.

## Asset catalog and create form

`asset_catalog/{assetCode}` stores reusable name, category, description,
default branch, and default location values. Entering an existing Asset Code in
the create form fills those fields automatically. Serial Number is deliberately
never copied and must be entered for each machine.

The catalog and serial registry are server-only collections. Browser access is
denied by Firestore Rules.

Categories use the stable keys `coffee_machine`, `grinder`, `blender`,
`milling_machine`, `roaster`, and `other`. The `other` key retains a custom
display name. Asset list category cards use Firestore aggregate counts rather
than counting only the currently displayed page.

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

The aggregate stores normalized `searchKeywords` and `searchPrefixes` derived
from asset code, name, category, serial number, and location. Firestore uses
prefix matching for search suggestions and the asset list.
Search retains scope/status filters and uses reviewed composite indexes.

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

Existing asset catalog and serial registry data can be inspected safely with:

```bash
npm run assets:backfill-catalog
```

The command is a dry run by default. Review missing and duplicate serials, then
apply with `APPLY_ASSET_CATALOG_MIGRATION=true`.

## Archive behavior

Archive is a soft lifecycle transition. Archived assets remain queryable and
retain all history, but cannot be edited. No asset/event/audit document is
physically deleted.
