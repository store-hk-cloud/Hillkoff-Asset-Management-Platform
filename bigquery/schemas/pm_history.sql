CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.pm_history` (
  pm_id STRING NOT NULL,
  job_number STRING,
  asset_id STRING NOT NULL,
  asset_code STRING,
  title STRING,
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP NOT NULL,
  next_due_at TIMESTAMP,
  technician_id STRING,
  payload JSON,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(completed_at)
CLUSTER BY asset_id;
