-- @param holding_id STRING
SELECT sort_order, kpi_name, prior_value, current_value, change_pct, flag, covenant_value, prior_period, current_period
FROM ahtsa.awm.gold_app_company_fundamentals
WHERE symbol = :holding_id
ORDER BY sort_order
