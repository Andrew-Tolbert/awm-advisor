-- @param advisor_id STRING
-- Weighted delta per client × asset class, using only accounts that carry
-- a non-zero IPS target for that asset class. Weighting by total_account_value
-- prevents large accounts from being diluted by small accounts with no exposure.
SELECT
  asset_class,
  risk_profile,
  ROUND(
    SUM(drift_from_target_pct * total_account_value)
    / NULLIF(SUM(total_account_value), 0),
    1
  ) AS delta_pct
FROM ahtsa.awm.gold_account_ips_drift
WHERE advisor_id = :advisor_id
  AND target_allocation_pct > 0
GROUP BY asset_class, risk_profile
ORDER BY asset_class, delta_pct DESC