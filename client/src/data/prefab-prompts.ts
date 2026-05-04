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
