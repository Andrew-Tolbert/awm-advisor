-- @param advisor_id STRING
SELECT holding_id, name, asset_class, strategy, aum_millions, risk_flag
FROM ahtsa.awm.gold_app_holdings_list
WHERE advisor_id = :advisor_id
ORDER BY
  CASE risk_flag WHEN 'alert' THEN 0 WHEN 'watch' THEN 1 ELSE 2 END,
  aum_millions DESC
