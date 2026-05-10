-- @param advisor_id STRING
-- Join back to gold_unified_signals for the full rationale — gold_app_alerts
-- stores only LEFT(rationale, 400) which can truncate mid-sentence.
-- IPS breach alerts are surfaced from app_client_communications since they do
-- not exist in gold_app_alerts; the account_id serves as the signal_id.
SELECT
  a.signal_id,
  a.symbol,
  a.company_name,
  a.signal_date,
  a.source_type,
  a.source_description,
  a.sentiment,
  a.severity_score,
  a.advisor_action_needed,
  a.signal_type,
  a.signal,
  a.signal_value,
  a.total_exposure,
  COALESCE(s.rationale, a.rationale) AS rationale
FROM ahtsa.awm.gold_app_alerts a
LEFT JOIN ahtsa.awm.gold_unified_signals s ON s.signal_id = a.signal_id
WHERE a.advisor_id  = :advisor_id
  AND a.signal_type NOT LIKE 'IPS%'

UNION ALL

SELECT
  cc.signal_id,
  'IPS'                                                     AS symbol,
  cc.client_name                                            AS company_name,
  CAST(cc.generated_at AS DATE)                             AS signal_date,
  'IPS Monitoring'                                          AS source_type,
  CONCAT(cc.signal_type, ' — ', cc.client_name)             AS source_description,
  'Negative'                                                AS sentiment,
  0.95                                                      AS severity_score,
  true                                                      AS advisor_action_needed,
  cc.signal_type                                            AS signal_type,
  cc.signal_type                                            AS signal,
  CAST(NULL AS DOUBLE)                                      AS signal_value,
  CAST(NULL AS DOUBLE)                                      AS total_exposure,
  'Portfolio allocation has drifted outside IPS bands.'     AS rationale
FROM ahtsa.awm.app_client_communications cc
WHERE cc.advisor_id   = :advisor_id
  AND cc.signal_type  LIKE 'IPS%'
  AND cc.status       = 'success'
  AND cc.generated_at = (
    SELECT MAX(generated_at)
    FROM   ahtsa.awm.app_client_communications
    WHERE  advisor_id  = :advisor_id
      AND  signal_id   = cc.signal_id
      AND  signal_type LIKE 'IPS%'
      AND  status      = 'success'
  )

ORDER BY severity_score DESC, signal_date DESC
