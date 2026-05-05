-- @param advisor_id STRING
SELECT
  advisor_id,
  client_id,
  client_name,
  account_id,
  CASE
    WHEN account_name LIKE CONCAT(client_name, ' — %')
    THEN TRIM(SUBSTRING(account_name, LENGTH(client_name) + 4))
    ELSE account_name
  END AS account_name,
  ROUND(total_account_value / 1e6, 2)                              AS account_aum,
  asset_class,
  ROUND(actual_market_value / 1e6, 2)                              AS actual_dollars,
  ROUND(actual_allocation_pct, 2)                                  AS actual_pct,
  ROUND(target_allocation_pct, 2)                                  AS target_pct,
  ROUND(min_allocation_pct, 2)                                     AS min_pct,
  ROUND(max_allocation_pct, 2)                                     AS max_pct,
  ROUND(target_market_value / 1e6, 2)                              AS target_dollars,
  ROUND(min_market_value / 1e6, 2)                                 AS min_dollars,
  ROUND(max_market_value / 1e6, 2)                                 AS max_dollars,
  ROUND(drift_from_target_pct, 2)                                  AS delta_pct,
  ROUND((actual_market_value - target_market_value) / 1e6, 2)      AS delta_dollars,
  drift_status,
  ROUND(ABS(band_distance_pct), 2)                                 AS band_distance_pct,
  ROUND(rebalance_to_band / 1e6, 2)                                AS rebalance_to_band,
  ROUND(rebalance_to_target / 1e6, 2)                              AS rebalance_to_target,
  risk_profile,
  drift_severity
FROM ahtsa.awm.gold_account_ips_drift
WHERE advisor_id = :advisor_id
  AND drift_status != 'No IPS Target'
  AND asset_class != 'Cash'
ORDER BY client_id, account_id, asset_class
