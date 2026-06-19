# Preventive Maintenance Module

## Scope

The PM module supports scheduling, a monthly calendar, technician completion,
and completed PM history.

## Aggregate

Each `pm_jobs` document stores:

- Asset and custody scope snapshots.
- Scheduled date and assigned technician.
- A canonical required checklist.
- Completion notes.
- Optional recurrence interval in months.
- Calculated next due date.
- Optimistic version and audit metadata.

The recurrence boundary prepares future automatic job generation. Phase 8
calculates `nextDueAt` but does not create the next job automatically.

## Completion transaction

Successful PM completion uses one Firestore transaction:

1. Read and optimistic-version-check the PM job.
2. Reconcile the submitted checklist against the original required checklist.
3. Mark the job completed and calculate `nextDueAt`.
4. Create a `preventive_maintenance` Asset Event.
5. Create an immutable Audit Log.

## Permissions

| Role       | View                       | Schedule | Complete |
| ---------- | -------------------------- | -------- | -------- |
| admin      | All                        | Yes      | All      |
| warehouse  | All                        | Yes      | No       |
| technician | Assigned jobs              | No       | Assigned |
| branch     | Matching branch snapshot   | No       | No       |
| customer   | Matching customer snapshot | No       | No       |
| executive  | All                        | No       | No       |

Direct client writes to `pm_jobs`, `asset_events`, and `audit_logs` are denied.

## Extension points

- Automatic next-job generation using Cloud Functions.
- PM templates by asset category/model.
- Notifications and overdue escalation.
- Offline technician checklist.
- Meter-based maintenance.
- BigQuery PM compliance and downtime analytics.
