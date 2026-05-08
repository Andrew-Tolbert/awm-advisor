-- @param signal_id STRING
-- Sample citations keyed by ticker symbol, joined to gold_app_alerts on signal_id
-- so the correct set of citations surfaces for whichever alert is active.
WITH citation_data AS (

  -- TCPC — NAV Collapse & Credit Event (8-K filed Feb 27, 2026)
  SELECT 'TCPC' AS symbol, 1 AS seq,
         'TCPC 8-K — Feb 27, 2026' AS doc_name,
         'NAV per share fell 18.8% in Q4 2025 to $7.07 (from $8.71 at Sept 30, 2025). Net decrease in net assets from operations: $118.3M or $1.39 per share. Board slashed Q1 2026 dividend to $0.17 from $0.25.' AS snippet
  UNION ALL
  SELECT 'TCPC', 2,
         'TCPC Q4 2025 Earnings Supplement',
         'Realized losses of $73.9M and unrealized losses of $66.5M across six issuers. Non-accruals rose to 9.7% of portfolio at cost (14 companies); net regulatory leverage climbed to 1.41× from 1.20×.'
  UNION ALL

  -- FSK — PIK Income Quality Risk (8-K filed Feb 25, 2026)
  SELECT 'FSK', 1,
         'FSK 8-K — Feb 25, 2026',
         'NAV declined to $20.89/share (Dec 31, 2025) from $21.99 (Sept 30) and $23.64 (Dec 31, 2024). Q4 2025 NII: $0.48/share vs. $0.57 in Q3. Management acknowledged new PIK toggle elections this quarter.'
  UNION ALL
  SELECT 'FSK', 2,
         'FSK Q3 2025 10-Q',
         'PIK/NII ratio of 33.1% — one-third of reported income is non-cash. Management guided PIK percentage to decline to 5–6% in the coming quarter.'
  UNION ALL

  -- UNH — Earnings Miss & MCR Surge (10-Q filed Oct 28, 2025)
  SELECT 'UNH', 1,
         'UNH 10-Q — Oct 28, 2025',
         'Q3 2025 diluted EPS: $2.59 vs. $6.51 in Q3 2024 (60% collapse). Medical care ratio surged 470 bps to 89.9% from 85.2%. Net earnings: $2,348M vs. $6,055M prior year.'
  UNION ALL
  SELECT 'UNH', 2,
         'UNH Q3 2025 Earnings Supplement',
         'Consolidated earnings from operations fell 50% to $4.3B. Optum Health operating earnings down 88% YoY to $255M, compounding UnitedHealthcare segment decline of 57%.'
  UNION ALL

  -- ADBE — Traditional Business Decline (Earnings call + 8-K, Mar 12, 2026)
  SELECT 'ADBE', 1,
         'ADBE Q1 2026 Earnings Call — Mar 12, 2026',
         '"Greater-than-anticipated decline in traditional stand-alone stock book of business, described as happening faster than expected." Alert stems from earnings call transcript, not 8-K filing.'
  UNION ALL
  SELECT 'ADBE', 2,
         'ADBE 8-K — Mar 12, 2026',
         'Record results and AI-first ARR tripling YoY highlighted. Standalone Creative Cloud vs. AI-bundled product performance not broken out at segment level in this filing.'
  UNION ALL

  -- AMT — Guidance Raise (Earnings call, Apr 28, 2026)
  SELECT 'AMT', 1,
         'AMT Q1 2026 Earnings Call — Apr 28, 2026',
         'Full-year AFFO and EBITDA outlook raised, driven by strong operational performance, favorable FX, and straight-line tailwinds. Positive signal; no action required.'

)
SELECT c.doc_name, c.snippet
FROM   (SELECT DISTINCT symbol FROM ahtsa.awm.gold_app_alerts WHERE signal_id = :signal_id) a
JOIN   citation_data c ON c.symbol = a.symbol
ORDER BY c.seq
