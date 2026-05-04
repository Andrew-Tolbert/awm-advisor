# GS AWM — Databricks Asset Reference

> Workspace: `https://e2-demo-field-eng.cloud.databricks.com` (org `1444828305810485`)  
> Catalog / Schema: `ahtsa.awm`  
> Generated: 2026-05-04

Quick reference for all Databricks assets in the GS AWM demo environment. App-agnostic — use this when building any new app or integration against this workspace.

---

## Assets at a Glance

| Asset | Type | ID |
|---|---|---|
| AWM-Demo Dashboard | Lakeview (AI/BI) Dashboard | `01f142dfebb71521b206239da8aa1d3d` |
| GS AWM — Advisor Intelligence | Genie Space | `01f147207fdd153cb94327ebddc171fe` |
| gs-awm-mas | Mosaic AI Supervisor Agent | `af54fe47-a830-46d2-96e1-eca6681f4144` |
| gs-awm-ka | Knowledge Assistant (sub-agent) | `deb1b111-1923-490a-8826-dbc3f1a17b5b` |
| AWM SQL Warehouse | Serverless SQL Warehouse | `4b9b953939869799` |
| Genie SQL Warehouse | Serverless SQL Warehouse | `8baced1ff014912d` |

---

## 1. Lakeview Dashboard

**Name:** AWM-Demo  
**ID:** `01f142dfebb71521b206239da8aa1d3d`  
**Embed URL:** `https://e2-demo-field-eng.cloud.databricks.com/embed/dashboardsv3/01f142dfebb71521b206239da8aa1d3d?o=1444828305810485`  
**Direct URL:** `https://e2-demo-field-eng.cloud.databricks.com/dashboardsv3/01f142dfebb71521b206239da8aa1d3d`

A five-page Lakeview dashboard covering portfolio analytics, IPS drift/exposure, and market signals.

### Pages

| Page | What It Shows |
|---|---|
| Advisor 360 | Position-level P&L, alpha, fees, returns vs benchmark (counters, bar, pie, line, area) |
| Global Filters | Shared filters cascading to all pages (date range, advisor, account type, ticker, benchmark) |
| Exposure + Drift | IPS drift by account/asset class, direct vs ETF look-through sector exposure, rebalance counters |
| Signals Hub | Market index returns, signal feed table, portfolio exposure to actionable signals |
| Signal Details | BDC T1/T2/T3 covenant early warning scorecard for all 16 BDC names |

### Global Filter Parameters

| Parameter | Type | What It Controls |
|---|---|---|
| `:date.min` / `:date.max` | Date range | Period start/end for all datasets |
| `:benchmark` | Single-select | Benchmark index (S&P 500, DJIA, NASDAQ, Russell 2000) |
| `:advisor_id` | Multi-select | Filter by advisor |
| `:account_type` | Multi-select | Filter by account type |
| `:ticker` | Multi-select | Filter by holding/ticker |

### Datasets

| Dataset | Key Tables | Parameters | Output Summary |
|---|---|---|---|
| Equity Holdings and Price Dates Summary | `transactions`, `holdings`, `accounts`, `clients`, `bronze_historical_prices`, `bronze_indexes_and_vix`, `bronze_etf_sectors`, `bronze_company_profiles` | date range, benchmark | Position-level P&L, alpha, fees, weights, ETF look-through sector, all additive at any grain |
| Timeseries Returns | `transactions`, `accounts`, `clients`, `bronze_historical_prices`, `bronze_indexes_and_vix` | date range, benchmark, advisor, account type, ticker | Daily cumulative portfolio return vs benchmark, alpha, cumulative fees |
| Index Daily Cumulative Returns | `bronze_indexes_and_vix` | date range | Daily `cumulative_return` per index — used for market index counter widgets |
| Selection: Indexes | `bronze_indexes_and_vix` | none | Distinct `index`, `symbol` pairs — benchmark dropdown source |
| Signals Feed | `gold_unified_signals`, `bronze_company_profiles` | none | Full signal list with company metadata, sentiment scores, action flag |
| Signal Exposure | `holdings`, `accounts`, `clients`, `bronze_company_profiles`, `gold_unified_signals` | date range, source type | Holdings joined to per-symbol signal aggregates (count, severity, sentiment, action count, exposure $) |
| Signals — BDC Covenant Scorecard | `bdc_fy_snapshot`, `bdc_time_series` | none | T1/T2/T3 stoplight scorecard for 16 BDCs with metric values |
| IPS Drift | `gold_ips_drift` | none | `SELECT * FROM gold_ips_drift` |

