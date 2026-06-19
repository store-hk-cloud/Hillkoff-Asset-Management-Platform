# Installation Module

## Scope

The Installation module supports:

- Installation queue scoped to the current role.
- Scheduling an asset for a customer and assigned technician.
- Mobile installation checklist.
- Browser GPS capture.
- Installation photo uploads.
- Customer training evidence.
- Customer signature capture.
- Automatic Asset Event creation and warranty activation on completion.

## Domain flow

An asset must already be sold to the selected customer through the Warehouse
module. Scheduling creates an `installations` aggregate with a canonical
required checklist and an optimistic version.

The assigned technician or an administrator starts and completes the work.
Completion validates the original checklist, GPS, at least one photo, customer
training, signature, current asset custody, and both aggregate versions.

## Atomic completion

Successful completion uses one Firestore transaction:

1. Read and version-check the installation and asset.
2. Mark the installation completed with its evidence metadata.
3. Update the asset installation date, address, and GPS coordinates.
4. Activate the asset warranty and calculate its expiry date.
5. Create an immutable installation Asset Event.
6. Create an immutable Audit Log.

No partial database result is committed.

Uploaded files are stored before completion. A failed completion can therefore
leave unreferenced evidence files; a future scheduled cleanup function should
remove files that are not referenced after a retention period.

## Permissions

| Role       | Queue/detail access    | Schedule | Execute  |
| ---------- | ---------------------- | -------- | -------- |
| admin      | All                    | Yes      | All      |
| sales      | All                    | Yes      | No       |
| technician | Assigned installations | No       | Assigned |
| customer   | Matching customer ID   | No       | No       |
| executive  | All                    | No       | No       |

Warehouse and branch roles do not receive Installation access.

Direct client writes to Firestore `installations`, `assets`, `asset_events`,
and `audit_logs` are denied. Photos and signatures can be uploaded only by the
assigned technician or an administrator, with path, metadata, MIME type, and
size restrictions.

## Firestore indexes

Queue indexes cover:

- Active status plus schedule time.
- Active status, assigned technician, and schedule time.
- Active status, customer ID, and schedule time.

## Future extension points

- Technician availability and dispatch optimization.
- Configurable checklist templates by asset category.
- Reschedule and cancellation workflows.
- Offline evidence queue with resumable upload.
- Warranty policy versions by product and contract.
- Orphan evidence cleanup through Cloud Functions.
