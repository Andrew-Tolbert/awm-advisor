SELECT
  date,
  portfolio_return,
  benchmark_return
FROM ahtsa.awm.gold_app_performance_timeseries
WHERE advisor_id = :advisor_id
ORDER BY date