---

## 2. Genie Space

**Name:** GS AWM — Advisor Intelligence  
**Space ID:** `01f147207fdd153cb94327ebddc171fe`  
**SQL Warehouse:** `8baced1ff014912d`  
**Embed URL:** `https://e2-demo-field-eng.cloud.databricks.com/embed/genie/rooms/01f147207fdd153cb94327ebddc171fe?o=1444828305810485`  
**Direct URL:** `https://e2-demo-field-eng.cloud.databricks.com/genie/rooms/01f147207fdd153cb94327ebddc171fe`

Natural language SQL interface over all 54 tables in `ahtsa.awm`. Pre-configured with AWM domain terminology so it correctly interprets IPS, drift, rebalance, BDC covenant terms without disambiguation.

**What it can answer:** IPS drift and rebalance amounts, AUM/P&L at any grain, portfolio performance vs benchmark, sector exposure (with ETF look-through), financial fundamentals, analyst estimate beat/miss, BDC covenant metrics, signals by severity/action flag, and any ad-hoc query against `ahtsa.awm`.

---

## 3. Supervisor Agent

**Name:** `gs-awm-mas`  
**ID:** `af54fe47-a830-46d2-96e1-eca6681f4144`  
**Serving Endpoint:** `mas-af54fe47-endpoint`  
**Configure URL:** `https://e2-demo-field-eng.cloud.databricks.com/ml/bricks/sa/configure/af54fe47-a830-46d2-96e1-eca6681f4144?o=1444828305810485`

A Mosaic AI Supervisor Agent (Agent Bricks) that routes questions to two specialized sub-agents and combines their outputs.

### Architecture

```
gs-awm-mas  (Supervisor)
├── gs-awm-ka                           Knowledge Assistant — semantic RAG
│     ID: deb1b111-1923-490a-8826-dbc3f1a17b5b
│     Endpoint: ka-deb1b111-endpoint
│     Sources: vs_signals, vs_earnings_transcripts, vs_sec_filings
│
└── agent-gs-awm-advisor-intelligence   Genie Space — natural language SQL
      Space ID: 01f147207fdd153cb94327ebddc171fe
```

### Routing

| Question type | Sub-agent used |
|---|---|
| Qualitative: management tone, filing disclosures, credit signals, news sentiment | Knowledge Assistant |
| Quantitative: IPS drift, AUM, P&L, fundamentals, BDC covenants, beat/miss | Genie Space |
| Combined: exposure to names with active credit warnings, draft client communication | Both — Genie first, then KA |

### Knowledge Assistant — Vector Search Sources

| Index | Contents | Last Synced |
|---|---|---|
| `ahtsa.awm.vs_signals` | AI-generated signals from news, SEC filings, earnings transcripts, BDC XBRL. Fields: `symbol`, `source_type`, `signal_type`, `signal_value`, `sentiment`, `advisor_action_needed`, `rationale` | 2026-05-03 |
| `ahtsa.awm.vs_earnings_transcripts` | Earnings call transcript chunks by `call_section` (prepared_remarks / qa). Fields: `symbol`, `fiscal_year`, `quarter`, `chunk_text`, `doc_uri` | 2026-05-03 |
| `ahtsa.awm.vs_sec_filings` | SEC 10-K, 10-Q, 8-K, 424B filing chunks by section (MD&A, Risk Factors, Financial Statements, Notes). Fields: `symbol`, `form_type`, `section_name`, `chunk_text`, `fiscal_year`, `doc_uri` | 2026-05-03 |

---

## 4. Data Schema — `ahtsa.awm`

**54 tables total.** Always prefer **gold tables** for analytics. Bronze is for the pipeline and fallback lookups.

### Core CRM / Portfolio (start here for any portfolio query)

| Table | What It Holds | Key Columns |
|---|---|---|
| `clients` | ~250 synthetic UHNW/HNW clients | `client_id`, `client_name`, `tier`, `risk_profile` (Growth/Balanced/Income), `total_aum`, `advisor_id`, `bdc_eligible` |
| `accounts` | Accounts linked to clients | `account_id`, `client_id`, `account_name`, `account_type`, `account_aum` |
| `holdings` | Current position snapshot | `account_id`, `ticker`, `asset_class`, `quantity`, `price`, `market_value`, `cost_basis_per_share`, `unrealized_gl`, `date` |
| `transactions` | Full trade history | `trade_id`, `date`, `account_id`, `ticker`, `action` (BUY/SELL/DRIP/DIVIDEND/FEE), `quantity`, `gross_amount`, `net_amount` |
| `ips_targets` | IPS allocation bands by risk profile | `risk_profile`, `asset_class`, `target_allocation_pct`, `min_allocation_pct`, `max_allocation_pct` |

