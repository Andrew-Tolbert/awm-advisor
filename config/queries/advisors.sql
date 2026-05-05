SELECT
  advisor_id,
  full_name                                        AS name,
  title,
  CONCAT(LEFT(first_name, 1), LEFT(last_name, 1)) AS initials
FROM ahtsa.awm.advisors
ORDER BY rank_order, full_name
