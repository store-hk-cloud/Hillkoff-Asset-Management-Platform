CREATE OR REPLACE VIEW `${PROJECT_ID}.${DATASET}.executive_dashboard` AS
WITH repair AS (
  SELECT
    COUNT(*) AS repair_count,
    SUM(total_cost) AS repair_cost
  FROM `${PROJECT_ID}.${DATASET}.repair_history`
),
pm AS (
  SELECT
    COUNT(*) AS completed_pm
  FROM `${PROJECT_ID}.${DATASET}.pm_history`
)
SELECT
  CURRENT_TIMESTAMP() AS generated_at,
  repair.repair_count,
  repair.repair_cost,
  pm.completed_pm
FROM repair
CROSS JOIN pm;
