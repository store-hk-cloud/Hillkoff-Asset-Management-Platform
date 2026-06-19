CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.asset_events` (
  event_id STRING NOT NULL,
  asset_id STRING NOT NULL,
  event_type STRING NOT NULL,
  title STRING,
  description STRING,
  actor_id STRING,
  actor_role STRING,
  occurred_at TIMESTAMP NOT NULL,
  correlation_id STRING,
  payload JSON,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(occurred_at)
CLUSTER BY asset_id, event_type;
