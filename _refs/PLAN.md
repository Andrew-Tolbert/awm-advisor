# AWM Unified Wealth Intelligence Hub — Build Plan

**Demo:** Goldman Sachs EBC 5/12/26 — Demo 1  
**Audience:** GS Scale AWM leaders (Sara Naison-Tarajano, Kristin Olson, Bryon Lake, Greg Calnon, James Reynolds, Michael Bruun)  
**Narrative:** A wealth advisor arrives at their desk to a single intelligent workspace unifying every product, position, and client signal across all asset classes — instead of toggling between siloed systems.

---

## Progress Checklist

### Wireframe
- [x] Sidebar navigation — GS identity, 4 nav links, active left-border style, advisor picker dropdown
- [x] **Sidebar updated to 6 nav links** — Drift Analysis (2nd), Tech Stack (6th)
- [x] **Morning Briefing Bell** — `MorningBriefingBell` component in sidebar header; notification bell with badge count; sections expand with markdown-rendered content; severity-coded stripes (Action/Watch/FYI)
- [x] Page 1: Portfolio Intelligence Dashboard
  - [x] 4 KPI stat cards (AUM, Perf vs Benchmark, Allocation Drift, Clients at Risk)
  - [x] Allocation Drift KPI card links to `/drift` instead of being static
  - [x] Drift alert in Active Alerts feed links to `/drift` (was `/documents`)
  - [x] Asset Allocation donut chart (`asset_allocation.sql`)
  - [x] Performance vs Benchmark area chart (`performance_timeseries.sql`)
  - [x] Top 10 Holdings table with risk badges, clickable rows → `/documents`
  - [x] Active Alerts feed — **live from `alerts.sql`**; severity-sorted; links to `/agents?signal_id=<id>` or `/drift`
  - [x] Client Concentration Risk heatmap — now **asset class × risk profile** grouping (not client × asset class)
- [x] Page 2: Drift Analysis (`/drift`) — **BUILT**
  - [x] Advisor-level summary bar: total accounts drifting, total clients at risk, worst asset class
  - [x] Client drift table — one row per client, sorted by drift score; columns: client name, AUM, # breaches, worst asset class, drift score badge
  - [x] Account drill-down panel — clicking a client expands per-account, per-asset-class drift rows with IPS band and actual vs target delta
  - [x] URL param sync (`?client=<id>`) to deep-link from Portfolio page alerts
- [x] Page 3: Document Intelligence
  - [x] Left panel: holdings list with asset-class badges
  - [x] Left panel: document list — **live from `holding_documents.sql`** against `gold_app_documents`; ordered by source type
  - [x] KPI delta table with flag indicators
  - [x] Covenant health gauge with APPROACHING BREACH warning
  - [x] Management tone stacked bar — **extended to section-level** (by earnings quarter + source type)
  - [x] Source citations — **two sources**: mock `source_citations.sql` CTE + live `alert_citations.sql` keyed by `signal_id`; alert citations surface doc-specific snippets when an alert is active
  - [x] URL param sync (`?holding=<id>`) from Portfolio page
- [x] Page 4: Agent Orchestration
  - [x] Proactive alert banner with pulsing red dot
  - [x] Agent cascade timeline with staggered animation (3 agents)
  - [x] Expandable agent detail panels
  - [x] Affected clients selector (3 clients, tab-style)
  - [x] Editable draft communication textarea (per-client)
  - [x] Approve & Send → success state with checkmark
  - [x] Re-allocation scenario card
  - [x] Audit trail footer
- [x] Page 5: Genie Chat — full-width embed (removed max-w constraint)
- [x] Page 6: Tech Stack (`/tech-stack`) — **NEW** — card grid linking to Lakeflow Jobs, Agent Bricks (Supervisor + Knowledge Assistant), MLflow Traces, Genie Space, Unity Catalog Lineage; each card has deep-link to the actual Databricks workspace resource
- [x] **Portfolio Assistant (embedded chat)** — `PortfolioAssistant` component; streaming Claude chat via `/api/portfolio-chat`; pre-cached responses for prompt chips (no model call on chip click); full chat history; PDF export; `prefab-prompts.ts` cache file

### Phase 2: Data & SQL
- [x] `portfolio_summary.sql` — extended with `qtd_aum_change` column
- [x] `asset_allocation.sql`
- [x] `performance_timeseries.sql` — **daily** (not monthly); queries `gold_app_performance_timeseries`
- [x] `top_holdings.sql`
- [x] `concentration_risk.sql` — schema changed: now groups by `asset_class × risk_profile` (not client × asset class); returns `delta_pct` only
- [x] `advisors.sql` — new; populates sidebar advisor picker
- [x] `holdings_list.sql` — `has_alert` removed, `aum` added; left panel uses alert dot from `alerts` query now
- [x] ~~`document_insights.sql`~~ — **deleted**; superseded by `company_fundamentals.sql`
- [x] ~~`hello_world.sql`~~ — **deleted**; unused scaffold
- [x] `company_fundamentals.sql` — Live against `gold_app_company_fundamentals`; 10 KPIs per holding; card only renders when holding selected; flag drives color
- [x] `management_tone.sql` — Live against `gold_app_management_tone`; extended to section-level breakdown: `section`, `section_order`, `section_note`, `earnings_date`, `year`, `quarter`, `quarter_label`, `prior_quarter_label`, `source_description`
- [x] `source_citations.sql` — Mock CTE keyed by `holding_id`; returns `label` + `snippet`
- [x] `account_drift.sql` — Live against `gold_account_ips_drift`; all dollar + drift columns
- [ ] `drift_summary.sql` — computed client-side in DriftPage
- [ ] `client_drift.sql` — computed client-side in DriftPage
- [x] `client_communications.sql` — **NEW.** Live against `ahtsa.awm.app_client_communications`; filtered by `advisor_id` + `signal_id`; joins `clients` for AUM; powers Agent Orchestration page
- [x] `alerts.sql` — **NEW.** Live against `ahtsa.awm.gold_app_alerts` + LEFT JOIN `gold_unified_signals` (for full rationale); filtered by `advisor_id`; sorted by `severity_score` desc; powers Active Alerts feed on Portfolio page
- [x] `alert_citations.sql` — **NEW.** Mock CTE keyed by ticker symbol (TCPC, FSK, UNH, ADBE, AMT), joined to `gold_app_alerts` by `signal_id`; returns `doc_name` + `snippet`; powers source citations in Document Intelligence when an alert is active
- [x] `morning_briefings.sql` — **NEW.** Live against `ahtsa.awm.app_morning_briefings`; latest `briefing_date` + `advisor_id`; sections 0–9 deduped by `ROW_NUMBER()`; powers Morning Briefing Bell
- [x] `holding_documents.sql` — **NEW.** Live against `ahtsa.awm.gold_app_documents`; filtered by `symbol`; ordered by `source_type` priority (10-K → earnings → 8-K → 10-Q → BDC); powers document list in Document Intelligence left panel

#### Gold App Tables — `ahtsa.awm`

All Portfolio Intelligence queries are backed by pre-computed `gold_app_*` tables that cover **all advisors**. The app filters to a single advisor at query time via `:advisor_id`.

