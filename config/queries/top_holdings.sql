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
ORDER BY aum_millions DESC
