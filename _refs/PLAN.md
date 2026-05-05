# AWM Unified Wealth Intelligence Hub — Build Plan

**Demo:** Goldman Sachs EBC 5/12/26 — Demo 1  
**Audience:** GS Scale AWM leaders (Sara Naison-Tarajano, Kristin Olson, Bryon Lake, Greg Calnon, James Reynolds, Michael Bruun)  
**Narrative:** A wealth advisor arrives at their desk to a single intelligent workspace unifying every product, position, and client signal across all asset classes — instead of toggling between siloed systems.

---

## Progress Checklist

### Wireframe
- [x] Sidebar navigation — GS identity, 4 nav links, active left-border style, advisor picker dropdown
- [x] Page 1: Portfolio Intelligence Dashboard
  - [x] 4 KPI stat cards (AUM, Perf vs Benchmark, Allocation Drift, Clients at Risk)
  - [x] Asset Allocation donut chart (`asset_allocation.sql`)
  - [x] Performance vs Benchmark area chart (`performance_timeseries.sql`)
  - [x] Top 10 Holdings table with risk badges, clickable rows → `/documents`
  - [x] Active Alerts feed — covenant alert → `/agents`, drift alert → `/documents`
  - [x] Client Concentration Risk heatmap (`concentration_risk.sql`)
- [x] Page 2: Document Intelligence
  - [x] Left panel: holdings list with asset-class badges and alert dot
  - [x] Left panel: document list (10-K, Earnings, CIM, Covenant)
  - [x] KPI delta table with flag indicators
  - [x] Covenant health gauge with APPROACHING BREACH warning
  - [x] Management tone stacked bar
  - [x] Source citations with quoted snippets
  - [x] URL param sync (`?holding=<id>`) from Portfolio page
- [x] Page 3: Agent Orchestration
  - [x] Proactive alert banner with pulsing red dot
  - [x] Agent cascade timeline with staggered animation (3 agents)
  - [x] Expandable agent detail panels
  - [x] Affected clients selector (3 clients, tab-style)
  - [x] Editable draft communication textarea (per-client)
  - [x] Approve & Send → success state with checkmark
  - [x] Re-allocation scenario card
  - [x] Audit trail footer
- [x] Page 4: Genie Chat — full-width embed (removed max-w constraint)

### Phase 2: Data & SQL
- [x] `portfolio_summary.sql`
- [x] `asset_allocation.sql`
- [x] `performance_timeseries.sql` — **daily** (not monthly); queries `gold_app_performance_timeseries`
- [x] `top_holdings.sql`
- [x] `concentration_risk.sql`
- [x] `advisors.sql` — new; populates sidebar advisor picker
- [x] `holdings_list.sql`
- [x] `document_insights.sql` (parameterized by `:holding_id`)
- [x] `management_tone.sql` (parameterized by `:holding_id`) — mock CTE, needs real data migration
- [x] `source_citations.sql` (parameterized by `:holding_id`) — mock CTE, needs real data migration

#### Gold App Tables — `ahtsa.awm`

All Portfolio Intelligence queries are backed by pre-computed `gold_app_*` tables that cover **all advisors**. The app filters to a single advisor at query time via `:advisor_id`.

| Gold table | Built from | Notes |
|---|---|---|
| `gold_app_portfolio_summary` | `clients`, `silver_advisor_daily_returns`, `gold_ips_drift`, `accounts` | Latest alpha from silver; COALESCE 0 for advisors with no drift/risk |
| `gold_app_asset_allocation` | `holdings → accounts → clients` | Window SUM partitioned by `advisor_id` |
| `gold_app_performance_timeseries` | `silver_advisor_daily_returns` | All trading days (daily); no month-end aggregation |
| `gold_app_top_holdings` | `holdings`, `bronze_historical_prices`, `gold_unified_signals`, `bronze_company_profiles` | Top-10 per advisor; risk_flag from last-30-day signals |
| `gold_app_concentration_risk` | `gold_ips_drift`, `clients` | Top-5 clients by AUM per advisor |

> **Notebook:** `/Workspace/Users/andrew.tolbert@databricks.com/gs-awm-demo/9_scratchpad/app_queries/portfolio_intelligence_queries`  
> Run all cells to rebuild every gold table across all advisors.

#### SQL Migration Tracker — `ahtsa.awm` Real Data

| Query file | Page / Widget | Migrated? |
|---|---|---|
| `portfolio_summary.sql` | Portfolio — 4 KPI stat cards | ✅ Live — queries `gold_app_portfolio_summary WHERE advisor_id = :advisor_id` |
| `asset_allocation.sql` | Portfolio — Asset Allocation donut chart | ✅ Live — queries `gold_app_asset_allocation WHERE advisor_id = :advisor_id` |
| `performance_timeseries.sql` | Portfolio — Performance vs Benchmark (daily) | ✅ Live — queries `gold_app_performance_timeseries WHERE advisor_id = :advisor_id` |
| `top_holdings.sql` | Portfolio — Top 10 Holdings table | ✅ Live — queries `gold_app_top_holdings WHERE advisor_id = :advisor_id` |
| `concentration_risk.sql` | Portfolio — Client Concentration Risk heatmap | ✅ Live — queries `gold_app_concentration_risk WHERE advisor_id = :advisor_id` |
| `advisors.sql` | Sidebar — advisor picker dropdown | ✅ Live — queries `ahtsa.awm.advisors ORDER BY rank_order` |
| `holdings_list.sql` | Documents — left-panel holdings selector | ☐ Still mock CTE |
| `document_insights.sql` | Documents — KPI delta table (`:holding_id` param) | ☐ Still mock CTE |
| `management_tone.sql` | Documents — Management Tone bar | ☐ Mock CTE → real source: `vs_earnings_transcripts` (sentiment scores per ticker/quarter) |
| `source_citations.sql` | Documents — Source Citations | ☐ Mock CTE → real source: `vs_sec_filings` + `vs_signals` (chunk text + page refs) |

