SELECT
  asset_class,
  pct_of_portfolio
FROM ahtsa.awm.gold_app_asset_allocation
WHERE advisor_id = :advisor_id
ORDER BY pct_of_portfolio DESC
