SELECT
  total_aum,
  -perf_vs_bench_pct AS perf_vs_bench_pct,
  drift_count,
  clients_at_risk,
  qtd_aum_change
FROM ahtsa.awm.gold_app_portfolio_summary
WHERE advisor_id = :advisor_id
