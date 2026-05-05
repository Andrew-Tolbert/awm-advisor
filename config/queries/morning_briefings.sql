SELECT
  section_id,
  section_key,
  section_name,
  content,
  status,
  generated_at
FROM ahtsa.awm.app_morning_briefings
WHERE briefing_date = current_date()
  AND advisor_id = :advisor_id
  AND section_id IS NOT NULL
ORDER BY section_id