| Gold table | Built from | Notes |
|---|---|---|
| `gold_app_portfolio_summary` | `clients`, `silver_advisor_daily_returns`, `gold_ips_drift`, `accounts` | Latest alpha from silver; COALESCE 0 for advisors with no drift/risk |
| `gold_app_asset_allocation` | `holdings → accounts → clients` | Window SUM partitioned by `advisor_id` |
| `gold_app_performance_timeseries` | `silver_advisor_daily_returns` | All trading days (daily); no month-end aggregation |
| `gold_app_top_holdings` | `holdings`, `bronze_historical_prices`, `gold_unified_signals`, `bronze_company_profiles` | Top-10 per advisor; risk_flag from last-30-day signals |
| `gold_app_concentration_risk` | `gold_ips_drift`, `clients` | Now groups by `asset_class × risk_profile` (not client × asset class) — heatmap shows drift by profile bucket |
| `gold_app_company_fundamentals` ✅ | `gold_financial_fundamentals` + `holdings` | **NEW.** 10 KPI rows per holding (EBITDA, Leverage, RevGrowth, IntCoverage, ND/EBITDA, EPS, EBITDA Margin, Net Margin, ROE, FCF). Prior vs current period, formatted display strings, flag ('up'/'down'/'alert'), `LATERAL VIEW INLINE` unpivot. All holdings in portfolio; is_etf=false. |
| `gold_app_alerts` ✅ | `gold_unified_signals` + `holdings` + `clients` | **NEW.** One row per signal per advisor; `signal_id`, `symbol`, `company_name`, `signal_date`, `source_type`, `signal_type`, `signal`, `signal_value`, `sentiment`, `severity_score`, `advisor_action_needed`, `total_exposure`, `rationale` (truncated to 400 chars — full rationale fetched via JOIN in `alerts.sql`) |
| `gold_app_documents` ✅ | `vs_sec_filings` + `bronze_earnings_transcripts` | **NEW.** One row per document per symbol; `symbol`, `doc_name`, `source_type`; ordered by source type priority in `holding_documents.sql` |
| `app_morning_briefings` ✅ | Agent pipeline output | **NEW.** Section-based morning briefing content per advisor per day; `section_id`, `section_key`, `section_name`, `content` (markdown), `status`, `generated_at`, `briefing_date`, `advisor_id` |

**New tables needed for Drift Analysis page:**

| Gold table | Built from | Notes |
|---|---|---|
| `gold_app_drift_summary` | `gold_app_account_drift`, `clients` | One row per advisor: drifting_accounts, clients_at_risk, worst_asset_class, total_rebalance_to_band |
| `gold_app_client_drift` | `gold_app_account_drift`, `clients` | One row per (advisor, client): breach_count, worst_asset_class, total_aum, total_rebalance_to_target |
| `gold_app_account_drift` | view definition of `gold_ips_drift` + `ips_targets` + `accounts` + `clients` | **See full column spec below** — materialized as a table |

#### `gold_app_account_drift` — Full Column Specification

**Approach:** `gold_ips_drift` is a live view (`SELECT * FROM gold_ips_drift` per dashboard). Take the view's underlying SQL, extend it with the missing dollar columns, and materialize as `gold_app_account_drift`. This becomes the single source of truth for all drift data — the summary and client tables aggregate from it.

**Key design decisions:**
- `COALESCE(target_pct, 0)` — accounts whose `risk_profile` has no IPS target for a given asset class (e.g., an Income profile with no Private Equity target) get `target_pct = 0`, `target_dollars = 0`, and `min_dollars = 0`. They still appear if they hold any of that asset class, which itself may be a drift violation.
- `rebalance_to_band` is already in `gold_ips_drift` — carry it through unchanged.
- `rebalance_to_target` is new — the dollar move to hit exact `target_pct` (not just inside the band). Formula: `(target_pct - actual_pct) * account_aum / 100`. Positive = need to buy; negative = need to sell.
- All assets held by an account are included, even if they have no IPS target row (LEFT JOIN on `ips_targets`).

**Full column list:**

| Column | Type | Source / Formula |
|---|---|---|
| `advisor_id` | STRING | `accounts → clients → advisors` |
| `client_id` | STRING | `accounts.client_id` |
| `client_name` | STRING | `clients.client_name` |
| `account_id` | STRING | `accounts.account_id` |
| `account_name` | STRING | `accounts.account_name` |
| `account_aum` | DOUBLE | `accounts.account_aum` |
| `asset_class` | STRING | `holdings.asset_class` |
| `actual_dollars` | DOUBLE | `SUM(holdings.market_value)` for this account + asset class |
| `actual_pct` | DOUBLE | `actual_dollars / account_aum * 100` |
| `target_pct` | DOUBLE | `COALESCE(ips_targets.target_allocation_pct, 0)` |
| `min_pct` | DOUBLE | `COALESCE(ips_targets.min_allocation_pct, 0)` |
| `max_pct` | DOUBLE | `COALESCE(ips_targets.max_allocation_pct, 0)` |
| `target_dollars` | DOUBLE | `target_pct * account_aum / 100` |
| `min_dollars` | DOUBLE | `min_pct * account_aum / 100` |
| `max_dollars` | DOUBLE | `max_pct * account_aum / 100` |
| `delta_pct` | DOUBLE | `actual_pct - target_pct` |
| `delta_dollars` | DOUBLE | `actual_dollars - target_dollars` |
| `drift_status` | STRING | `CASE WHEN actual_pct > max_pct THEN 'Over Band' WHEN actual_pct < min_pct THEN 'Under Band' ELSE 'Within Band' END` |
| `band_distance_pct` | DOUBLE | From `gold_ips_drift` — distance to nearest band edge (0 if within) |
| `rebalance_to_band` | DOUBLE | From `gold_ips_drift` — $ to get back inside band (0 if within) |
| `rebalance_to_target` | DOUBLE | `(target_pct - actual_pct) * account_aum / 100` — $ to reach exact target; positive = buy, negative = sell |
| `risk_profile` | STRING | `clients.risk_profile` (Growth/Balanced/Income) |
| `drift_severity` | STRING | From `gold_ips_drift` (high/medium/low/none) |

> **Notebook:** `/Workspace/Users/andrew.tolbert@databricks.com/gs-awm-demo/9_scratchpad/app_queries/portfolio_intelligence_queries`  
> Run all cells to rebuild every gold table across all advisors. **Add `gold_app_account_drift` first (others aggregate from it), then `gold_app_client_drift`, then `gold_app_drift_summary`.**

#### SQL Migration Tracker — `ahtsa.awm` Real Data

| Query file | Page / Widget | Migrated? |
|---|---|---|
| `portfolio_summary.sql` | Portfolio — 4 KPI stat cards | ✅ Live — queries `gold_app_portfolio_summary WHERE advisor_id = :advisor_id` |
| `asset_allocation.sql` | Portfolio — Asset Allocation donut chart | ✅ Live — queries `gold_app_asset_allocation WHERE advisor_id = :advisor_id` |
| `performance_timeseries.sql` | Portfolio — Performance vs Benchmark (daily) | ✅ Live — queries `gold_app_performance_timeseries WHERE advisor_id = :advisor_id` |
| `top_holdings.sql` | Portfolio — Top 10 Holdings table | ✅ Live — queries `gold_app_top_holdings WHERE advisor_id = :advisor_id` |
| `concentration_risk.sql` | Portfolio — Concentration heatmap (asset class × risk profile) | ✅ Live — queries `gold_app_concentration_risk`; schema now groups by `asset_class × risk_profile` |
| `advisors.sql` | Sidebar — advisor picker dropdown | ✅ Live — queries `ahtsa.awm.advisors ORDER BY rank_order` |
| `holdings_list.sql` | Documents — left-panel holdings selector | ✅ Live — queries `gold_app_holdings_list WHERE advisor_id = :advisor_id` |
| `company_fundamentals.sql` | Documents — Key Metrics KPI table (`:holding_id` param) | ✅ Live — queries `gold_app_company_fundamentals WHERE symbol = :holding_id`; card hidden until holding selected; flag drives color (not raw sign) |
| ~~`document_insights.sql`~~ | ~~Documents — KPI delta table~~ | ⛔ Deleted — superseded by `company_fundamentals.sql` |
| `management_tone.sql` | Documents — Management Tone bar | ✅ Live — queries `gold_app_management_tone`; filtered client-side by `holding_id` |
| `source_citations.sql` | Documents — Source Citations | ✅ Mock CTE — sufficient for demo |
| `account_drift.sql` | Drift — full account + asset class detail table | ✅ Live — queries `gold_account_ips_drift WHERE advisor_id = :advisor_id` |
| `drift_summary.sql` | Drift — advisor KPI bar | ☐ Computed client-side in `DriftPage.tsx` |
| `client_drift.sql` | Drift — client-level breach table | ☐ Computed client-side in `DriftPage.tsx` |
| `client_communications.sql` | Agents — affected clients + draft emails | ✅ Live — `ahtsa.awm.app_client_communications`; filtered by `advisor_id` + `signal_id`; joins `clients` for AUM |
| `alerts.sql` | Portfolio — Active Alerts feed | ✅ Live — `gold_app_alerts` + JOIN `gold_unified_signals`; sorted by severity |
| `alert_citations.sql` | Documents — alert-linked source citations | ✅ Mock CTE — ticker-keyed snippets (TCPC, FSK, UNH, ADBE, AMT); joins `gold_app_alerts` by `signal_id` |
| `morning_briefings.sql` | Sidebar — Morning Briefing Bell | ✅ Live — `app_morning_briefings`; latest briefing date per advisor |
| `holding_documents.sql` | Documents — left panel document list | ✅ Live — `gold_app_documents`; filtered by symbol; ordered by source type |

