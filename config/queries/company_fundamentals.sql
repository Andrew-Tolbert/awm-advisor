-- @param holding_id STRING
SELECT sort_order, kpi_name, prior_value, current_value, change_pct, flag, covenant_value, prior_period, current_period
FROM ahtsa.awm.gold_app_company_fundamentals
WHERE symbol = :holding_id

UNION ALL

-- BDC quarterly health metrics — rows only present for BDC holdings.
-- sort_order offset by 100 so these always follow company fundamentals.
SELECT sort_order + 100, kpi_name, prior_value, current_value, change_pct, flag, covenant_value, prior_period, current_period
FROM ahtsa.awm.gold_app_bdc_fundamentals_quarterly
WHERE symbol = :holding_id

ORDER BY sort_order
