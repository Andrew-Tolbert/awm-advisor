-- @param holding_id STRING
WITH data AS (
  SELECT 'blackstone-pe-sc4' AS holding_id, 35 AS positive_pct, 30 AS neutral_pct, 35 AS negative_pct, 'More cautious tone vs Q2 — management flagged elevated leverage concerns'              AS trend_note UNION ALL
  SELECT 'ares-direct-lend',                65,                  25,                10,                 'Constructive; credit quality stable with improving spread compression'                  UNION ALL
  SELECT 'apollo-hybrid-val',               55,                  30,                15,                 'Measured optimism; hybrid portfolio performing in line with expectations'               UNION ALL
  SELECT 'kkr-infra-iv',                    70,                  22,                 8,                 'Strongly positive; infrastructure cash flows ahead of underwriting case'                UNION ALL
  SELECT 'hca-hlt-hy',                      58,                  28,                14,                 'Cautiously positive; management highlighted near-term labor cost headwinds'             UNION ALL
  SELECT 'owl-rock-tech',                   68,                  24,                 8,                 'Upbeat; tech lending pipeline robust with strong underlying credit metrics'              UNION ALL
  SELECT 'ford-motor-hy',                   45,                  35,                20,                 'Mixed; EV transition costs weighing on near-term free cash flow guidance'               UNION ALL
  SELECT 'aapl-eq',                         75,                  20,                 5,                 'Very positive; services revenue acceleration driving management confidence'              UNION ALL
  SELECT 'nvda-eq',                         82,                  13,                 5,                 'Exceptionally bullish; data center demand significantly ahead of expectations'           UNION ALL
  SELECT 'spy-etf',                         55,                  35,                10,                 'Balanced; broad market resilience with selective sector rotation noted'
)
SELECT positive_pct, neutral_pct, negative_pct, trend_note
FROM data
WHERE holding_id = :holding_id
