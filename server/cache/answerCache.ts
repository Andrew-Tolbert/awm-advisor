import { sql } from '@databricks/appkit';

// Cache table lives in Unity Catalog so it survives restarts and is shared
// across deployments. Hydration runs once at boot to refill the in-memory map.
const TABLE = 'ahtsa.awm.agent_answer_cache';

// Shape returned by appkit.analytics.query() — the inner `response.result`
// from the SQL warehouse statement response, with `data_array` already
// transformed into `data` (an array of column-named objects) by the connector.
interface AnalyticsQueryResponse {
  data?: Record<string, unknown>[];
}

interface AppKitWithAnalytics {
  analytics: {
    query(
      query: string,
      parameters?: Record<string, ReturnType<typeof sql.string> | null | undefined>,
    ): Promise<AnalyticsQueryResponse>;
  };
}

export interface CachedEntry {
  answer: string;
  columns?: string[] | null;
  rows?: unknown[][] | null;
  createdAt: Date;
}

interface PutInput {
  answer: string;
  columns?: string[] | null;
  rows?: unknown[][] | null;
}

const map = new Map<string, CachedEntry>();
const inFlightWrites = new Set<string>();
let hydrated = false;

function normalize(q: string): string {
  return q.trim().replace(/\s+/g, ' ');
}

function keyOf(source: string, question: string): string {
  return `${source}::${normalize(question)}`;
}

export function size(): number {
  return map.size;
}

export function isHydrated(): boolean {
  return hydrated;
}

export function get(source: string, question: string): CachedEntry | null {
  return map.get(keyOf(source, question)) ?? null;
}

/**
 * Update the in-memory map immediately, then schedule a write-through to Delta.
 * The write is fire-and-forget so the request handler is never blocked by the
 * warehouse. Empty answers (no text and no rows) are skipped — never cache
 * errors or empty responses.
 */
export function put(
  appkit: AppKitWithAnalytics,
  source: string,
  question: string,
  entry: PutInput,
): void {
  const answer = entry.answer ?? '';
  const rows = entry.rows ?? null;
  if (!answer && (!rows || rows.length === 0)) return;

  const key = keyOf(source, question);
  const cached: CachedEntry = {
    answer,
    columns: entry.columns ?? null,
    rows,
    createdAt: new Date(),
  };
  map.set(key, cached);

  if (inFlightWrites.has(key)) return;
  inFlightWrites.add(key);
  void writeThrough(appkit, source, normalize(question), cached).finally(() => {
    inFlightWrites.delete(key);
  });
}

async function writeThrough(
  appkit: AppKitWithAnalytics,
  source: string,
  normalizedQ: string,
  entry: CachedEntry,
): Promise<void> {
  // Databricks SQL bind parameters require every named param to be present.
  // Build the column list dynamically so columns_json / rows_json are emitted
  // as literal NULL when absent (avoids the UNBOUND_SQL_PARAMETER error).
  const cols: string[] = ['source', 'question', 'answer', 'created_at'];
  const vals: string[] = [':source', ':question', ':answer', 'current_timestamp()'];
  const params: Record<string, ReturnType<typeof sql.string>> = {
    source: sql.string(source),
    question: sql.string(normalizedQ),
    answer: sql.string(entry.answer),
  };
  if (entry.columns) {
    cols.push('columns_json');
    vals.push(':columns_json');
    params.columns_json = sql.string(JSON.stringify(entry.columns));
  }
  if (entry.rows) {
    cols.push('rows_json');
    vals.push(':rows_json');
    params.rows_json = sql.string(JSON.stringify(entry.rows));
  }
  const sqlText = `INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${vals.join(', ')})`;
  try {
    await appkit.analytics.query(sqlText, params);
  } catch (err) {
    console.warn(
      `[answer-cache] write-through failed for ${source} (${normalizedQ.slice(0, 60)}…):`,
      (err as Error).message,
    );
  }
}

/**
 * Auto-create the table if missing and load the latest entry per (source, question)
 * into the in-memory map. Safe to call once at startup. Failures are logged but
 * never thrown — the app stays usable, the cache just runs empty until the next
 * `put()` succeeds.
 */
export async function hydrate(appkit: AppKitWithAnalytics): Promise<number> {
  try {
    await appkit.analytics.query(
      `CREATE TABLE IF NOT EXISTS ${TABLE} (
         source        STRING,
         question      STRING,
         answer        STRING,
         columns_json  STRING,
         rows_json     STRING,
         created_at    TIMESTAMP
       ) USING DELTA`,
    );

    const result = await appkit.analytics.query(
      `SELECT source, question, answer, columns_json, rows_json, created_at
       FROM (
         SELECT *, ROW_NUMBER() OVER (
           PARTITION BY source, question ORDER BY created_at DESC
         ) AS rn
         FROM ${TABLE}
       )
       WHERE rn = 1`,
    );

    const rows = result?.data ?? [];
    map.clear();
    for (const row of rows) {
      const source = String(row.source ?? '');
      const question = String(row.question ?? '');
      const answer = String(row.answer ?? '');
      const columnsJson = row.columns_json as string | null | undefined;
      const rowsJson = row.rows_json as string | null | undefined;
      const createdAtRaw = row.created_at;
      const createdAt = createdAtRaw ? new Date(String(createdAtRaw)) : new Date();
      if (!source || !question) continue;

      let columns: string[] | null = null;
      let dataRows: unknown[][] | null = null;
      try {
        if (columnsJson) columns = JSON.parse(columnsJson) as string[];
        if (rowsJson) dataRows = JSON.parse(rowsJson) as unknown[][];
      } catch {
        // tolerate malformed JSON — treat as text-only entry
      }

      map.set(keyOf(source, question), { answer, columns, rows: dataRows, createdAt });
    }

    hydrated = true;
    console.log(`[answer-cache] hydrated ${map.size} entries`);
    return map.size;
  } catch (err) {
    console.warn(
      '[answer-cache] hydrate failed — cache will run empty until next put:',
      (err as Error).message,
    );
    hydrated = true; // mark as "tried" so warming can still run against an empty map
    return 0;
  }
}

/** Fire-and-forget wrapper; safe to call from server bootstrap without blocking. */
export function hydrateAsync(appkit: AppKitWithAnalytics): void {
  void hydrate(appkit);
}
