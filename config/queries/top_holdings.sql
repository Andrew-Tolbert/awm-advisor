SELECT
  holding_id,
  name,
  asset_class,
  aum,
  pct_of_portfolio,
  ytd_return
FROM ahtsa.awm.gold_app_top_holdings
WHERE advisor_id = :advisor_id
ORDER BY aum DESC
