CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.inventory_movements` (
  movement_id STRING NOT NULL,
  movement_number STRING,
  movement_type STRING NOT NULL,
  part_id STRING NOT NULL,
  part_number STRING,
  quantity NUMERIC,
  quantity_before NUMERIC,
  quantity_after NUMERIC,
  unit_cost NUMERIC,
  reference_type STRING,
  reference_id STRING,
  occurred_at TIMESTAMP NOT NULL,
  payload JSON,
  synced_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(occurred_at)
CLUSTER BY part_id, part_number, movement_type;
