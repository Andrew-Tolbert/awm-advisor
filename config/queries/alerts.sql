-- @param advisor_id STRING
-- Join back to gold_unified_signals for the full rationale — gold_app_alerts
-- stores only LEFT(rationale, 400) which can truncate mid-sentence.
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
WHERE a.advisor_id = :advisor_id
ORDER BY a.severity_score DESC, a.signal_date DESC