### Phase 2.5: Advisor Context & Filtering
- [x] `ahtsa.awm.advisors` table exists with `advisor_id`, `full_name`, `title`, `email`, `rank_order`, initials derivable from `first_name`/`last_name`
- [x] `AdvisorContext.tsx` — fetches all advisors, holds selected `advisor_id` in state, exposes `params` object and `setAdvisorId`
- [x] Sidebar `AdvisorPicker` — `<select>` dropdown populated from `advisors` query; switching advisor re-runs all queries instantly
- [x] `PortfolioPage` wired to `useAdvisor()` — zero hardcoded advisor IDs in component code
- [x] Wire `useAdvisor()` into `DocumentsPage` (holdings_list and management_tone live; source_citations mock is fine for demo)
- [x] Wire `useAdvisor()` into `DriftPage`
- [x] Wire `useAdvisor()` into `AgentsPage` — `useAnalyticsQuery('client_communications', { advisor_id, signal_id })`

### Phase 3: Agent Orchestration — Real Data Wiring
- [x] **`AgentsPage.tsx`** — wired to `ahtsa.awm.app_client_communications`; real clients, real AI-drafted emails (markdown rendered via `marked`); dynamic cascade narrative per signal type; `?signal_id=` URL param drives which alert is shown; empty state when no signal selected
- [x] **`client_communications.sql`** — parameterized by `advisor_id` + `signal_id`; joins `clients` for AUM; latest `run_date` via scalar subquery
- [x] **Document Intelligence alert banners** — "Draft Comms" button navigates to `/agents?signal_id=<id>`
- [x] **Markdown rendering** — `marked` parses email drafts; toggle between rendered preview and raw edit (`Pencil`/`Eye`)
- [ ] Lakebase approval write — Approve & Send shows success state client-side only; no backend write yet (not needed for demo)

### Phase 3.5: Portfolio Assistant (Chat) — **NEW** ✅
- [x] **`/api/portfolio-chat`** — Express route (`server/routes/portfolio-chat.ts`); streams Claude API responses as SSE; system prompt includes advisor context, portfolio summary, and top holdings
- [x] **`PortfolioAssistant.tsx`** — floating/docked chat panel; streaming messages; full chat history with `useChatStore` (Zustand)
- [x] **`PromptChips.tsx`** — pre-defined chip buttons; clicking a chip looks up `prefab-prompts.ts` and renders instantly (no API call); free-typed prompts still hit Claude
- [x] **`prefab-prompts.ts`** — 3-layer answer cache keyed case-insensitively to prompt text; one cache file per chat surface (`advisor` key); includes pre-baked answers for top-risk, BDC surveillance, and private credit chips
- [x] **`MessageBubble.tsx`**, **`ChatHistory.tsx`**, **`useMasChat.ts`** — streaming message assembly, history display, MAS-style chat hook
- [x] **`exportChatPdf.ts`** — export full chat transcript as PDF

### Phase 3.6: Morning Briefing Bell — **NEW** ✅
- [x] **`MorningBriefingBell.tsx`** — bell icon with badge count in sidebar header; notification panel opens on click; sections collapsed by default; expand shows markdown-rendered content; severity-coded left stripe + icon bg (Action=red, Watch=amber, FYI=blue)
- [x] **`morning_briefings.sql`** — live query; sections 0–9 deduped by latest `generated_at`
- [x] Section meta config: `executive_summary`, `portfolio_alerts`, `bdc_surveillance`, `credit_events`, `earnings_highlights`, `ai_signals`, `recommended_actions`

### Phase 3.7: Tech Stack Page — **NEW** ✅
- [x] **`TechStackPage.tsx`** (`/tech-stack`) — card grid with 6 deep-links into the demo workspace: Lakeflow Jobs, Agent Bricks Supervisor, Agent Bricks Knowledge Assistant, MLflow Traces, Genie Space, Unity Catalog Lineage
- [x] Added as 6th sidebar nav link with `Cpu` icon

### Phase 3.8: Positive Alerts & Alert Strip — **NEW** ✅
- [x] **Positive alert support (AMT / Guidance Raise)** — `sentiment` field added to `AlertRow` type; `isPositiveSentiment()` helper; banner and pill colors driven dynamically (emerald for positive, red for negative); `'Guidance Raise'` added to `SIGNAL_META` with OPPORTUNITY ALERT copy, AMT-specific detail, and positive agent cascade narrative; `SIGNAL_META_POSITIVE_FALLBACK` for future positive signal types
- [x] **IPS Drift pill always visible in alert strip** — IPS pill permanent fixture in the alert strip regardless of navigation source; drift row persisted to `sessionStorage` when navigating from DriftPage so the IPS pill can restore drift context at any time; clicking IPS when inactive re-navigates to `/agents` with the stored drift row — no navigation away from the page; signal pills and IPS pill all toggle alert content in-place

### Phase 3.9: Re-Allocation Scenario — Interactive Modeling ☐
> **Current state:** Card shows static SIGNAL_META copy with a non-functional "Model Scenario" button that navigates to `/`.
>
> **Goal:** Make the scenario card genuinely interactive using data that already exists — no new gold tables required. The "wow" here is showing real dollars and IPS compliance impact, not just static percentages.

**Data available without new queries:**
| Source | What it provides |
|---|---|
| `asset_allocation.sql` (add to AgentsPage) | Actual current % per asset class for the advisor — replaces static SIGNAL_META percentages |
| `portfolio_summary.sql` (add to AgentsPage) | `total_aum` — converts % deltas to dollar trade size estimates |
| `account_drift.sql` (already queried by DriftPage; add filtered call to AgentsPage) | Per-account drift status per asset class — shows how many accounts the reallocation would bring back into IPS compliance |

**Build steps:**

1. **Enrich with real allocation data** — Add `useAnalyticsQuery('asset_allocation', advisorParams)` and `useAnalyticsQuery('portfolio_summary', advisorParams)` to AgentsPage. Replace static `realloc.from_pct` / `realloc.to_pct` with the live current % for that asset class and the proposed target %. Show the real delta, not the hardcoded one.

2. **Dollar trade estimate** — Compute `Math.abs(actual_pct - proposed_pct) / 100 * total_aum` and display as "$X.XM estimated trade size across N affected clients."

3. **"Model Scenario" toggle** — Button toggles an expanded state on the card (replaces navigate-to-home). Expanded view shows:
   - Before/after horizontal bar for `from_asset` and `to_asset` (animated width transition, two rows)
   - Dollar trade estimate
   - IPS compliance impact: filter `account_drift` results to the `from_asset` class, count accounts currently `Over Band` that would land `Within Band` after the proposed reduction — display as "X of Y over-weight accounts return to IPS band"
   - A "Close Model" button to collapse back

