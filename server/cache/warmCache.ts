import * as answerCache from './answerCache';

// Server-side mirror of the prompts the UI exposes. Keep in sync with
// client/src/data/prefab-prompts.ts and the chip arrays in /pages/genie and
// the floating PortfolioAssistant. Server-side because tsconfig.server.json
// excludes the client/ folder.
const WARM_PROMPTS: string[] = [
  // PREFAB_PROMPTS.advisor
  'Top portfolio risks across all asset classes right now',
  'Which BDC names have the most stressed covenants?',
  // PREFAB_PROMPTS.portfolio (floating bubble)
  'What are the top risks across the portfolio right now?',
  'Which clients have the most allocation drift and why?',
  'Give me a portfolio health summary across all advisors',
  // /genie page PRIMARY_CHIPS (extras beyond the prefabs)
  'Clients above their IPS Private Credit band, ranked by drift dollars',
  'Draft client outreach for accounts exposed to Blackstone PE SC IV',
  // /genie page SECONDARY_CHIPS
  "What was UNH's management tone shift across the last 4 calls?",
  'AAPL succession risk — what did Q2 2026 prepared remarks say?',
  'YTD performance vs S&P 500 by advisor',
  'Total AUM exposure to names with active high-severity credit warnings',
  'Compare Q2 vs Q3 covenant headroom for our top 5 BDC holdings',
];

const SOURCE = 'mas-supervisor';
const PROMPT_GAP_MS = 500;
const HYDRATE_TIMEOUT_MS = 60_000;
const REQUEST_TIMEOUT_MS = 180_000;

interface AppKitWithAnalytics {
  analytics: Parameters<typeof answerCache.put>[0]['analytics'];
}

export function warmCacheAsync(appkit: AppKitWithAnalytics): void {
  void warmCache(appkit);
}

async function warmCache(appkit: AppKitWithAnalytics): Promise<void> {
  // Wait for hydration to finish so we don't re-warm prompts already in Delta.
  const start = Date.now();
  while (!answerCache.isHydrated() && Date.now() - start < HYDRATE_TIMEOUT_MS) {
    await sleep(500);
  }

  const port = Number(process.env.DATABRICKS_APP_PORT) || 8000;
  const baseUrl = `http://127.0.0.1:${port}`;

  const todo = WARM_PROMPTS.filter((q) => !answerCache.get(SOURCE, q));
  if (todo.length === 0) {
    console.log(`[answer-cache] warm: all ${WARM_PROMPTS.length} prompts already cached, nothing to do`);
    return;
  }

  console.log(
    `[answer-cache] warm: ${todo.length}/${WARM_PROMPTS.length} prompt(s) need warming`,
  );

  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < todo.length; i++) {
    const prompt = todo[i];
    const ok = await warmOne(baseUrl, prompt);
    if (ok) succeeded++;
    else failed++;
    if (i < todo.length - 1) await sleep(PROMPT_GAP_MS);
  }

  console.log(
    `[answer-cache] warm: done — ${succeeded} succeeded, ${failed} failed (cache size: ${answerCache.size()})`,
  );
  // appkit param exists to anchor the typing and signal we ran post-bootstrap
  void appkit;
}

async function warmOne(baseUrl: string, prompt: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/api/portfolio-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      console.warn(
        `[answer-cache] warm: ${res.status} for "${prompt.slice(0, 60)}…"`,
      );
      return false;
    }
    // Drain the SSE stream so the route handler runs to completion (and the
    // route's own put() writes through to the cache + Delta).
    const reader = res.body.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
    return true;
  } catch (err) {
    console.warn(
      `[answer-cache] warm: failed for "${prompt.slice(0, 60)}…":`,
      (err as Error).message,
    );
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
