SELECT
  asset_class,
  client_name,
  delta_pct
FROM ahtsa.awm.gold_app_concentration_risk
WHERE advisor_id = :advisor_id
ORDER BY asset_class, delta_pct DESC