4. **Confirm Reallocation action** — A secondary "Recommend Reallocation" button inside the expanded view appends a reallocation recommendation block to the active draft communication (modifies `draftText` state directly). This makes the scenario card feel connected to the approval flow.

**Acceptance criteria:** Clicking "Model Scenario" expands the card with real current allocation %, a real dollar trade estimate, and a live IPS compliance impact count. "Recommend Reallocation" appends structured reallocation language to the draft email. No new SQL files or gold tables required.

### Phase 4: Polish ✅ (demo-ready)
- [x] GS navy `#1a3a5c` used consistently for accents, borders, and interactive elements
- [x] Loading states on data-driven sections (`commsLoading` guard in AgentsPage; `Skeleton` in DocumentsPage)
- [x] Empty state on Agent Orchestration when no `signal_id` in URL
- [ ] Loading skeletons on Portfolio KPI cards
- [ ] Error states on `useAnalyticsQuery` calls
- [ ] Responsive sidebar (icon-only < 1024px) — optional, not needed for demo

### Pre-Demo Cleanup ✅
- [x] `alerts.sql` — LEFT JOIN `gold_unified_signals` for full rationale (bypasses 400-char truncation in `gold_app_alerts.rationale`)
- [x] `concentration_risk.sql` schema pivot — was client × asset class; now asset class × risk profile for cleaner heatmap
- [x] `holdings_list.sql` — dropped `has_alert`; alert indicator driven by `alerts` query result set instead
- [x] `management_tone.sql` — extended to multi-section / multi-quarter breakdown
- [x] TypeScript clean — `npx tsc --noEmit` passes

### Pre-commit Cleanup ✅
- [x] Deleted `document_insights.sql` and `hello_world.sql` (unused)
- [x] Removed `document_insights` and `hello_world` from `appKitTypes.d.ts`
- [x] Removed `risk_flag` from `top_holdings.sql` SELECT and `appKitTypes.d.ts` result type
- [x] Stripped commented-out CSS blocks from `index.css`
- [x] TypeScript clean — `npx tsc --noEmit` passes with zero errors

---

## Tech Stack (already scaffolded)

- **Frontend:** React + TypeScript, Tailwind CSS, shadcn/ui via `@databricks/appkit-ui/react`
- **Backend:** Express/Node.js via `@databricks/appkit`
- **SQL queries:** Files in `config/queries/*.sql`, accessed via `useAnalyticsQuery(queryKey, params)` hook
- **Charts:** `AreaChart`, `LineChart`, `RadarChart` from `@databricks/appkit-ui/react`
- **Genie:** Embedded via `GeniePage` using `DATABRICKS_GENIE_SPACE_ID` env var
- **Audit/CRUD:** Lakebase (Postgres) via `appkit.lakebase.query()`
- **App routing:** React Router, layout in `client/src/App.tsx`

---

## Wireframe

### Navigation

Left sidebar. Five sections:

```
┌─────────────────────────────┐
│  AWM Intelligence Hub       │
│  Goldman Sachs              │
├─────────────────────────────┤
│ ◉ Portfolio Intelligence    │  /
│ ○ Drift Analysis            │  /drift
│ ○ Document Intelligence     │  /documents
│ ○ Agent Orchestration       │  /agents
│ ○ Genie Chat                │  /genie
└─────────────────────────────┘
```

Active link styled with a dark GS-blue left border highlight (not background fill). Add a small advisor identity pill at the bottom of the sidebar:
```
┌─────────────────────────────┐
│  [avatar] James Chen        │
│  Managing Director, AWM     │
└─────────────────────────────┘
```

### Page 1: Portfolio Intelligence Dashboard (`/`)

Full-width bento grid. Top row is 4 KPI stat cards. Below is a 3-column grid of chart cards. Bottom row is a holdings table and an alerts feed.

```
┌──────────┬──────────┬──────────┬──────────┐
│  AUM     │ Perf vs  │ Alloc    │ Clients  │
│ $2.4B    │ Bench    │ Drift    │ At Risk  │
│          │ +1.8%    │ 3 assets │ 2        │
└──────────┴──────────┴──────────┴──────────┘

┌──────────────────┬──────────────┬───────────┐
│ Asset Allocation │ Performance  │ Top 10    │
│ (Donut chart)    │ vs Benchmark │ Holdings  │
│                  │ (Area chart) │ (Table)   │
│ PE   32%         │              │           │
│ HY   24%         │              │           │
│ EQ   20%         │              │           │
│ PC   18%         │              │           │
│ ETF   6%         │              │           │
└──────────────────┴──────────────┘           │
                                  └───────────┘

┌──────────────────────────┬──────────────────┐
│ Client Concentration     │ Active Alerts    │
│ Risk Heatmap             │ Feed             │
│ (table: client/asset     │                  │
│  class/IPS target delta) │ 🔴 Covenant risk │
│                          │ 🟡 Drift alert   │
└──────────────────────────┴──────────────────┘
```

Clicking any holding in the Top 10 Holdings table navigates to `/documents?holding=<id>`.  
Clicking the drift alert in the feed navigates to `/drift`.  
Clicking the covenant alert navigates to `/agents`.

### Page 2: Drift Analysis (`/drift`)

Three-section layout. Top is a summary bar showing advisor-level drift KPIs including dollar totals. Middle is a client table sorted by total dollars to rebalance to target. Bottom is per-account, per-asset-class detail for the selected client with both % and $ columns.

