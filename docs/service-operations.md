# Service Operations

The Service Operations module is the canonical operational queue for repair,
installation, and new-machine testing from intake through technician
execution, assessment, billing, handoff, and customer feedback.

The legacy repair and installation detail/API modules remain read-compatible
for historical records and the migration backfill, but their duplicate queue
and create entry points redirect to Service Operations. Preventive maintenance
remains a separate module because its recurring schedule and history model are
not yet represented in the service-job aggregate. Inventory and warehouse
modules remain the source of truth for parts, stock, and movements; service
jobs consume parts through that controlled interface.

## Lifecycle

`draft → received → scheduled → assigned → in_progress → assessment_pending → approved → completed → invoiced → handed_off → closed`

Waiting and cancellation states are explicit. Every irreversible command uses
an expected aggregate version and an idempotency key; a retry returns the
original result instead of issuing duplicate documents or inventory movements.

## Operating controls

- Access is enforced server-side by role, warehouse/branch scope, customer
  scope, and technician assignment. Firestore client access to service-job
  documents is denied; API routes use the management service.
- Money is stored as integer satang. Assessment lines and issued billing
  documents retain immutable customer, asset, pricing-policy, tax, and
  withholding snapshots.
- Evidence and signatures are stored under job-bound Storage paths with owner,
  MIME, size, and path validation. Irreversible field actions remain online-only;
  IndexedDB stores only reversible drafts with the server version.
- Correlation IDs are returned from API responses and structured errors are
  logged without customer, GPS, tax, or signature payloads.

## Release checklist

1. Deploy Firestore rules and indexes before enabling the dashboard.
2. Deploy Cloud Functions so completion, assignment, analytics, and retryable
   notification triggers are active.
3. Run `npm run service-jobs:backfill` and review the dry-run reconciliation.
4. Apply the migration only after a release owner approves the checkpoint and
   source-to-target mapping: `node scripts/backfill-service-jobs.mjs --apply`.
5. Verify a test intake, technician assignment, assessment, billing document,
   handoff, print view, and one-use feedback token in the target environment.

The backfill is deterministic and preserves `legacySource`/`legacyId`; it does
not overwrite an existing `service_jobs/{workType}_{legacyId}` document.
