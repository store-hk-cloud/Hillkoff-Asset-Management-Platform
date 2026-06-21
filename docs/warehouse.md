# Warehouse Module

## Scope

The Warehouse module exposes three operational workflows:

- Move an asset directly between warehouses.
- Sell and assign an asset to a customer.
- Review immutable movement history.

The former external Receive workflow and two-sided branch-transfer queue are no
longer exposed. Existing `asset_transfers` documents remain read-only historical
data and are not deleted.

## Warehouse master data

New records must select one of the 13 approved warehouses:

`ENG-SPT`, `ENG`, `FAC-EXP`, `FAC-STORE`, `HK1`, `HK1-SW`, `HQ`, `MHD`,
`MKT`, `RAT`, `SME`, `Z03`, and `TDP`.

The Asset stores `warehouseId` and the derived Thai `locationName`. The legacy
`branchId` field mirrors `warehouseId` temporarily so existing access rules,
Repair/PM snapshots, and historical queries remain compatible. It is not shown
or entered in the Asset UI.

## Direct warehouse movement

Every move uses one Firestore transaction:

1. Resolve the exact Asset by Serial Number, Asset ID, QR/NFC reference, or an
   unambiguous Asset Code.
2. Validate optimistic version, lifecycle state, current custody, and that the
   destination differs from the current warehouse.
3. Update `warehouseId`, compatibility `branchId`, and `locationName`.
4. Create `movement_logs/{movementId}`.
5. Create `asset_events/{eventId}`.
6. Create `audit_logs/{auditId}`.

Stock leaves the source and enters the destination in the same atomic
transaction. There is no dispatch or destination-confirmation queue.

## Asset creation

Asset creation includes a free-text `color` field and a required warehouse
dropdown. Asset Code catalog autofill does not overwrite color or Serial Number,
because those values belong to the individual machine.

## Migration

The two approved existing Assets with Serial Numbers `0020569B` and `0020571B`
are migrated to `Z03 — คลังบ้านเช่า 2`. The migration creates an Asset Event
and Audit Log for each change.

Run a dry-run first:

```text
npm run assets:migrate-warehouses
```

Apply only after reviewing the exact two matches:

```text
APPLY_WAREHOUSE_MIGRATION=true npm run assets:migrate-warehouses
```
