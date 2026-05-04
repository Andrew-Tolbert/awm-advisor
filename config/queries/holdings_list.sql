WITH data AS (
  SELECT 'blackstone-pe-sc4' AS holding_id, 'Blackstone PE Strategic Capital IV' AS name, 'Private Equity'  AS asset_class, 'Strategic Capital'    AS strategy, true  AS has_alert UNION ALL
  SELECT 'ares-direct-lend',                 'Ares Capital Direct Lending II',     'Private Credit',                 'Direct Lending',               false                      UNION ALL
  SELECT 'apollo-hybrid-val',                'Apollo Global Hybrid Value',          'Private Equity',                 'Hybrid Capital',               false                      UNION ALL
  SELECT 'kkr-infra-iv',                     'KKR Infrastructure Fund IV',          'Private Equity',                 'Infrastructure',               false                      UNION ALL
  SELECT 'hca-hlt-hy',                       'HCA Healthcare 6.5% 2025',            'High Yield',                     'Healthcare Bonds',             false                      UNION ALL
  SELECT 'owl-rock-tech',                    'Owl Rock Technology Finance',         'Private Credit',                 'Tech Finance',                 false                      UNION ALL
  SELECT 'ford-motor-hy',                    'Ford Motor Credit 5.875% 2026',       'High Yield',                     'Auto Bonds',                   false                      UNION ALL
  SELECT 'aapl-eq',                          'Apple Inc.',                          'Public Equities',                'Tech Equity',                  false                      UNION ALL
  SELECT 'nvda-eq',                          'NVIDIA Corporation',                  'Public Equities',                'Semiconductor Equity',         false                      UNION ALL
  SELECT 'spy-etf',                          'SPDR S&P 500 ETF Trust',              'ETFs',                           'Broad Market',                 false
)
SELECT holding_id, name, asset_class, strategy, has_alert
FROM data
ORDER BY has_alert DESC, name ASC
