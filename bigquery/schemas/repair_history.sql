CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.repair_history` (
  repair_id STRING NOT NULL,
  ticket_number STRING,
  asset_id STRING NOT NULL,
  asset_code STRING,
  asset_name STRING,
  root_cause STRING,
  solution STRING,
  labor_cost NUMERIC,
  parts_cost NUMERIC,
  total_cost NUMERIC,
  completed_at TIMESTAMP NOT NULL,
  payload JSON,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(completed_at)
CLUSTER BY asset_id, asset_code;