```
┌──────────────────────────────────────────────────────────────────────┐
│ DRIFT SUMMARY (advisor-level, from gold_app_drift_summary)           │
│                                                                      │
│ Accts Drifting │ Clients at Risk │ $ to Band (min) │ $ to Target     │
│      14        │       6         │    $1.2M        │    $4.7M        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT DRIFT TABLE (gold_app_client_drift, sorted by $ to Target)    │
│                                                                      │
│  Client              │  AUM    │ Breaches │ Worst Class │ $ to Band │ $ to Target │ Level│
│  ─────────────────── │ ─────── │ ──────── │ ─────────── │ ───────── │ ─────────── │ ──── │
│  ▶ Robert Weinstein  │  $48M   │    3     │ Priv Credit │  $480K    │   $2.1M     │  🔴  │
│  ▶ Sarah Chen        │  $31M   │    2     │ HY Bonds    │  $310K    │   $1.4M     │  🟡  │
│  ▶ James Park        │  $22M   │    1     │ Equities    │  $110K    │   $620K     │  🟡  │
│  ▶ ...               │         │          │             │           │             │      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ACCOUNT DETAIL — Robert Weinstein (gold_app_account_drift)                               │
│                                                                                          │
│  Account   │ Asset Class    │ Actual$ │ Target$ │ Actual% │ Tgt% │ Min% │ Max% │ Δ%  │ $ to Band │ $ to Target │ Status          │
│  ───────── │ ─────────────  │ ─────── │ ─────── │ ─────── │ ──── │ ──── │ ──── │ ─── │ ───────── │ ─────────── │ ─────────────── │
│  Acct 3821 │ Private Credit │ $11.5M  │  $7.2M  │   24%   │  15% │  10% │  20% │ +9% │  $192K    │   $4.3M     │ 🔴 OVER BAND    │
│  Acct 3821 │ HY Bonds       │  $8.6M  │  $9.6M  │   18%   │  20% │  15% │  25% │ -2% │    $0     │   -$960K    │ ✅ Within Band   │
│  Acct 7104 │ Private Credit │ $10.5M  │  $6.9M  │   23%   │  15% │  10% │  20% │ +8% │  $138K    │   $3.6M     │ 🔴 OVER BAND    │
│  Acct 7104 │ Equities       │ $14.7M  │ $18.4M  │   32%   │  40% │  35% │  50% │ -8% │  $138K    │  -$3.7M     │ 🟡 UNDER BAND   │
│  Acct 7104 │ Alt Assets     │  $2.1M  │   $0    │    5%   │   0% │   0% │   0% │ +5% │   $2.1M   │   $2.1M     │ 🔴 No IPS Target│
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Clicking a row in the client table expands the account detail panel below. URL param `?client=<client_id>` deep-links from the Portfolio page alerts feed.

**Column notes:**
- `$ to Band` — minimum trade to stop the breach (0 if Within Band)
- `$ to Target` — full trade to reach exact IPS target midpoint (positive = buy, negative = sell)
- `No IPS Target` rows — asset class not in client's risk profile; any balance here is unplanned exposure
**Drift badge legend:** 🔴 Over Band = actual > max IPS; 🟡 Under Band = actual < min IPS; ✅ Within Band = within tolerance; 🔴 No IPS Target = no allocation target exists for this asset class.

### Page 3: Document Intelligence (`/documents`)

Two-panel layout. Left panel is a document/holding selector. Right panel is the delta view.

```
┌─────────────────┬────────────────────────────────────────┐
│ HOLDINGS        │  [Holding name] — Document Delta       │
│                 │                                        │
│ ▶ Blackstone PE │  ┌─────────┬──────────┬─────────────┐  │
│   Strategic     │  │ KPI     │ Prior    │ Current     │  │
│   Capital IV    │  │ EBITDA  │ $242M    │ $228M ↓     │  │
│                 │  │ Cov Hdm │ 0.7x     │ 0.3x 🔴     │  │
│ ▶ Ares Capital  │  │ Lev Rat │ 4.2x     │ 4.8x ↑      │  │
│   Direct Lend   │  │ Rev Grw │ +12%     │ +7% ↓       │  │
│                 │  └─────────┴──────────┴─────────────┘  │
│ ▶ Apollo Global │                                        │
│   Hybrid Value  │  Covenant Health                       │
│                 │  [████████░░░░] 0.3x / 1.0x min       │
│ DOCUMENTS       │  ⚠ APPROACHING BREACH                  │
│                 │                                        │
│ 📄 10-K 2025    │  Management Tone                       │
│ 📄 Q3 Earnings  │  Positive ████ Neutral ██ Negative ██  │
│ 📄 CIM 2024     │  ↓ More cautious vs Q2                 │
│ 📄 Covenant     │                                        │
│    Compliance   │  Source Citations                      │
│                 │  "...covenant headroom has compressed  │
│                 │  from 0.7x to 0.3x as of Q3..." [p.47]│
│                 │  [10-K 2025 — p.47] [Earnings — p.12] │
└─────────────────┴────────────────────────────────────────┘
```

### Page 3: Agent Orchestration (`/agents`)

This is the "wow moment" page. It has a persistent alert banner at the top, a vertical cascade timeline in the center, and a human-in-the-loop action panel on the right.

```
┌─────────────────────────────────────────────────────────┐
│ 🔴 PROACTIVE ALERT — Covenant Breach Risk Detected     │
│ Blackstone PE Strategic Capital IV                      │
│ Covenant headroom compressed: 0.7x → 0.3x (Oct 2025)   │
└─────────────────────────────────────────────────────────┘

┌────────────────────────────┬────────────────────────────┐
│ AGENT CASCADE              │ HUMAN-IN-THE-LOOP          │
│                            │                            │
│ ✅ Agent 1: Research       │ Affected Clients (3)       │
│    Detected covenant       │ • Robert Weinstein — $48M  │
│    compression in 10-K     │ • Sarah Chen — $31M        │
│    filing. [View source]   │ • James Park — $22M        │
│         ↓                  │                            │
│ ✅ Agent 2: Portfolio      │ Draft Communication        │
│    Construction            │ ┌──────────────────────┐  │
│    Found 3 client accts    │ │ Dear Robert,         │  │
│    with exposure. $101M    │ │                      │  │
│    total.    [View list]   │ │ I wanted to proac-   │  │
│         ↓                  │ │ tively share an      │  │
│ ✅ Agent 3: Personalized   │ │ important update...  │  │
│    Communication           │ │                      │  │
│    Drafted 3 emails in     │ └──────────────────────┘  │
│    advisor tone. [Preview] │ [Edit] [Approve & Send]    │
│         ↓                  │                            │
│ ⏳ Awaiting Advisor        │ Re-Allocation Scenario     │
│    Approval                │ Reduce PC exposure 18%→14% │
│                            │ Reallocate to HY bonds     │
│ Audit Trail (Lakebase)     │ Est. impact: -0.3% risk    │
│ 3 runs · Last: 2 min ago   │ [Model Scenario]           │
└────────────────────────────┴────────────────────────────┘
```

The "Approve & Send" button writes a record to Lakebase and shows a success state. The audit trail section links to past agent runs.

### Page 4: Genie Chat (`/genie`)

Minimal chrome — just the Genie embed filling the main content area. Add a panel above the embed with example prompts styled as clickable chips.

```
┌─────────────────────────────────────────────────────────┐
│ Ask about your portfolio                                │
│ [Which clients are overweight PC vs IPS?]               │
│ [Holdings with covenant headroom < 0.5x?]               │
│ [Top 5 clients by AUM exposure to private credit]       │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                                                         │
│          [Genie embed — full height]                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Data Model

All data is generated via SQL WITH clauses in `config/queries/` — no external pipeline needed. The pattern from `mocked_sales.sql` applies: inline CTE with realistic values.

### SQL Query Files to Create

**`config/queries/portfolio_summary.sql`**  
Returns the 4 KPI stat cards: total AUM, performance vs benchmark, allocation drift count, clients at risk count.

**`config/queries/asset_allocation.sql`**  
Returns asset class breakdown for the donut chart. Columns: `asset_class`, `aum_billions`, `pct_of_portfolio`, `benchmark_pct`, `drift_pct`.

**`config/queries/performance_timeseries.sql`**  
Returns daily portfolio performance vs benchmark for area chart. Columns: `date`, `portfolio_return`, `benchmark_return`.

**`config/queries/top_holdings.sql`**  
Returns top 10 holdings for the table. Columns: `holding_id`, `name`, `asset_class`, `aum_millions`, `pct_of_portfolio`, `ytd_return`, `risk_flag` (none/watch/alert).

**`config/queries/concentration_risk.sql`**  
Returns client × asset class matrix for the risk heatmap. Columns: `client_name`, `asset_class`, `actual_pct`, `ips_target_pct`, `delta_pct`, `risk_level`.

**`config/queries/document_insights.sql`**  
Returns KPI delta table for a given holding. Columns: `kpi_name`, `prior_value`, `current_value`, `change_pct`, `flag` (up/down/alert). Parameterized by `:holding_id`.

**`config/queries/holdings_list.sql`**  
Returns the left panel holding list. Columns: `holding_id`, `name`, `asset_class`, `strategy`, `has_alert`.

### Lakebase Tables to Create (in `server/routes/`)

**`agent_runs`** — Audit trail for agent cascade executions.
```sql
CREATE TABLE IF NOT EXISTS app.agent_runs (
  id SERIAL PRIMARY KEY,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  holding_id TEXT NOT NULL,
  holding_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'covenant_breach', 'drift', etc.
  agents_completed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, approved, dismissed
  approved_by TEXT,
  approved_at TIMESTAMPTZ
);
```

**`client_communications`** — Drafted and approved advisor comms.
```sql
CREATE TABLE IF NOT EXISTS app.client_communications (
  id SERIAL PRIMARY KEY,
  agent_run_id INTEGER REFERENCES app.agent_runs(id),
  client_name TEXT NOT NULL,
  client_aum_millions NUMERIC,
  draft_body TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, approved, sent
  approved_at TIMESTAMPTZ
);
```