### Gold Tables (analytics-ready, pre-joined)

| Table | What It Holds | Key Columns |
|---|---|---|
| `gold_ips_drift` | Per-account IPS drift status | `advisor_id`, `account_id`, `asset_class`, `drift_status` (Over/Under/Within Band), `drift_severity`, `rebalance_to_band`, `band_distance_pct` |
| `gold_account_ips_drift` | Drift + full account metadata + ETF look-through | All above + `etf_equity_pct`, `out_of_bounds_pct` |
| `gold_client_ips_drift` | Drift rolled to client level | + `client_drift_score`, `client_breach_count` |
| `gold_financial_fundamentals` | Per-ticker fundamentals | 101 cols: income, balance, ratios, `leverage_flag`, `analyst_consensus`, `price_target_consensus`, `analyst_upside_pct` |
| `gold_company_kpis` | Extended KPIs | 110 cols: adds `ebitda_margin_calc`, `cash_conversion_cycle`, YoY growth metrics |
| `gold_financials_vs_estimates` | Earnings beat/miss | `symbol`, `period_end`, `eps_surprise_pct`, `eps_beat_miss`, `revenue_beat_miss`, `combined_beat_miss` |
| `gold_portfolio_fundamentals` | Holdings + fundamentals joined | All holdings + `sector`, `industry`, `market_cap`, `beta`, full ratios, `analyst_upside_pct` |
| `gold_portfolio_sector_exposure` | ETF look-through sector exposure | `source_ticker`, `constituent_ticker`, `sector`, `weight_in_source`, `exposure_market_value` |
| `gold_unified_signals` | AI signals from all sources | `signal_id`, `symbol`, `signal_date`, `source_type`, `sentiment`, `severity_score`, `advisor_action_needed`, `signal_type`, `rationale` |
| `gold_bdc_early_warnings` | BDC covenant stoplight scorecard | `symbol`, T1/T2/T3 metric cols, `worst_severity` (0–1), `concern_count` (0–6) |

### Silver

| Table | What It Holds |
|---|---|
| `silver_company_fundamentals` | Cleaned/joined fundamentals (110 cols) — income, balance, ratios, estimates, analyst ratings, price targets |

### Bronze — Market Data

| Table | What It Holds | Key Columns |
|---|---|---|
| `bronze_historical_prices` | Daily adjusted OHLCV per ticker | `symbol`, `date`, `adjClose`, `volume` |
| `bronze_indexes_and_vix` | Daily OHLCV for S&P 500, DJIA, NASDAQ, Russell 2000, VIX | `symbol`, `index`, `date`, `close`, `change`, `changePercent` |
| `bronze_company_profiles` | Company metadata | `symbol`, `sector`, `industry`, `marketCap`, `beta`, `isEtf`, `ceo`, `country` |
| `bronze_analyst_ratings` | Analyst consensus | `symbol`, `strongBuy`, `buy`, `hold`, `sell`, `strongSell`, `consensus` |
| `bronze_analyst_estimates` | Forward consensus estimates | `symbol`, `date`, `revenueAvg/Low/High`, `ebitdaAvg`, `epsAvg/Low/High` |
| `bronze_price_targets` | Analyst price targets | `symbol`, `targetHigh`, `targetLow`, `targetConsensus`, `targetMedian` |

### Bronze — Financials

| Table | What It Holds |
|---|---|
| `bronze_income_statements` | Quarterly/annual P&L: `revenue`, `grossProfit`, `ebitda`, `netIncome`, `eps` |
| `bronze_balance_sheets` | Balance sheet: `totalAssets`, `totalDebt`, `netDebt`, `cash`, `totalStockholdersEquity` |
| `bronze_cash_flows` | Cash flow: `operatingCashFlow`, `freeCashFlow`, `capitalExpenditure` |
| `bronze_financial_ratios` | 65 ratios: margins, returns, leverage, liquidity, valuation multiples |
| `bronze_key_metrics` | Valuation: `marketCap`, `enterpriseValue`, `evToEBITDA`, `roic`, `freeCashFlowYield` |
| `bronze_income_growth` | YoY growth rates for all income statement lines |
| `bronze_balance_growth` | YoY growth rates for all balance sheet lines |
| `bronze_cashflow_growth` | YoY growth rates for all cash flow lines |

