# BigQuery

BigQuery is prepared as the future analytics source while Firebase remains the
active provider.

- `schemas/` contains partitioned table DDL.
- `queries/` contains the executive dashboard view baseline.
- Cloud Functions stage source changes in `analytics_sync_queue`.
- See `docs/bigquery-analytics.md` before enabling the BigQuery adapter.

This directory owns version-controlled BigQuery assets.

- `schemas/` contains table and view schemas.
- `migrations/` contains ordered, repeatable infrastructure changes.
- `queries/` contains reviewed analytical queries and validation queries.

No business dataset is defined during the foundation phase. Runtime data
ingestion will use domain events and must remain separate from operational
Firestore repositories.
