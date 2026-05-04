-- Long format: one row per client x asset_class
-- delta_pct = actual allocation minus IPS target (positive = overweight)
WITH data AS (
  SELECT 'Private Equity'  AS asset_class, 'Robert Weinstein' AS client_name,  7.0 AS delta_pct UNION ALL
  SELECT 'Private Equity',                  'Sarah Chen',                       3.0              UNION ALL
  SELECT 'Private Equity',                  'James Park',                      -2.0              UNION ALL
  SELECT 'Private Equity',                  'Linda Hoffman',                    1.0              UNION ALL
  SELECT 'Private Equity',                  'David Kim',                        5.0              UNION ALL

  SELECT 'High Yield',                      'Robert Weinstein',                -1.0              UNION ALL
  SELECT 'High Yield',                      'Sarah Chen',                       2.0              UNION ALL
  SELECT 'High Yield',                      'James Park',                       4.0              UNION ALL
  SELECT 'High Yield',                      'Linda Hoffman',                   -3.0              UNION ALL
  SELECT 'High Yield',                      'David Kim',                       -1.0              UNION ALL

  SELECT 'Public Equities',                 'Robert Weinstein',                -4.0              UNION ALL
  SELECT 'Public Equities',                 'Sarah Chen',                      -2.0              UNION ALL
  SELECT 'Public Equities',                 'James Park',                       1.0              UNION ALL
  SELECT 'Public Equities',                 'Linda Hoffman',                    2.0              UNION ALL
  SELECT 'Public Equities',                 'David Kim',                       -1.0              UNION ALL

  SELECT 'Private Credit',                  'Robert Weinstein',                 9.0              UNION ALL
  SELECT 'Private Credit',                  'Sarah Chen',                       4.0              UNION ALL
  SELECT 'Private Credit',                  'James Park',                      -1.0              UNION ALL
  SELECT 'Private Credit',                  'Linda Hoffman',                    0.0              UNION ALL
  SELECT 'Private Credit',                  'David Kim',                        3.0              UNION ALL

  SELECT 'ETFs',                            'Robert Weinstein',                -2.0              UNION ALL
  SELECT 'ETFs',                            'Sarah Chen',                      -1.0              UNION ALL
  SELECT 'ETFs',                            'James Park',                      -3.0              UNION ALL
  SELECT 'ETFs',                            'Linda Hoffman',                    1.0              UNION ALL
  SELECT 'ETFs',                            'David Kim',                       -2.0
)
SELECT asset_class, client_name, delta_pct
FROM data
