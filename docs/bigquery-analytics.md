# BigQuery Analytics Architecture

## Current mode

Firebase remains the operational and dashboard source while the platform is at
its current scale. Presentation code calls `AnalyticsManagementService`; it
never queries Firestore directly.

`ANALYTICS_PROVIDER=firebase` selects the current aggregate adapter.
`BigQueryAnalyticsRepository` is the future adapter boundary.

## Future ETL

Firestore triggers stage immutable records in `analytics_sync_queue`:

- Asset Events
- Completed Repair History
- Completed PM History
- Inventory Movements

A future BigQuery loader consumes this queue with idempotent source IDs,
streams rows into partitioned tables, and marks queue records complete.
Dead-letter records remain retryable.

## Dataset

Recommended dataset: `hillkoff_asset_analytics`, region
`asia-southeast1`.

Tables are partitioned by business event date and clustered by primary analysis
dimensions. SQL definitions are in `bigquery/schemas`.

After deploying the tables, views, loader, IAM, and monitoring, implement the
query methods in `BigQueryAnalyticsRepository` and set
`ANALYTICS_PROVIDER=bigquery`. Dashboard UI requires no changes.
