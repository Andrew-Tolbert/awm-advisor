# BDC Metrics — Alert Logic & Table Reference

> Catalog / Schema: `ahtsa.awm`  
> Notebooks: `/Users/andrew.tolbert@databricks.com/gs-awm-demo/9_scratchpad/app_queries/`  
> 16 BDCs in scope: ARCC, BXSL, CGBD, CSWC, FSK, GBDC, GSBD, HTGC, MAIN, MFIC, NMFC, OBDC, OCSL, PSEC, SLRC, TCPC

---

## Output Tables

Both tables match the `gold_app_company_fundamentals` schema exactly and are drop-in compatible with the Document Intelligence UI.

| Table | Cadence | KPIs | Notebook |
|---|---|---|---|
| `gold_app_bdc_fundamentals` | Annual (FY vs prior FY) | 6 | `bdc_fundamentals` |
| `gold_app_bdc_fundamentals_quarterly` | Quarterly (latest Q vs prior Q) | 4 | `bdc_fundamentals_quarterly` |

### Schema (both tables)

```
symbol          STRING    — BDC ticker (ARCC, BXSL, etc.)
company_name    STRING    — full legal name from bronze_company_profiles
prior_period    STRING    — e.g. "FY 2024" or "Q3 2025"
current_period  STRING    — e.g. "FY 2025" or "Q4 2025"
sort_order      INT       — display order (1–6 annual, 1–4 quarterly)
kpi_name        STRING    — metric label (see KPI tables below)
prior_value     STRING    — formatted string: "$19.94", "105.2%", etc.
current_value   STRING    — same format
change_pct      DOUBLE    — (current − prior) / |prior| × 100
flag            STRING    — 'up' | 'down' | 'alert' | NULL
covenant_value  DECIMAL   — always 0.0 (not used for BDC metrics)
```

**`flag` convention:**  
- `alert` — threshold breach requiring immediate advisor attention  
- `up` — metric moved in the favourable direction  
- `down` — metric moved in the unfavourable direction  
- `NULL` — only one period of data; no comparison possible  

Note: `change_pct` sign alone does **not** indicate good/bad — directionality depends on the metric (e.g. a negative `change_pct` on PIK/NII is good). Always use `flag` for alert logic, not `change_pct`.

---

## Annual KPIs (`gold_app_bdc_fundamentals`)

| sort_order | kpi_name | Formula | Unit | Direction | Alert threshold | Flag 'up' when |
|---|---|---|---|---|---|---|
| 1 | PIK/NII Ratio | `pik / nii × 100` | `%` | Lower = better | `≥ 30%` | current < prior |
| 2 | Dividend Coverage | `nii_ps / div_ps × 100` | `%` | Higher = better | `< 100%` | current > prior |
| 3 | NAV per Share | `nav_ps` | `$` | Higher = better | — | current > prior |
| 4 | Unrealized Deprec/NAV | `ABS(deprec) / (nav_ps × (nii / nii_ps)) × 100` | `%` | Lower = better | `≥ 55%` | current < prior |
| 5 | NII per Share | `nii_ps` | `$` | Higher = better | — | current > prior |
| 6 | Realized G/L per Share | `gl_ps` | `$` | Less negative = better | — | current > prior |

**Annual period logic:** uses the latest and second-latest calendar year-end (Dec 31) for each ticker from `bdc_time_series` where `fiscal_period = 'FY'`. Anchored to the latest `period_end` per year per metric to exclude intra-year quarterly rows mislabeled as `FY`.

**Coverage (of 16 tickers):**  
PIK/NII: 11 · Dividend Coverage: 9 · NAV/sh: 15 · Deprec/NAV: 14 · NII/sh: 16 · G/L/sh: 12

---

## Quarterly KPIs (`gold_app_bdc_fundamentals_quarterly`)

| sort_order | kpi_name | Formula | Unit | Direction | Alert threshold | Flag 'up' when |
|---|---|---|---|---|---|---|
| 1 | NAV per Share | `nav_ps` | `$` | Higher = better | — | current > prior |
| 2 | NII per Share | `nii_ps` | `$` | Higher = better | — | current > prior |
| 3 | PIK/NII Ratio | `pik / nii × 100` | `%` | Lower = better | `≥ 30%` | current < prior |
| 4 | Unrealized Deprec/NAV | `ABS(deprec) / (nav_ps × (nii / nii_ps)) × 100` | `%` | Lower = better | `≥ 55%` | current < prior |

Omitted from quarterly view:
- **Dividend Coverage** — `div_ps` mixes per-quarter rates and cumulative YTD totals in the source; produces nonsensical values (e.g. 455%) that can't be corrected without fixing upstream data
- **Realized G/L per Share** — single large transactions dominate a single quarter; QoQ comparison is too noisy to be actionable; use the annual table for this metric

**Quarterly period logic:** calendar quarter derived from `MONTH(period_end)` — not from the `fiscal_period` label which is unreliable (BDCs have different fiscal year start months; the same label `Q1` can fall in March, June, September, or December depending on the company). Only standard quarter-end months (3, 6, 9, 12) are used.

**Coverage (of 16 tickers):**  
NAV/sh: 16 · NII/sh: 16 · PIK/NII: 12 · Deprec/NAV: 15

---

## Data Quality Issues (baked into notebooks)

### 1. Duplicate rows at same (ticker, metric, period_end)
Some tickers have both a per-quarter value and an annualised total stored at the same calendar date with different `fiscal_period` labels. For example, BXSL `div_ps` at 2025-12-31 appears as both `0.77` (one quarter) and `3.08` (full year).