---

## Build Phases

---

### Phase 1: Rebrand & Layout

**Goal:** Replace the generic scaffolding with the AWM identity. Zero business logic yet.

**Files to modify:**

**`client/src/App.tsx`** — Complete rewrite.
- Change layout from top-nav header to left sidebar (`w-64 min-h-screen border-r`)
- App title: "AWM Intelligence Hub" with subtitle "Goldman Sachs"
- Four nav links: Portfolio Intelligence (`/`), Document Intelligence (`/documents`), Agent Orchestration (`/agents`), Genie Chat (`/genie`)
- Advisor identity pill at bottom of sidebar: "James Chen / Managing Director, AWM"
- Main content area takes remaining width (`flex-1`)
- Delete the FilesPage route and import — not used in this demo
- Create stub page components for all 4 routes (one line of text each to confirm routing works)

**`client/src/pages/`** — Create new directory structure:
```
client/src/pages/
  portfolio/PortfolioPage.tsx      (replaces analytics/)
  documents/DocumentsPage.tsx      (new)
  agents/AgentsPage.tsx            (new)
  genie/GeniePage.tsx              (keep existing, wrap with example prompts)
```

**Acceptance criteria:** `npm run dev` shows a sidebar app with 4 nav links, each navigating to a stub page. No console errors.

---

### Phase 2: Portfolio Intelligence Dashboard

**Goal:** Build the full dashboard with mock SQL data driving all charts and tables.

**SQL files to create first** (in `config/queries/`):

`portfolio_summary.sql` — single row with 4 columns: `total_aum`, `perf_vs_bench`, `drift_count`, `clients_at_risk`.

`asset_allocation.sql` — 5 rows for: Private Equity (32%), High Yield (24%), Public Equities (20%), Private Credit (18%), ETFs (6%). Include `benchmark_pct` and compute `drift_pct` as the delta.

`performance_timeseries.sql` — Daily data for Jan 1–Nov 30, 2025, `portfolio_return` and `benchmark_return` as cumulative YTD percentages. Uses date sequence with realistic AWM numbers — portfolio consistently outperforms benchmark.

`top_holdings.sql` — 10 rows. Mix of PE (Blackstone, Apollo, KKR), HY bonds (Ford Motor Credit, HCA Healthcare), Private Credit (Ares, Owl Rock), Public Equities (Apple, Microsoft, NVIDIA), ETFs. Include a `risk_flag` column: set 'alert' on the Blackstone PE entry (covenant issue), 'watch' on one HY bond.

`concentration_risk.sql` — 5 clients × 5 asset classes. Robert Weinstein is overweight PC relative to IPS target (actual 24% vs target 15% = +9%). Make 2-3 other cells moderately over/under.

**Component to build:** `client/src/pages/portfolio/PortfolioPage.tsx`

Layout structure:
1. Page header: "Portfolio Intelligence" h2 + "James Chen · Managing Director, AWM · As of Nov 2025" subtitle
2. KPI stat row: 4 `<StatCard>` components. Each card: label, value, sub-label with colored delta. Wire to `portfolio_summary` query.
3. Bento grid row 1: 3 columns
   - Col 1: Asset Allocation — use a custom SVG donut or a simple colored bar stack. Wire to `asset_allocation` query.
   - Col 2 (span 2): Performance vs Benchmark — use `AreaChart` from AppKit. Wire to `performance_timeseries` query. Two series: `portfolio_return` and `benchmark_return`.
4. Bento grid row 2: 2 columns
   - Col 1 (span 2): Top Holdings table. Columns: Name, Asset Class, AUM ($M), % Portfolio, YTD Return, Risk. The Risk column renders a colored badge: 🔴 Alert / 🟡 Watch / — None. Each row is clickable; clicking navigates to `/documents?holding=<holding_id>`.
   - Col 2: Active Alerts feed. Hard-coded 2 alerts for now: a red covenant risk alert (Blackstone) and a yellow drift alert (Private Credit). Clicking covenant alert navigates to `/agents`. Both are styled as clickable list items with an icon, title, and "2 min ago" timestamp.

**Acceptance criteria:** Dashboard renders with real data from SQL warehouse. Clicking a holding navigates to Documents page. Clicking the covenant alert navigates to Agents page. Clicking the drift alert navigates to `/drift`.

---

### Phase 2.5: Drift Analysis (`/drift`)

**Goal:** Surface IPS drift at every level of granularity — advisor-wide summary → client-level breach scores → per-account, per-asset-class band violations with full dollar context. The advisor should immediately know: which accounts are out of band, by how much in dollars, and exactly how much to trade to fix it.

**Drift exists at three granularities:**
- **Advisor level** (portfolio-wide): total drifting accounts, clients at risk, total dollars to rebalance to target
- **Client level**: breach count, worst asset class, total `rebalance_to_target` across all their accounts
- **Account + asset class level**: actual vs. target vs. band (all in both % and $), `rebalance_to_band` (min trade), `rebalance_to_target` (full trade)

**Key dollar distinctions:**
- `rebalance_to_band` — minimum trade to get back inside IPS fence (stop the breach)
- `rebalance_to_target` — full trade to hit exact IPS midpoint target (full rebalance)
- Accounts with no IPS target for an asset class → `target_dollars = 0`; any holdings there are drift by definition

**SQL files to create** (all backed by `gold_app_account_drift`):

`drift_summary.sql` — Single row per advisor. Columns: `drifting_accounts`, `clients_at_risk`, `worst_asset_class`, `total_rebalance_to_band`, `total_rebalance_to_target`. Queries `gold_app_drift_summary WHERE advisor_id = :advisor_id`.

`client_drift.sql` — One row per client for this advisor. Columns: `client_id`, `client_name`, `total_aum_millions`, `breach_count`, `worst_asset_class`, `total_rebalance_to_band`, `total_rebalance_to_target`, `drift_level` (high/medium/low). Sorted by `total_rebalance_to_target` desc. Queries `gold_app_client_drift WHERE advisor_id = :advisor_id`.

`account_drift.sql` — Per-account, per-asset-class rows with full dollar columns. Parameterized by `:advisor_id` + optional `:client_id`. Queries `gold_app_account_drift`. Returns all columns from the spec below.

**Gold tables to build** (add to data notebook, build in this order):

1. `gold_app_account_drift` — materialize the `gold_ips_drift` view + extend with dollar columns. Full spec in the **column table above**. This is the foundation; the other two aggregate from it.

2. `gold_app_client_drift` — `SELECT ... FROM gold_app_account_drift GROUP BY advisor_id, client_id`. Aggregates: `SUM(rebalance_to_band)`, `SUM(ABS(rebalance_to_target))`, `COUNT(DISTINCT account_id) FILTER (drift_status != 'Within Band')` as `breach_count`, `worst_asset_class` (asset_class with max `ABS(delta_dollars)`).

3. `gold_app_drift_summary` — `SELECT ... FROM gold_app_client_drift GROUP BY advisor_id`. Aggregates: `COUNT(DISTINCT account_id with breach)`, `COUNT(DISTINCT client_id with breach)`, `worst_asset_class`, `SUM(total_rebalance_to_band)`, `SUM(total_rebalance_to_target)`.

**Component to build:** `client/src/pages/drift/DriftPage.tsx`

