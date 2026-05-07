SELECT
  holding_id,
  section,
  section_order,
  positive_pct,
  neutral_pct,
  negative_pct,
  sentiment,
  section_note,
  earnings_date,
  year,
  quarter,
  quarter_label,
  prior_quarter_label,
  source_description
FROM ahtsa.awm.gold_app_management_tone
WHERE section IS NOT NULL
ORDER BY holding_id, section_order
