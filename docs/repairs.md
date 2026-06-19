# Repair Management Module

## Scope

The Repair module supports ticket creation, technician assignment, mobile
photo evidence, root cause and solution recording, labor cost, parts used, and
asset repair history.

## Status workflow

```text
New -> Assigned -> In Progress -> Completed -> Closed
                            \-> Waiting Parts -> In Progress
                                             \-> Completed
```

Invalid status jumps are rejected by the domain service. Completed tickets
require both Root Cause and Solution. Closed tickets are immutable.

## Atomic status history

Ticket creation and every status transition use a Firestore transaction:

1. Create or optimistic-version-check the repair ticket.
2. Write the new repair state.
3. Create a `repair` Asset Event with the before/after status.
4. Create an immutable Audit Log.

Updates that do not change status still create an Audit Log but do not add a
misleading timeline event.

## Permissions

| Role       | View                       | Create | Assign | Work     |
| ---------- | -------------------------- | ------ | ------ | -------- |
| admin      | All                        | Yes    | Yes    | All      |
| warehouse  | All                        | Yes    | No     | No       |
| sales      | All                        | Yes    | No     | No       |
| technician | Assigned tickets           | Yes    | No     | Assigned |
| branch     | Matching branch snapshot   | Yes    | No     | No       |
| customer   | Matching customer snapshot | Yes    | No     | No       |
| executive  | All                        | No     | No     | No       |

Direct Firestore writes to `repair_tickets`, `asset_events`, and `audit_logs`
are denied. Repair photos can be uploaded only by an administrator or the
assigned technician while the ticket is Assigned, In Progress, or Waiting
Parts.

## Storage

```text
repairs/{repairId}/photos/{photoId}.{extension}
```

Storage Rules validate assignment, ticket state, uploader metadata, image MIME
type, and a 10 MB per-file limit.

## Extension points

- Technician directory selector and workload balancing.
- SLA, severity, and escalation policies.
- Parts inventory reservation and warehouse deduction.
- Warranty claim classification.
- Customer approval before closing.
- Offline photo queue and resumable uploads.
- Cost analytics export to BigQuery.