Layout:
1. Page header: "Drift Analysis" h2 + advisor subtitle
2. Summary bar: 4 KPI stat cards — `drifting_accounts`, `clients_at_risk`, `total_rebalance_to_band` (formatted as $M), `total_rebalance_to_target` (formatted as $M). Wire to `drift_summary` query.
3. Client drift table (full width): sortable columns. Default sort: `total_rebalance_to_target` desc. Columns: Client Name, AUM ($M), # Breaches, Worst Asset Class, $ to Band, $ to Target, Drift Level badge (🔴 High / 🟡 Medium / ✅ Low). Clicking a row sets `selectedClientId` and scrolls to account drill-down. URL param `?client=<client_id>` deep-links from Portfolio alerts.
4. Account drill-down section: shown when a client is selected. Header: "[Client Name] — Account & Asset Class Detail". 
   - Table columns: Account, Asset Class, Actual $, Actual %, Target %, Min %, Max %, Δ%, Δ$, $ to Band, $ to Target, Status badge.
   - "Over Band" rows: red background tint. "Under Band": amber. "Within Band": default.
   - Rows where `target_pct = 0` but `actual_dollars > 0`: show status as "No IPS Target" in muted red — this asset class is not in the IPS at all.
   - Wire to `account_drift` query filtered by `client_id`.

**Acceptance criteria:** Page loads with advisor's drift summary including dollar totals. Client table shows all clients sorted by dollar impact. Clicking a client expands account detail with both % and $ columns. `$ to Band` and `$ to Target` are distinct — band is always smaller or equal. Accounts with no target for an asset class show "No IPS Target" status with $0 target.

---

### Phase 3: Document Intelligence

**Goal:** Two-panel document delta view. Left panel selects a holding; right panel shows the KPI delta table, covenant health gauge, management tone bar, and source citations.

**SQL files to create:**

`holdings_list.sql` — Returns all holdings for the left panel. Columns: `holding_id` (text slug), `name`, `asset_class`, `strategy`, `has_alert` (boolean). The Blackstone entry has `has_alert = true`.

`document_insights.sql` — Parameterized by `:holding_id`. Returns KPI rows. For the Blackstone entry (`holding_id = 'blackstone-pe-sc4'`) return:
- EBITDA: prior $242M, current $228M, change -5.8%, flag 'down'
- Covenant Headroom: prior 0.7x, current 0.3x, change -57%, flag 'alert'
- Leverage Ratio: prior 4.2x, current 4.8x, change +14.3%, flag 'down'
- Revenue Growth: prior 12%, current 7%, change -41.7%, flag 'down'
- Interest Coverage: prior 3.1x, current 2.4x, change -22.6%, flag 'alert'

For all other holdings, return benign data (all flags 'neutral' or 'up').

**Component to build:** `client/src/pages/documents/DocumentsPage.tsx`

Layout:
- Read `?holding` from URL search params to set the initially selected holding.
- Left panel (`w-64 border-r overflow-y-auto`): List of holdings from `holdings_list` query. Each row shows name, asset class badge, and a red dot if `has_alert`. Click sets selected holding and updates URL param.
- Right panel (`flex-1 p-6`): 
  - Header: holding name + asset class badge
  - KPI Delta Table: 5 rows. Columns: KPI, Prior Period, Current Period. The "Current Period" column renders colored text: red for 'alert', orange for 'down', green for 'up'.
  - Covenant Health section: heading + a horizontal progress bar. Value is the `current_value` from the covenant headroom row (0.3x). Show a `/ 1.0x minimum` label. Color the bar red if < 0.5, yellow if 0.5–0.8, green if > 0.8. Below the bar show "⚠ APPROACHING BREACH" in red if < 0.5.
  - Management Tone section: a horizontal stacked bar (Positive / Neutral / Negative). Hard-code values per holding: for Blackstone use 35% positive, 30% neutral, 35% negative. For others use 60% positive.
  - Source Citations section: hard-coded for each holding. For Blackstone, show 2 citations as clickable pills: "10-K 2025 — p.47" and "Q3 Earnings — p.12". Each citation has a snippet of quoted text below it in `text-muted-foreground`. For other holdings, show generic citations.

**Acceptance criteria:** Clicking a holding in the left panel updates the right panel. Navigating from the Portfolio page (`/documents?holding=blackstone-pe-sc4`) auto-selects Blackstone and shows the red covenant alert data.

---

### Phase 4: Agent Orchestration

**Goal:** The wow moment page. Auto-fires an alert cascade on mount, animates agent steps completing, and presents a human-in-the-loop approval panel writing to Lakebase.

**Backend route to create:** `server/routes/agents/agent-routes.ts`

Expose two Express routes:
- `GET /api/agents/cascade` — Returns the current cascade state. On first call, returns a hard-coded cascade payload (see structure below). Simulates the agents having already run.
- `POST /api/agents/approve` — Body: `{ agent_run_id, action: 'approve' | 'dismiss' }`. Writes to Lakebase `app.agent_runs` (UPDATE status) and `app.client_communications` (UPDATE status). Returns `{ success: true }`.

Cascade payload shape:
```typescript
{
  run_id: number,
  holding_name: string,
  triggered_at: string,
  trigger: string, // "Covenant headroom compressed: 0.7x → 0.3x"
  agents: [
    { id: 1, name: "Research Agent", status: "complete", summary: "...", detail: "..." },
    { id: 2, name: "Portfolio Construction Agent", status: "complete", summary: "...", detail: "..." },
    { id: 3, name: "Client Personalization Agent", status: "complete", summary: "...", detail: "..." },
  ],
  affected_clients: [
    { name: "Robert Weinstein", aum_millions: 48, tier: "UHNW" },
    { name: "Sarah Chen", aum_millions: 31, tier: "UHNW" },
    { name: "James Park", aum_millions: 22, tier: "HNW" },
  ],
  draft_communication: "Dear [Client],\n\nI wanted to proactively share...",
  reallocation_scenario: {
    from_asset: "Private Credit",
    from_pct: 18,
    to_asset: "High Yield Bonds",
    to_pct: 14,
    risk_impact: "-0.3%"
  },
  status: "pending"
}
```

Wire up the Lakebase tables (from the schema above) in `server/server.ts` — create them on startup via `appkit.lakebase.query()` and seed one pending `agent_run` row if the table is empty.

**Component to build:** `client/src/pages/agents/AgentsPage.tsx`

State: `cascadeData` (fetched from `/api/agents/cascade`), `approved` (boolean), `selectedClient` (index 0 by default).

Layout:
- Alert banner: full-width red/amber card at top. Shows holding name, trigger description, timestamp. Pulsing red dot on the left.
- Two-column body:
  - Left: Agent Cascade Timeline. Vertical list of 3 agents. Each agent step: numbered circle (green checkmark when complete), agent name as bold, one-line summary, and a "View details" toggle that expands the `detail` string. Steps animate in with a 300ms stagger on mount (use CSS transitions or framer-motion if available — if not, use a simple `setTimeout`-driven show state).
  - Right: Human-in-the-loop panel.
    - "Affected Clients" section: list of 3 clients with name, AUM, tier badge.
    - Client selector tabs: clicking a client tab updates the draft communication shown below.
    - Draft Communication: a `<textarea>` pre-filled with `draft_communication` (editable). Add a per-client salutation prepended dynamically.
    - "Re-Allocation Scenario" card: shows the from/to asset class and risk impact. A "Model Scenario" button (navigates to `/` for now).
    - Action buttons: "Approve & Send" (primary) and "Dismiss" (outline). On Approve: POST to `/api/agents/approve`, then show a success state — green checkmark, "Communications queued for 3 clients. Audit record saved."
- Audit trail footer: "3 cascade runs · Last: 2 minutes ago · [View history]"

**Acceptance criteria:** Page loads with cascade pre-populated. Agent steps animate in on load. Approve button hits the backend, writes to Lakebase, and shows success state. Dismiss does the same with `action: 'dismiss'`.

---

### Phase 5: Genie Chat

**Goal:** Keep the existing Genie embed but wrap it with AWM framing.

**File to modify:** `client/src/pages/genie/GeniePage.tsx`

