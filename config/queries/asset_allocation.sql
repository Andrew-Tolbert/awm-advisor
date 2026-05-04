WITH data AS (
  SELECT 'Private Equity'  AS asset_class, 32.0 AS pct_of_portfolio UNION ALL
  SELECT 'High Yield',                      24.0                     UNION ALL
  SELECT 'Public Equities',                 20.0                     UNION ALL
  SELECT 'Private Credit',                  18.0                     UNION ALL
  SELECT 'ETFs',                             6.0
)
SELECT asset_class, pct_of_portfolio
FROM data
ORDER BY pct_of_portfolio DESC
