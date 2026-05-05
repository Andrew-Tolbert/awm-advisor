SELECT
  holding_id,
  name,
  asset_class,
  aum_millions,
  pct_of_portfolio,
  ytd_return,
  risk_flag
FROM ahtsa.awm.gold_app_top_holdings
WHERE advisor_id = :advisor_id
ORDER BY
  CASE risk_flag WHEN 'alert' THEN 0 WHEN 'watch' THEN 1 ELSE 2 END,
  aum_millions DESC
