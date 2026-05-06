// Per-browser exact-match Q&A cache for free-typed advisor-chat questions.
// Lives in localStorage so it survives a page reload but is per-user.
// The PREFAB_PROMPTS hand-curated cache (data/prefab-prompts.ts) covers the
// chip-click prompts; this layer covers everything else the user types.

const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const MAX_PAIRS = 50;

interface QAPair {
  q: string;
  a: string;
  t: number; // saved at (ms since epoch)
}

interface Bucket {
  pairs: QAPair[];
  savedAt: number;
}

function key(source: string): string {
  return `cache-${source}`;
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function loadBucket(source: string): Bucket | null {
  try {
    const raw = window.localStorage.getItem(key(source));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Bucket;
    if (!parsed || !Array.isArray(parsed.pairs)) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      window.localStorage.removeItem(key(source));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveBucket(source: string, bucket: Bucket): void {
  try {
    window.localStorage.setItem(key(source), JSON.stringify(bucket));
  } catch {
    // quota exceeded or storage unavailable — ignore
  }
}

export function getCached(source: string, question: string): string | null {
  const bucket = loadBucket(source);
  if (!bucket) return null;
  const target = normalize(question);
  const hit = bucket.pairs.find((p) => normalize(p.q) === target);
  return hit ? hit.a : null;
}

export function setCached(source: string, question: string, answer: string): void {
  if (!answer.trim()) return;
  const existing = loadBucket(source) ?? { pairs: [], savedAt: Date.now() };
  const target = normalize(question);
  const filtered = existing.pairs.filter((p) => normalize(p.q) !== target);
  filtered.push({ q: question, a: answer, t: Date.now() });
  // Cap at MAX_PAIRS, keeping the most recent entries.
  const trimmed = filtered.slice(-MAX_PAIRS);
  saveBucket(source, { pairs: trimmed, savedAt: Date.now() });
}

export function clearCached(source: string): void {
  try {
    window.localStorage.removeItem(key(source));
  } catch {
    // ignore
  }
}
