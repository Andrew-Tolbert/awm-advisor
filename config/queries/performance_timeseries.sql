SELECT
  date,
  benchmark_return AS portfolio_return,
  portfolio_return AS benchmark_return
FROM ahtsa.awm.gold_app_performance_timeseries
WHERE advisor_id = :advisor_id
ORDER BY date
