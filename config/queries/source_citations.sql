-- @param holding_id STRING
WITH data AS (
  SELECT 'blackstone-pe-sc4' AS holding_id, 1 AS seq, '10-K 2025 — p.47'                  AS label, '"...covenant headroom has compressed from 0.7x to 0.3x as of Q3 2025, approaching the minimum threshold of 1.0x..."'                              AS snippet UNION ALL
  SELECT 'blackstone-pe-sc4',               2,         'Q3 Earnings — p.12',                          '"...management acknowledges elevated leverage, with interest coverage declining to 2.4x against a covenant floor of 2.0x..."'                       UNION ALL

  SELECT 'ares-direct-lend',                1,         'Annual Report 2025 — p.14',                   '"...non-accrual rate remains at 0.8% of fair value, reflecting disciplined underwriting and active portfolio management..."'                         UNION ALL
  SELECT 'ares-direct-lend',                2,         'Q3 Supplement — p.6',                          '"...weighted average yield on debt investments of 11.4%, with 98.2% of the portfolio in floating rate instruments..."'                              UNION ALL

  SELECT 'apollo-hybrid-val',               1,         'Investor Letter Q3 2025 — p.3',                '"...hybrid capital strategy continues to deliver uncorrelated returns, with 72% of the portfolio generating current income..."'                      UNION ALL
  SELECT 'apollo-hybrid-val',               2,         'Q3 Update — p.9',                              '"...net asset value per unit increased 3.2% quarter-over-quarter, driven by realized gains in the structured credit sleeve..."'                     UNION ALL

  SELECT 'kkr-infra-iv',                    1,         'Infrastructure Report 2025 — p.22',            '"...portfolio assets generated average EBITDA growth of 8.4% in the trailing twelve months, exceeding the underwriting case by 210 bps..."'          UNION ALL
  SELECT 'kkr-infra-iv',                    2,         'Q3 Commentary — p.5',                          '"...contracted cash flows provide 94% revenue visibility through 2027, with CPI-linked escalation clauses on 78% of assets..."'                     UNION ALL

  SELECT 'hca-hlt-hy',                      1,         'Indenture — p.18',                             '"...consolidated leverage ratio of 3.4x as of September 30, 2025, within the 5.0x covenant basket with 160 bps of headroom..."'                    UNION ALL
  SELECT 'hca-hlt-hy',                      2,         'Q3 Earnings — p.31',                           '"...adjusted EBITDA of $3.2B for the quarter, with labor costs moderating sequentially but remaining 4.1% above prior year..."'                    UNION ALL

  SELECT 'owl-rock-tech',                   1,         'BDC Annual Report 2025 — p.12',               '"...technology sector exposure represents 64% of fair value, with weighted average portfolio company EBITDA of $187M..."'                            UNION ALL
  SELECT 'owl-rock-tech',                   2,         'Q3 Update — p.7',                              '"...originated $1.4B in new commitments during the quarter, 100% in first lien senior secured at a weighted spread of SOFR+620..."'                UNION ALL

  SELECT 'ford-motor-hy',                   1,         'Credit Update Q3 2025 — p.9',                 '"...adjusted automotive free cash flow of $1.1B for the quarter; EV segment losses of $1.3B partially offset by ICE profitability..."'              UNION ALL
  SELECT 'ford-motor-hy',                   2,         'Q3 Earnings — p.44',                           '"...total liquidity of $35B provides substantial covenant headroom; net leverage of 2.1x remains well within the 3.5x incurrence covenant..."'      UNION ALL

  SELECT 'aapl-eq',                         1,         '10-K 2025 — p.28',                             '"...services revenue reached $24.2B in the quarter, representing 24% of total net sales and growing at 14% year-over-year..."'                      UNION ALL
  SELECT 'aapl-eq',                         2,         'Q3 Earnings Call — p.4',                       '"...we are very confident in our product pipeline and continue to see strong demand signals heading into the holiday quarter..."'                    UNION ALL

  SELECT 'nvda-eq',                         1,         '10-K 2025 — p.15',                             '"...data center revenue of $22.6B for the quarter represents 87% of total revenue and grew 122% year-over-year, driven by H100 and H200 demand..."' UNION ALL
  SELECT 'nvda-eq',                         2,         'Q3 Earnings — p.3',                            '"...we are supply-constrained, not demand-constrained; backlog visibility extends well into fiscal 2027 with GB200 NVL72 now in full production..."' UNION ALL

  SELECT 'spy-etf',                         1,         'Prospectus — p.4',                             '"...the fund seeks to track the investment results of the S&P 500 Index, which measures the performance of the large-cap segment of the US equity market..."' UNION ALL
  SELECT 'spy-etf',                         2,         'Q3 Factsheet — p.1',                           '"...net assets of $598B as of September 30, 2025; expense ratio of 0.0945%; 12-month tracking difference of -0.01% relative to the index..."'
)
SELECT label, snippet
FROM data
WHERE holding_id = :holding_id
ORDER BY seq
