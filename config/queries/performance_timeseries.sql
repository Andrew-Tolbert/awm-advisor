WITH data AS (
  SELECT 'Jan' AS month, 1 AS seq,  1.2 AS portfolio_return,  0.8 AS benchmark_return UNION ALL
  SELECT 'Feb',          2,          2.8,                       1.9                    UNION ALL
  SELECT 'Mar',          3,          4.9,                       3.1                    UNION ALL
  SELECT 'Apr',          4,          6.1,                       4.0                    UNION ALL
  SELECT 'May',          5,          5.8,                       4.4                    UNION ALL
  SELECT 'Jun',          6,          7.2,                       5.3                    UNION ALL
  SELECT 'Jul',          7,          8.4,                       6.0                    UNION ALL
  SELECT 'Aug',          8,          9.1,                       6.5                    UNION ALL
  SELECT 'Sep',          9,          8.7,                       6.2                    UNION ALL
  SELECT 'Oct',          10,         9.8,                       7.0                    UNION ALL
  SELECT 'Nov',          11,        11.1,                       7.8                    UNION ALL
  SELECT 'Dec',          12,        12.3,                       8.6
)
SELECT month, portfolio_return, benchmark_return
FROM data
ORDER BY seq
