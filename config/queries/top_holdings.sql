WITH data AS (
  SELECT 'blackstone-pe-sc4'   AS holding_id, 'Blackstone PE Strategic Capital IV' AS name, 'Private Equity'  AS asset_class, 187.4 AS aum_millions, 7.8  AS pct_of_portfolio,  9.2 AS ytd_return, 'alert' AS risk_flag UNION ALL
  SELECT 'ares-direct-lend',                   'Ares Capital Direct Lending II',     'Private Credit',                   163.2,                  6.8,                  7.1,             'none'                            UNION ALL
  SELECT 'apollo-hybrid-val',                  'Apollo Global Hybrid Value',          'Private Equity',                   151.8,                  6.3,                 11.4,             'none'                            UNION ALL
  SELECT 'kkr-infra-iv',                       'KKR Infrastructure Fund IV',          'Private Equity',                   138.5,                  5.8,                  8.7,             'none'                            UNION ALL
  SELECT 'hca-hlt-hy',                         'HCA Healthcare 6.5% 2025',            'High Yield',                       124.0,                  5.2,                  6.3,             'watch'                           UNION ALL
  SELECT 'owl-rock-tech',                      'Owl Rock Technology Finance',         'Private Credit',                   118.7,                  4.9,                  7.8,             'none'                            UNION ALL
  SELECT 'ford-motor-hy',                      'Ford Motor Credit 5.875% 2026',       'High Yield',                       112.3,                  4.7,                  5.9,             'none'                            UNION ALL
  SELECT 'aapl-eq',                            'Apple Inc.',                          'Public Equities',                  108.6,                  4.5,                 18.4,             'none'                            UNION ALL
  SELECT 'nvda-eq',                            'NVIDIA Corporation',                  'Public Equities',                   97.2,                  4.0,                 42.1,             'none'                            UNION ALL
  SELECT 'spy-etf',                            'SPDR S&P 500 ETF Trust',              'ETFs',                             88.4,                  3.7,                 14.2,             'none'
)
SELECT holding_id, name, asset_class, aum_millions, pct_of_portfolio, ytd_return, risk_flag
FROM data
ORDER BY aum_millions DESC