### Phase 2.5: Advisor Context & Filtering
- [x] `ahtsa.awm.advisors` table exists with `advisor_id`, `full_name`, `title`, `email`, `rank_order`, initials derivable from `first_name`/`last_name`
- [x] `AdvisorContext.tsx` — fetches all advisors, holds selected `advisor_id` in state, exposes `params` object and `setAdvisorId`
- [x] Sidebar `AdvisorPicker` — `<select>` dropdown populated from `advisors` query; switching advisor re-runs all queries instantly
- [x] `PortfolioPage` wired to `useAdvisor()` — zero hardcoded advisor IDs in component code
- [ ] Wire `useAdvisor()` into `DocumentsPage` (holdings_list, document_insights queries when migrated)

### Phase 3: Backend & Lakebase
- [ ] `server/routes/agents/agent-routes.ts` — `GET /api/agents/cascade`, `POST /api/agents/approve`
- [ ] Lakebase `app.agent_runs` table creation on server startup
- [ ] Lakebase `app.client_communications` table creation on server startup
- [ ] Seed one pending agent run on first boot
- [ ] Wire approve/dismiss to actual Lakebase writes

### Phase 4: Polish
- [ ] GS color palette CSS variables (`#1a3a5c`, alert red, amber, green)
- [ ] Loading skeletons on all data-driven sections
- [ ] Error states on all `useAnalyticsQuery` calls
- [ ] Empty states (0 holdings, 0 alerts)
- [ ] Nav active style refinement
- [ ] Responsive sidebar (icon-only on < 1024px) — optional

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

Left sidebar (replace current top-nav header). Four sections:

```
┌─────────────────────────────┐
│  AWM Intelligence Hub       │
│  Goldman Sachs              │
├─────────────────────────────┤
│ ◉ Portfolio Intelligence    │  /
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
Clicking an alert in the feed navigates to `/agents`.

### Page 2: Document Intelligence (`/documents`)

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

**Acceptance criteria:** Dashboard renders with real data from SQL warehouse. Clicking a holding navigates to Documents page. Clicking the covenant alert navigates to Agents page.

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
  App.tsx                                    ← rewritten (sidebar layout, 4 routes)
  index.css                                  ← add GS color vars
  pages/
    portfolio/
      PortfolioPage.tsx                      ← new (bento dashboard)
      components/
        StatCard.tsx                         ← new (KPI card)
        AssetAllocationChart.tsx             ← new (donut/bar)
        HoldingsTable.tsx                    ← new (clickable rows)
        AlertsFeed.tsx                       ← new
    documents/
      DocumentsPage.tsx                      ← new (two-panel)
      components/
        HoldingsList.tsx                     ← new (left panel)
        KpiDeltaTable.tsx                    ← new
        CovenantGauge.tsx                    ← new
        ToneBar.tsx                          ← new
        CitationPanel.tsx                    ← new
    agents/
      AgentsPage.tsx                         ← new (cascade + approval)
      components/
        AlertBanner.tsx                      ← new
        AgentTimeline.tsx                    ← new
        ClientPanel.tsx                      ← new
        DraftCommunication.tsx               ← new
        ReallocationScenario.tsx             ← new
    genie/
      GeniePage.tsx                          ← modified (header + prompt chips)

config/queries/
  portfolio_summary.sql                      ← new
  asset_allocation.sql                       ← new
  performance_timeseries.sql                 ← new
  top_holdings.sql                           ← new
  concentration_risk.sql                     ← new
  holdings_list.sql                          ← new
  document_insights.sql                      ← new (parameterized)

server/
  server.ts                                  ← add agent_runs + client_comms table creation
  routes/
    lakebase/todo-routes.ts                  ← keep (used for audit trail tables)
    agents/agent-routes.ts                   ← new
```

---

## Execution Order

Build in this order — each phase is independently testable:

1. **Phase 1** — Sidebar layout + stub pages (no data yet)
2. **Phase 2** — Portfolio dashboard (SQL queries + charts)
3. **Phase 3** — Document Intelligence (SQL query + two-panel UI)
4. **Phase 4** — Agent Orchestration (backend route + Lakebase + approval UI)
5. **Phase 5** — Genie chat framing (minimal changes to existing page)
6. **Phase 6** — Polish (CSS vars, skeletons, error states, nav styling)

Run `npm run dev` after each phase to verify before proceeding.

---

## Demo Script Notes (for reference, not to build)

The live demo flow:

1. Open app → Portfolio Dashboard loads instantly showing $2.4B AUM, +1.8% vs benchmark. Bento grid shows full picture.
2. Notice the red "Alert" badge on Blackstone in the holdings table. Click it → lands on Document Intelligence.
3. Right panel shows covenant headroom compressed from 0.7x → 0.3x. Red gauge bar. "APPROACHING BREACH."
4. Narrator: "The system read the filing — the advisor didn't."
5. Click back to dashboard → click the red covenant alert in the feed → lands on Agent Orchestration.
6. Agent cascade is already complete. Three agents ran in the background. Three clients identified. Three draft emails ready.
7. Advisor reviews Robert Weinstein's draft communication. Clicks "Approve & Send." Green success state.
8. Narrator: "Before the advisor opened their laptop, the system already diagnosed the risk, identified the clients, and drafted the response."
9. Switch to Genie tab. Type (or click chip): "Which of my top 20 clients are overweight private credit vs. IPS target?"
10. Genie returns a table with Robert Weinstein at the top — the same client from step 7. Closes the loop.
