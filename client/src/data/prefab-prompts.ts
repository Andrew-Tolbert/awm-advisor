// Pre-cached responses for the chat assistant's auto-click prompt chips.
//
// These are served instantly when a user clicks a chip (or types one of these
// prompts verbatim), bypassing the live model call. Free-typed prompts that
// don't match an entry here still hit /api/portfolio-chat and stream live.
//
// To refresh a cached response: send the prompt to the running endpoint and
// paste the assembled `delta` text into the matching `cached` field. e.g.:
//
//   curl -sN -X POST http://localhost:8000/api/portfolio-chat \
//     -H "Content-Type: application/json" \
//     -d '{"messages":[{"role":"user","content":"<the prompt>"}]}'
//
// Add new chip sets by adding a new key under PREFAB_PROMPTS (one set per
// chat surface). Lookup is case- and whitespace-insensitive.

export interface PrefabPrompt {
  prompt: string;
  cached: string;
}

export const PREFAB_PROMPTS: Record<string, PrefabPrompt[]> = {
  advisor: [
    {
      prompt: 'Top portfolio risks across all asset classes right now',
      cached: `**Equity concentration in CEO succession and AI monetization uncertainty is the dominant risk right now.**

3,944 high-severity surprise disclosure signals and 1,801 earnings miss alerts require immediate review. Apple's CEO transition (Tim Cook → John Ternus) has generated 248 distinct succession-related signals flagged for action, compounding execution risk on AI strategy at a time when the company already lags peers in generative AI monetization.

**Portfolio Exposure Breakdown**

**Equity – Highest Alert Volume**
- **Surprise Disclosure**: 3,944 action-required signals (0.9 severity) — Q&A sessions surfacing unexpected risks
- **M&A**: 2,630 signals — integration and regulatory risk across the book
- **Earnings Miss**: 1,801 signals — forward guidance pressure concentrated in growth names
- **Management Change**: 1,094 signals — succession risk beyond Apple (multi-company wave)
- **Guidance Pressure**: 975 signals — margin compression and demand uncertainty

**Private Credit – Credit Stress Accelerating**
- **Credit Event**: 448 signals (0.9 severity) — non-accruals, defaults, or restructurings in BDC portfolios
- **Credit Stress Probe**: 409 signals — analyst questions on portfolio quality, PIK income, and covenant breaches
- **Private Credit Health**: 100 medium-severity (0.85) signals on NAV trajectory, PIK-to-NII ratio, dividend coverage, and unrealized depreciation

**Thematic Risks**
- **Magnificent 7 Earnings Concentration**: 237 signals on simultaneous hyperscaler earnings creating single-week portfolio volatility (late April)
- **AI CapEx ROI Uncertainty**: Multiple signals questioning whether $100B+ in AI infrastructure spend will translate to revenue growth
- **Geopolitical Oil Shock**: 123 signals linking Middle East supply disruption to mega-cap earnings catalyst week
- **Berkshire Position Exits**: 124 signals on systematic reduction in BAC and other financials under new CEO Greg Abel

**Heads Up**
Private credit health metrics (PIK-to-NII, unrealized depreciation) are showing 100 medium-severity warnings — if any of your overweight BDC positions appear in the credit event or stress probe lists, prioritize those for immediate review.`,
    },
    {
      prompt: 'Which BDC names have the most stressed covenants?',
      cached: `**TCPC, FSK, and GBDC show the most covenant stress.**

**Quantitative Stress Indicators (as of Q4 2025)**

- **TCPC** — 3 red flags: 73.7% depreciation / NAV, 4.14× realized loss acceleration, 190% cumulative loss / NAV. Highest aggregate stress score (0.85 severity, 3 concerns).
- **FSK** — 2 red flags: 33.1% PIK / NII (one-third of income not received in cash), 83.6% dividend coverage (undercovered payout). Also flagged 79.8% cumulative loss / NAV on watch.
- **GBDC** — 1 red flag: 90.3% dividend coverage (barely covered). Non-accruals rose to 1.6% in Q1 2025 with Maverick added, driving NAV down 1% sequentially to $16.63/share.
- **GSBD, NMFC, OCSL** — Each carry 1 red concern but lower overall severity.

**Qualitative Evidence**

- **GBDC** — Wells Fargo analyst flagged looser covenants and higher leverage across private credit in Q1 2025; management acknowledged a growing tail of stressed borrowers among less experienced lenders. Maverick non-accrual triggered ~$8M realized/unrealized loss.
- **AINV** — Q1 2025 call noted amendments involving covenant violations, PIK, and forbearance were "flat quarter-over-quarter," signaling persistent but stable stress.
- **Lower middle market lenders (CSWC)** report covenant structures remain intact despite spread compression — 100% of deals retain strong covenants.

**Heads Up**
TCPC's cumulative loss ratio (190% of NAV) and FSK's PIK reliance (33% of NII) are structurally concerning and warrant deeper portfolio review if clients hold meaningful positions.`,
    },
  ],
  portfolio: [
    {
      prompt: 'What are the top risks across the portfolio right now?',
      cached: `**Credit stress in BDCs, regulatory action in mega-cap tech, and earnings misses across consumer and healthcare names.**

---

**Portfolio Risk Breakdown**

**Credit Events (45 signals)** — BDCs dominate the high-severity credit warnings. 16 BDC names flagged for covenant stress, non-accruals, or PIK acceleration. Total BDC exposure: ~$600M across the book.

- **TCPC** ($145M exposure): 9 separate high-severity signals including credit events, earnings misses, and management tone warnings across Q1–Q4 2025
- **PSEC** ($129M): Credit event + earnings miss
- **GSBD** ($71M): Credit event + earnings miss + negative Q2 prepared remarks
- **NMFC** ($48M): Credit event + multiple quarters of cautious Q&A
- **ARCC**, **FSK**, **OBDC**, **OCSL**, **SLRC**, **MAIN** all flagged

**Regulatory Action (4 signals)** — Antitrust and compliance risk in large-cap tech holdings.

- **NVDA** ($1.1B exposure): Regulatory action signal
- **GOOGL** ($571M): Regulatory action signal
- **KO** ($547M): Regulatory action signal

**Earnings Misses (19 signals)** — Consumer discretionary and healthcare under pressure.

- **UNH** ($1.6B exposure): Earnings miss + guidance change + negative tone across Q1–Q4 2025
- **NKE** ($840M): Earnings miss + negative Q&A in Q2 2025 and Q1 2026
- **TGT** ($791M): Earnings miss + guidance change
- **ABBV** ($658M): Earnings miss
- **TSLA** ($431M): Earnings miss + guidance change + negative Q&A across multiple quarters
- **UPS**, **CAT**, **DE**, **PEP** all flagged

**CEO Succession Risk (13 management change signals)** — Apple transition dominates recent signals.

- **AAPL** ($653M exposure): CEO transition multiple compression risk + negative Q2 2026 Q&A
- **XLK ETF** ($658M): Inherits Apple CEO risk through sector exposure

---

**Heads Up**

**BAC** ($746M exposure): Berkshire Hathaway systematic position exit flagged as high-severity signal (0.9). Buffett reducing stake — worth monitoring for broader sentiment shift on financials.`,
    },
    {
      prompt: 'Which clients have the most allocation drift and why?',
      cached: `**Farrell Wealth Partners (CLT0114) leads with $569M rebalance needed, followed by Gonzalez Trust (CLT0007) at $438M across two asset classes.**

The dominant pattern is **Private Credit underallocation**—27 of the top 30 drift positions are clients holding zero Private Credit when their IPS requires 10–15%. This is a systematic gap, not idiosyncratic portfolio decisions.

**Top 5 clients by absolute drift:**

1. **Farrell Wealth Partners** (CLT0114) – Income profile, $569M under band in Private Credit (15% target, 0% actual)
2. **Gonzalez Trust** (CLT0007) – Income profile, $241M over band in Fixed Income (29% drift) + $197M under in Private Credit
3. **Blair & Associates** (CLT0074) – Alternatives-Heavy, $193M under in Private Credit + $56M over in Alternatives (16% drift)
4. **Evans Family Foundation** (CLT0136) – Income profile, $190M under in Private Credit
5. **Miller & Associates** (CLT0004) – Income profile, $184M under in Private Credit

**Why the drift exists:**

The Private Credit shortfall is structural—these accounts show **zero current allocation** despite IPS mandates of 10–15%. This suggests either:
- Recent IPS updates that haven't been implemented
- Liquidity constraints delaying deployment into illiquid BDC positions
- Advisor hesitation on credit quality given current market conditions

The two outliers are Gonzalez Trust (massively overweight Fixed Income at 29% above target) and Blair & Associates (overweight Alternatives at 16% above band), indicating concentrated positions that appreciated or tactical tilts that weren't rebalanced.`,
    },
    {
      prompt: 'Give me a portfolio health summary across all advisors',
      cached: `**$498.2B in AUM across 250 clients and 12 advisors; 68% of clients are out of IPS bands requiring $5.2B in aggregate rebalancing.**

**Portfolio Overview**
- **Total AUM:** $498.2B
- **Total Clients:** 250 (608 accounts)
- **Advisors:** 12

**IPS Drift Status**
- **Clients in drift:** 170 (68%)
- **Clients within band:** 170 (all clients have at least one account)
- **Total rebalance needed:** $5.2B (absolute value to bring drifted accounts back to band)

**Advisor-Level Breakdown**

| Advisor | AUM | Clients | % Drifted | Rebalance Needed |
|---------|-----|---------|-----------|------------------|
| ADV002 | $100.1B | 35 | 71.4% | $1.1B |
| ADV012 | $52.5B | 17 | 64.7% | $717M |
| ADV005 | $48.5B | 21 | 76.2% | $602M |
| ADV004 | $47.9B | 27 | 66.7% | $391M |
| ADV006 | $44.6B | 17 | 76.5% | $594M |
| ADV008 | $39.3B | 17 | 64.7% | $323M |
| ADV001 | $37.7B | 19 | 68.4% | $296M |
| ADV009 | $36.0B | 22 | 63.6% | $190M |
| ADV011 | $28.9B | 23 | 56.5% | $246M |
| ADV007 | $27.1B | 23 | 82.6% | $280M |
| ADV010 | $24.1B | 17 | 58.8% | $332M |
| ADV003 | $11.6B | 12 | 58.3% | $113M |

**Heads Up**
ADV007 has the highest drift rate at 82.6% despite managing only $27.1B—warrants immediate review for systematic rebalancing.`,
    },
  ],
};

const cacheMap = new Map<string, string>(
  Object.values(PREFAB_PROMPTS)
    .flat()
    .map((p) => [normalize(p.prompt), p.cached]),
);

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function getCachedResponse(prompt: string): string | undefined {
  return cacheMap.get(normalize(prompt));
}