**Annual fix:** deduplicate using `ORDER BY ABS(numeric_value) DESC` so the larger annualised value wins.  
**Quarterly fix:** filter `fiscal_period IN ('Q1','Q2','Q3','Q4')` *before* deduplication so FY annual totals can never win the tiebreaker.

### 2. Intra-year quarterly rows mislabeled `fiscal_period = 'FY'`
BXSL and others label quarter-end dates (March 31, June 30, September 30) as `fiscal_period = 'FY'` in `bdc_time_series`. A naive FY filter picks these up and `ROW_NUMBER() DESC` on `period_end` then returns a quarterly row as the "prior FY period" rather than the true prior year-end.

**Fix:** after filtering to `fiscal_period = 'FY'`, group by `(ticker, metric, YEAR(period_end))` and take `MAX(period_end)` per year — this anchors each annual period to the latest date in that calendar year, guaranteeing year-end observations only.

### 3. `nav_ps` labeled `FY` even at quarterly dates
BXSL, OBDC, and GSBD label their quarterly NAV snapshots as `fiscal_period = 'FY'`. Excluding FY from the quarterly query drops valid NAV data for these tickers.

**Fix (quarterly only):** `nav_ps` is point-in-time (a balance-sheet snapshot), so it is safe to include all `fiscal_period` labels. Flow metrics (`nii_ps`, `pik`, `nii`, `deprec`) accumulate over a reporting period, so they must remain quarterly-only.

---

## Deriving Alerts

### Query pattern — all active alerts for a given advisor's holdings

```sql
SELECT
    h.ticker,
    f.kpi_name,
    f.prior_period,
    f.current_period,
    f.prior_value,
    f.current_value,
    f.change_pct,
    f.flag
FROM ahtsa.awm.gold_app_bdc_fundamentals f
JOIN (
    SELECT DISTINCT ticker
    FROM ahtsa.awm.holdings h
    JOIN ahtsa.awm.accounts a USING (account_id)
    JOIN ahtsa.awm.clients c USING (client_id)
    WHERE c.advisor_id = :advisor_id
      AND h.ticker != 'CASH'
) h ON h.ticker = f.symbol
WHERE f.flag = 'alert'
ORDER BY f.symbol, f.sort_order
```

Use `gold_app_bdc_fundamentals_quarterly` for the same query against the quarterly table.

### Threshold summary (for alert generation logic)

| Metric | Alert condition | Interpretation |
|---|---|---|
| PIK/NII Ratio | `≥ 30%` | 30%+ of NII is non-cash; BDC cannot service debt from cash earnings |
| Dividend Coverage | `< 100%` | NII does not cover the dividend; cut risk or yield compression expected |
| Unrealized Deprec/NAV | `≥ 55%` | More than half of net assets are underwater; portfolio marks under pressure |

No hard alert thresholds exist for NAV/sh, NII/sh, or G/L/sh — use `flag = 'down'` with large `change_pct` magnitude as a soft signal for those.

### Multi-metric scoring

To produce a portfolio-level BDC risk score (mirrors the `gold_bdc_early_warnings` stoplight view):

```sql
SELECT
    symbol,
    company_name,
    current_period,
    COUNT(CASE WHEN flag = 'alert' THEN 1 END) AS alert_count,
    COUNT(CASE WHEN flag = 'down'  THEN 1 END) AS down_count,
    COUNT(CASE WHEN flag = 'up'    THEN 1 END) AS up_count,
    -- Severity score: 1.0 per alert, 0.3 per down
    ROUND(
        COUNT(CASE WHEN flag = 'alert' THEN 1 END) * 1.0 +
        COUNT(CASE WHEN flag = 'down'  THEN 1 END) * 0.3,
    1) AS risk_score
FROM ahtsa.awm.gold_app_bdc_fundamentals
GROUP BY symbol, company_name, current_period
ORDER BY risk_score DESC
```

---

## Source Tables

| Source table | Metrics drawn from it |
|---|---|
| `bdc_time_series` | All metrics — both tables pull from here. Long format: `(ticker, metric, fiscal_period, period_end, numeric_value)`. |
| `bdc_fy_snapshot` | **Not used** by either gold table — it only holds the single most recent FY value per metric and cannot provide prior-period comparisons. Useful only for quick current-state lookups. |
| `bronze_company_profiles` | `companyName` — joined on `symbol = ticker` for the `company_name` column. |

### `bdc_time_series` metrics reference

| metric | What it measures | Notes |
|---|---|---|
| `pik` | Payment-in-kind income ($) | Can be quarterly or FY |
| `nii` | Net investment income ($) | Can be quarterly or FY; large absolute values (1e9 range for large BDCs) |
| `nii_ps` | NII per share ($) | Per-share form of `nii` |
| `div_ps` | Dividends per share paid ($) | Quarterly labels unreliable — see data quality §1 |
| `nav_ps` | NAV per share ($) | Point-in-time; `fiscal_period='FY'` label common even at quarterly dates |
| `deprec` | Unrealized depreciation ($) | Always positive in source; formula uses `ABS()` defensively |
| `net_assets` | Total net assets ($) | Available but not used — reconstructed as `nav_ps × (nii / nii_ps)` for better cross-ticker consistency |
| `gl_ps` | Realized gain/loss per share ($) | Cumulative annual figure; negative = net losses |
| `realized_gl` | Total realized gain/loss ($) | Total-book form of `gl_ps` |