Changes:
- Add a header: "Portfolio Genie" h2 + "Ask questions about your clients, positions, and risk — powered by Unity Catalog-governed data" subtitle.
- Add a row of example prompt chips above the embed. Chips are styled as `cursor-pointer border rounded-full px-3 py-1 text-sm hover:bg-muted` buttons. Clicking a chip should copy the text to clipboard and show a brief "Copied — paste into chat" tooltip. Three chips:
  - "Which of my top 20 clients are overweight private credit vs. IPS target?"
  - "Show all holdings with covenant headroom under 0.5x"
  - "Top 5 clients by total AUM exposure to alternatives"
- The existing `<GenieEmbed>` component from AppKit fills the rest of the page height.

**Acceptance criteria:** Genie page shows header, 3 chips, and the embedded Genie chat iframe. Clicking a chip copies text to clipboard.

---

### Phase 6: Polish

**Goal:** Visual coherence, error states, loading skeletons, and GS-appropriate styling.

**Color palette** — Add to `client/src/index.css` as CSS variables alongside the existing Tailwind theme:
- Primary accent: `#1a3a5c` (dark GS navy)
- Alert red: `#c0392b`
- Watch amber: `#d68910`
- Safe green: `#1e8449`
- Sidebar background: `#f8f9fa`

**Global changes:**
- All `<Card>` components should have `shadow-sm border border-border/50` — subtle, not heavy.
- All page headers: `text-2xl font-semibold tracking-tight text-foreground`.
- Loading states: use `<Skeleton>` from AppKit for every data-driven section. Each query should show skeletons until data arrives.
- Error states: every `useAnalyticsQuery` call has an `{error && ...}` block with a styled error card.
- Empty states: if `top_holdings` returns 0 rows, show a centered "No holdings found" message.

**Navigation polish:**
- Active sidebar link: left border `border-l-4 border-primary bg-primary/5` instead of filled background.
- Add a GS wordmark or simple "GS" monogram in the sidebar header.
- Sidebar footer advisor pill: small avatar circle (initials "JC" in dark background), name, role.

**Responsive consideration:**
- On screens < 1024px, sidebar collapses to icon-only mode (show only icons, no text). This is optional but noted.

**Acceptance criteria:** App looks polished enough for a demo. No layout breaks. All loading states work. Error states are graceful. Color palette feels financial / institutional.

---

## File Inventory After Build

```
client/src/
  App.tsx                                    ← rewritten (sidebar layout, 6 routes + MorningBriefingBell + PortfolioAssistant)
  index.css                                  ← GS color vars
  appKitTypes.d.ts                           ← auto-generated; all query registry types
  data/
    prefab-prompts.ts                        ← pre-cached chat responses (3-layer answer cache)
  contexts/
    AdvisorContext.tsx                       ← advisor state, useAdvisor() hook
  components/
    MorningBriefingBell.tsx                  ← notification bell (morning_briefings query)
    PortfolioAssistant.tsx                   ← floating/docked chat panel
    chat/
      AdvisorChat.tsx                        ← chat UI shell
      ChatHistory.tsx                        ← message history list
      MessageBubble.tsx                      ← individual message with streaming
      PromptChips.tsx                        ← pre-baked chip buttons
      exportChatPdf.ts                       ← PDF export
      types.ts                              ← chat message types
      useChatStore.ts                        ← Zustand chat state
      useMasChat.ts                          ← MAS-style streaming hook
  pages/
    portfolio/
      PortfolioPage.tsx                      ← bento dashboard; uses alerts.sql (live)
    drift/
      DriftPage.tsx                          ← drift analysis, 3-level granularity
    documents/
      DocumentsPage.tsx                      ← two-panel; uses holding_documents + alert_citations
    agents/
      AgentsPage.tsx                         ← cascade + approval; real client comms
    genie/
      GeniePage.tsx                          ← Genie embed + prompt chips
    tech-stack/
      TechStackPage.tsx                      ← NEW (card grid with workspace deep-links)

config/queries/
  portfolio_summary.sql                      ← live (+ qtd_aum_change)
  asset_allocation.sql                       ← live
  performance_timeseries.sql                 ← live
  top_holdings.sql                           ← live
  concentration_risk.sql                     ← live (asset_class × risk_profile schema)
  advisors.sql                               ← live
  holdings_list.sql                          ← live (aum replaces has_alert)
  company_fundamentals.sql                   ← live (gold_app_company_fundamentals)
  management_tone.sql                        ← live (extended section-level schema)
  source_citations.sql                       ← mock CTE (holding_id keyed)
  account_drift.sql                          ← live (gold_account_ips_drift)
  client_communications.sql                  ← live (app_client_communications)
  alerts.sql                                 ← NEW live (gold_app_alerts + JOIN gold_unified_signals)
  alert_citations.sql                        ← NEW mock CTE (ticker-keyed snippets)
  morning_briefings.sql                      ← NEW live (app_morning_briefings)
  holding_documents.sql                      ← NEW live (gold_app_documents)
  drift_summary.sql                          ← computed client-side for now
  client_drift.sql                           ← computed client-side for now

server/
  server.ts                                  ← Lakebase table creation on startup
  routes/
    lakebase/todo-routes.ts                  ← audit trail tables
    portfolio-chat.ts                        ← NEW streaming Claude API chat endpoint
```

---

## Execution Order

Build in this order — each phase is independently testable:

1. **Phase 1** — Sidebar layout + stub pages (no data yet) ✅
2. **Phase 2** — Portfolio dashboard (SQL queries + charts) ✅
3. **Phase 2.5** — Drift Analysis page (3 new gold tables → 3 SQL files → DriftPage UI) ✅
4. **Phase 3** — Document Intelligence (SQL query + two-panel UI) ✅
5. **Phase 3.5** — Portfolio Assistant chat + prefab prompt cache ✅
6. **Phase 3.6** — Morning Briefing Bell (live `app_morning_briefings`) ✅
7. **Phase 3.7** — Tech Stack page (`/tech-stack`) ✅
8. **Phase 4** — Agent Orchestration (real client comms from `app_client_communications`) ✅
9. **Phase 5** — Genie chat framing ✅
10. **Phase 6** — Polish (GS navy, loading states, empty states) ✅ (partial)

Run `npm run dev` after each phase to verify before proceeding.

---

## Demo Script Notes (for reference, not to build)

The live demo flow:

1. Open app → Portfolio Dashboard loads instantly showing $2.4B AUM, +1.8% vs benchmark. Bento grid shows full picture.
2. Notice the yellow drift alert in the Alerts feed ("Private Credit above IPS target"). Click it → lands on Drift Analysis.
3. Drift Analysis shows 14 drifting accounts, 6 clients at risk. Robert Weinstein is #1 sorted by breach severity — 3 breaches, Private Credit 9% over IPS band.
4. Click Weinstein → account drill-down shows two accounts, each with Private Credit in the red "Over Band" zone with actual vs. target vs. min/max bands.
5. Narrator: "The advisor can see exactly which accounts need rebalancing before any client call."
6. Click back to dashboard → notice the red "Alert" badge on Blackstone in the holdings table. Click it → lands on Document Intelligence.
7. Right panel shows covenant headroom compressed from 0.7x → 0.3x. Red gauge bar. "APPROACHING BREACH."
8. Narrator: "The system read the filing — the advisor didn't."
9. Click back to dashboard → click the red covenant alert in the feed → lands on Agent Orchestration.
10. Agent cascade is already complete. Three agents ran in the background. Three clients identified. Three draft emails ready.
11. Advisor reviews Robert Weinstein's draft communication (same client from step 3). Clicks "Approve & Send." Green success state.
12. Narrator: "Before the advisor opened their laptop, the system already diagnosed the risk, identified the clients, and drafted the response."
13. Switch to Genie tab. Type (or click chip): "Which of my top 20 clients are overweight private credit vs. IPS target?"
14. Genie returns a table with Robert Weinstein at the top — the same client from step 3 and 11. Closes the loop.
