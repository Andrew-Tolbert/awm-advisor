WITH latest AS (
  SELECT
    section_id,
    section_key,
    section_name,
    content,
    status,
    generated_at,
    ROW_NUMBER() OVER (
      PARTITION BY briefing_date, advisor_id, section_key
      ORDER BY generated_at DESC
    ) AS rn
  FROM ahtsa.awm.app_morning_briefings
  WHERE briefing_date = (SELECT MAX(briefing_date) FROM ahtsa.awm.app_morning_briefings)
    AND advisor_id = :advisor_id
    AND section_id BETWEEN 0 AND 9
)
SELECT section_id, section_key, section_name, content, status, generated_at
FROM latest
WHERE rn = 1
ORDER BY section_id