### Bronze — ETF Data

| Table | What It Holds |
|---|---|
| `bronze_etf_info` | ETF metadata: `expenseRatio`, `assetsUnderManagement`, `nav`, `sectorsList` |
| `bronze_etf_holdings` | ETF constituent holdings: `etf_symbol`, `symbol`, `weightPercentage`, `marketValue` |
| `bronze_etf_sectors` | **ETF sector look-through.** `etf_symbol`, `sector`, `weightPercentage` — join on `ticker = etf_symbol` to get real sector exposure |

### Bronze — Text / Document Data

| Table | What It Holds |
|---|---|
| `bronze_stock_news` | News articles: `symbol`, `title`, `summary`, `full_text`, `sentiment`, `publishedDate` |
| `bronze_transcripts` | Full earnings call transcripts: `symbol`, `year`, `quarter`, `content` |
| `bronze_transcript_chunks` | Chunked transcripts for RAG: `chunk_id`, `symbol`, `call_section`, `chunk_text`, `doc_uri` |
| `bronze_financial_reports` | Raw JSON financial reports stored as `variant` |

### BDC XBRL Tables

16 BDCs in scope: ARCC, MAIN, GBDC, FSK, BXSL, OBDC, HTGC, NMFC, PSEC, SLRC, GSBD, CGBD, AINV, OCSL, TCPC, CSWC

| Table | What It Holds |
|---|---|
| `bdc_fy_snapshot` | Annual XBRL snapshot: `ticker`, `nav_ps`, `nii`, `nii_ps`, `pik`, `div_ps`, `deprec`, `realized_gl` |
| `bdc_time_series` | Time-series XBRL metrics (pivoted): `ticker`, `metric`, `period_end`, `fiscal_period`, `numeric_value` |

### Vector Search Indexes

| Index | Source Table | Embedding On | Contents |
|---|---|---|---|
| `ahtsa.awm.vs_signals` | `gold_unified_signals` | `rationale` | All AI signals (news, filings, transcripts, BDC XBRL) |
| `ahtsa.awm.vs_sec_filings` | `sec_filing_chunks` | `chunk_text` | SEC 10-K/10-Q/8-K/424B chunks, section-labeled |
| `ahtsa.awm.vs_earnings_transcripts` | `bronze_transcript_chunks` | `chunk_text` | Earnings call transcript chunks |

### SEC Filing Pipeline Tables

| Table | What It Holds |
|---|---|
| `sec_filing_chunks` | Parsed SEC filing chunks: `symbol`, `form_type`, `section_name`, `chunk_text`, `fiscal_year`, `doc_uri` |
| `sec_filings_index_query_cache` | Embedding cache for repeated vector searches |
| `sec_filings_log` | Download audit log |
| `sec_parsed_log` | Parse audit log: sections found, chunks written per filing |

### Data Freshness

| Cadence | Tables / Indexes Refreshed |
|---|---|
| Daily — Mon–Fri, 6:00 AM UTC | `bronze_historical_prices`, `bronze_analyst_ratings`, `bronze_indexes_and_vix`, `bronze_stock_news`, `gold_unified_signals`, `vs_signals` |
| Monthly — 1st of month, 3:00 AM UTC | Company profiles, financials, ETF data, SEC filings, earnings transcripts, financial reports, all signal refinement jobs, all three vector index resyncs |
| Live (computed on query) | `gold_ips_drift` — derived from `holdings` + `ips_targets` |

### Domain Terminology

| Term | Meaning |
|---|---|
| **IPS** | Investment Policy Statement. `risk_profile` (Growth/Balanced/Income) maps to asset class target bands in `ips_targets`. |
| **Drift** | Gap between actual allocation and IPS target. `drift_status`: `Over Band`, `Under Band`, `Within Band`. |
| **Rebalance to band** | Dollar amount to bring an account back inside its IPS min/max (not to exact midpoint target). |
| **BDC** | Business Development Company — private credit vehicles. 16 in scope (see above). |
| **PIK** | Payment-in-Kind interest. Interest accruing but not received in cash — BDC stress indicator. |
| **NII** | Net Investment Income. Primary BDC earnings proxy. |
| **NAV/share** | Net Asset Value per share. BDC intrinsic value benchmark. |
| **Signal** | AI-generated alert. `advisor_action_needed = true` requires advisor review. |
| **Sector look-through** | ETF positions decomposed into constituent sector weights via `bronze_etf_sectors` for true economic exposure. |
