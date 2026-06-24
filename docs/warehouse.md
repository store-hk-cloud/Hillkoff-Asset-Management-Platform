# Warehouse Module

## Scope

The Warehouse module exposes three operational workflows:

- Move an asset directly between warehouses.
- Sell and assign an asset to a customer.
- Review immutable movement history.

The former external Receive workflow and two-sided branch-transfer queue have
been removed. Historical movements remain available through `movement_logs`.

## Warehouse master data

New records must select one of the 13 approved warehouses:

`ENG-SPT`, `ENG`, `FAC-EXP`, `FAC-STORE`, `HK1`, `HK1-SW`, `HQ`, `MHD`,
`MKT`, `RAT`, `SME`, `Z03`, and `TDP`.

The Asset stores `warehouseId` and the derived Thai `locationName`.

## Direct warehouse movement

Every move uses one Firestore transaction:

1. Resolve the exact Asset by Serial Number, Asset ID, QR/NFC reference, or an
   unambiguous Asset Code.
2. Validate optimistic version, lifecycle state, current custody, and that the
   destination differs from the current warehouse.
3. Update `warehouseId` and `locationName`.
4. Create `movement_logs/{movementId}`.
5. Create `asset_events/{eventId}`.
6. Create `audit_logs/{auditId}`.

Stock leaves the source and enters the destination in the same atomic
transaction. There is no dispatch or destination-confirmation queue.

## Asset creation

Asset creation includes a free-text `color` field and a required warehouse
dropdown. Asset Code catalog autofill does not overwrite color or Serial Number,
because those values belong to the individual machine.

## Production migration

The warehouse-only migration was applied to Production after a reviewed dry
run. Assets, users, catalog data, movements, and historical events no longer
contain the obsolete branch-transfer fields. The migration record is retained
in `audit_logs/warehouse-model-v2`.
