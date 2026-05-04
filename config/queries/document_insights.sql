-- Parameterized by :holding_id
-- Returns KPI delta rows; Blackstone shows distress signals, all others show healthy metrics.
WITH blackstone_rows AS (
  SELECT 'EBITDA'             AS kpi_name, '$242M' AS prior_value, '$228M' AS current_value, -5.8  AS change_pct, 'down'  AS flag, 0.0  AS covenant_value UNION ALL
  SELECT 'Covenant Headroom',               '0.7x',                '0.3x',                  -57.1,              'alert',           0.3               UNION ALL
  SELECT 'Leverage Ratio',                  '4.2x',                '4.8x',                   14.3,              'down',            0.0               UNION ALL
  SELECT 'Revenue Growth',                  '+12%',                '+7%',                   -41.7,              'down',            0.0               UNION ALL
  SELECT 'Interest Coverage',               '3.1x',                '2.4x',                  -22.6,              'alert',           0.0
),
default_rows AS (
  SELECT 'EBITDA'             AS kpi_name, '$312M' AS prior_value, '$328M' AS current_value,  5.1  AS change_pct, 'up'    AS flag, 0.0  AS covenant_value UNION ALL
  SELECT 'Leverage Ratio',                  '3.8x',                '3.6x',                   -5.3,              'up',              0.0               UNION ALL
  SELECT 'Revenue Growth',                  '+8%',                 '+11%',                   37.5,              'up',              0.0               UNION ALL
  SELECT 'Interest Coverage',               '4.2x',                '4.5x',                    7.1,              'up',              0.0               UNION ALL
  SELECT 'Net Debt/EBITDA',                 '3.2x',                '3.1x',                   -3.1,              'up',              0.0
)
SELECT kpi_name, prior_value, current_value, change_pct, flag, covenant_value
FROM blackstone_rows
WHERE :holding_id = 'blackstone-pe-sc4'
UNION ALL
SELECT kpi_name, prior_value, current_value, change_pct, flag, covenant_value
FROM default_rows
WHERE :holding_id <> 'blackstone-pe-sc4'
