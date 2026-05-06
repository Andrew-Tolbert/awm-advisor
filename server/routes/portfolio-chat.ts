import { Application } from 'express';
import { getWorkspaceClient } from '@databricks/appkit';
import * as answerCache from '../cache/answerCache';

interface AppKitWithServer {
  server: { extend(fn: (app: Application) => void): void };
  analytics: Parameters<typeof answerCache.put>[0]['analytics'];
}

const ENDPOINT_NAME = 'mas-af54fe47-endpoint';
const SOURCE = 'mas-supervisor';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** Emit a cached answer as a single Responses-API `response.completed` event so
 * useMasChat's parser surfaces it as `finalResponseText`. */
function replayCached(answer: string): string {
  const payload = {
    type: 'response.completed',
    response: {
      output: [{ type: 'final_response', content: answer }],
    },
  };
  return `data: ${JSON.stringify(payload)}\n\n` + 'data: [DONE]\n\n';
}

/** Pull `final_response` text from the upstream SSE stream as it flows. */
function extractFinalText(buffer: string, prev: { finalId: string | null; final: string; all: string }) {
  const events = buffer.split('\n\n').filter(Boolean);
  let { finalId, final, all } = prev;
  let completed: string | null = null;

  for (const evt of events) {
    const lines = evt.split('\n').filter((l) => l.startsWith('data:'));
    for (const line of lines) {
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const obj = JSON.parse(data) as {
          type?: string;
          delta?: unknown;
          item_id?: string;
          item?: { id?: string; type?: string; name?: string };
          response?: { output?: Array<{ type?: string; name?: string; content?: unknown; text?: unknown }> };
        };

        if (
          obj.type === 'response.output_item.added' &&
          (obj.item?.name === 'final_response' || obj.item?.type === 'final_response') &&
          typeof obj.item.id === 'string'
        ) {
          finalId = obj.item.id;
          final = '';
        }
        if (obj.type === 'response.output_text.delta' && typeof obj.delta === 'string') {
          all += obj.delta;
          if (finalId && obj.item_id === finalId) final += obj.delta;
        }
        if (obj.type === 'response.completed' && obj.response?.output) {
          const fr = obj.response.output.find(
            (o) => o.type === 'final_response' || o.name === 'final_response',
          );
          if (fr) {
            const c = fr.content ?? fr.text;
            if (typeof c === 'string') completed = c;
            else if (Array.isArray(c)) {
              completed = c
                .map((p) => (p && typeof p === 'object' && typeof (p as { text?: unknown }).text === 'string'
                  ? (p as { text: string }).text
                  : ''))
                .join('');
            }
          }
        }
      } catch {
        // ignore non-JSON keepalives
      }
    }
  }
  return { finalId, final, all, completed };
}

export function setupPortfolioChatRoute(appkit: AppKitWithServer) {
  appkit.server.extend((app) => {
    app.post('/api/portfolio-chat', async (req, res) => {
      const messages = (req.body?.messages ?? []) as ChatMessage[];
      const forceRefresh = Boolean(req.body?.force_refresh);
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'messages array required' });
        return;
      }

      // A "fresh" question is a single user turn — no prior context. Only fresh
      // asks are cacheable; follow-ups depend on conversation state.
      const isFresh = messages.length === 1 && messages[0].role === 'user';
      const question = isFresh ? messages[0].content : '';

      // Cache hit: replay synthetically as SSE so the client parser is happy.
      if (isFresh && !forceRefresh) {
        const hit = answerCache.get(SOURCE, question);
        if (hit && hit.answer) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Cache', 'HIT');
          res.flushHeaders?.();
          res.write(replayCached(hit.answer));
          res.end();
          return;
        }
      }

      try {
        const ws = getWorkspaceClient({});
        await ws.config.ensureResolved();
        const host = ws.config.host;
        if (!host) {
          res.status(500).json({ error: 'DATABRICKS_HOST not configured' });
          return;
        }

        const headers = new Headers({ 'Content-Type': 'application/json' });
        await ws.config.authenticate(headers);

        const input = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content }));

        const upstream = await fetch(
          `${host}/serving-endpoints/${ENDPOINT_NAME}/invocations`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ input, stream: true }),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => '');
          console.error('[portfolio-chat] upstream error', upstream.status, text);
          res.status(upstream.status || 502).json({
            error: 'Serving endpoint error',
            detail: text.slice(0, 500),
          });
          return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Cache', 'MISS');
        res.flushHeaders?.();

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        // Tee the upstream stream: pipe to client, also accumulate to extract
        // the final answer text for write-through caching.
        let buffer = '';
        let extractState = { finalId: null as string | null, final: '', all: '', completed: null as string | null };
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
            buffer += chunk;
            // Extract whole events from buffer; keep trailing partial
            const lastSep = buffer.lastIndexOf('\n\n');
            if (lastSep >= 0) {
              const consumed = buffer.slice(0, lastSep + 2);
              buffer = buffer.slice(lastSep + 2);
              const next = extractFinalText(consumed, extractState);
              extractState = {
                finalId: next.finalId,
                final: next.final,
                all: next.all,
                completed: next.completed ?? extractState.completed,
              };
            }
          }
          // Flush any remaining partial event
          if (buffer.trim()) {
            const next = extractFinalText(buffer + '\n\n', extractState);
            extractState = {
              finalId: next.finalId,
              final: next.final,
              all: next.all,
              completed: next.completed ?? extractState.completed,
            };
          }
        } finally {
          res.end();
        }

        // Cache the final answer if it's a fresh single-turn question.
        // Prefer the most authoritative non-empty source: response.completed's
        // final_response item, then the final_response-filtered delta stream,
        // then all deltas as a fallback for endpoints that never emit a
        // final_response marker.
        if (isFresh) {
          const finalAnswer =
            (extractState.completed && extractState.completed.length > 0
              ? extractState.completed
              : '') ||
            extractState.final ||
            extractState.all ||
            '';
          if (finalAnswer.trim()) {
            answerCache.put(appkit, SOURCE, question, { answer: finalAnswer });
            console.log(
              `[answer-cache] put: "${question.slice(0, 60)}…" (${finalAnswer.length} chars)`,
            );
          }
        }
      } catch (err) {
        console.error('[portfolio-chat] failed:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: (err as Error).message });
        } else {
          res.end();
        }
      }
    });
  });
}
