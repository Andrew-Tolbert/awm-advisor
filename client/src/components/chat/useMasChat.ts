import { useEffect, useRef, useState } from 'react';
import { getCachedResponse } from '../../data/prefab-prompts';
import { getCached, setCached } from '../../lib/answerCache';
import {
  appendMessage as globalAppend,
  getState,
  newConversation,
  updateLastAssistant as globalUpdateLast,
  useChatStore,
} from './useChatStore';
import type { Message } from './types';

export interface ChatOps {
  ensureConvId: () => string;
  appendMessage: (convId: string, msg: Message) => void;
  updateLastAssistant: (convId: string, content: string) => void;
  getMessages: (convId: string) => Message[];
}

const globalOps: ChatOps = {
  ensureConvId: () => {
    let id = getState().activeId;
    if (!id) id = newConversation();
    return id;
  },
  appendMessage: globalAppend,
  updateLastAssistant: globalUpdateLast,
  getMessages: (convId) =>
    getState().conversations.find((c) => c.id === convId)?.messages ?? [],
};

const CACHE_SOURCE = 'mas-supervisor';

const CACHE_TOTAL_MS = 600;
const CACHE_NUM_CHUNKS = 30;

function parseSSEChunk(buffer: string): { events: string[]; rest: string } {
  const events: string[] = [];
  let rest = buffer;
  let idx;
  while ((idx = rest.indexOf('\n\n')) !== -1) {
    events.push(rest.slice(0, idx));
    rest = rest.slice(idx + 2);
  }
  return { events, rest };
}

interface ResponsesDelta {
  type?: string;
  delta?: unknown;
  item_id?: string;
  item?: { id?: string; type?: string; name?: string };
  response?: {
    output?: Array<{ id?: string; type?: string; name?: string; content?: unknown }>;
  };
}
interface ChatCompletionsDelta {
  choices?: Array<{ delta?: { content?: unknown } }>;
}

const TRACE_TYPE_LABELS: Record<string, string> = {
  'response.created': 'Routing through supervisor agent…',
  'response.in_progress': 'Supervisor working…',
  'response.output_item.added': 'Picking up the next step…',
  'response.output_item.done': 'Step complete…',
  'response.function_call_arguments.delta': 'Preparing tool call…',
  'response.function_call_arguments.done': 'Running tool…',
  'response.reasoning_summary_text.delta': 'Reasoning through the question…',
  'response.output_text.delta': 'Drafting response…',
  'response.completed': 'Wrapping up…',
};

function humanizeType(type: string): string {
  return `${type
    .replace(/^response\./, '')
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()}…`;
}

interface ParsedEvent {
  delta: string;
  /** Item id the delta belongs to, if present (Responses API output_text.delta). */
  deltaItemId: string | null;
  /** When `response.output_item.added` arrives for the final_response item, its id. */
  finalResponseItemId: string | null;
  /** Final-response text extracted from a `response.completed` event, if any. */
  finalResponseText: string | null;
  trace: string | null;
}

function isFinalResponse(item: { type?: string; name?: string } | undefined): boolean {
  if (!item) return false;
  return item.name === 'final_response' || item.type === 'final_response';
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part || typeof part !== 'object') return '';
        const p = part as { type?: string; text?: unknown };
        if (typeof p.text === 'string') return p.text;
        return '';
      })
      .join('');
  }
  return '';
}

// Toggle in DevTools: `localStorage.advisorDebug = '1'`. Logs raw SSE event
// types/items so we can see what the MAS endpoint actually emits and refine
// the final_response filter against real data.
const DEBUG = typeof window !== 'undefined' && window.localStorage?.advisorDebug === '1';

function parseEvent(eventText: string): ParsedEvent {
  const lines = eventText.split('\n').filter((l) => l.startsWith('data:'));
  let delta = '';
  let deltaItemId: string | null = null;
  let finalResponseItemId: string | null = null;
  let finalResponseText: string | null = null;
  let trace: string | null = null;
  for (const line of lines) {
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const obj = JSON.parse(data) as ResponsesDelta & ChatCompletionsDelta;
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.debug('[advisor-chat:event]', obj.type, {
          item: obj.item,
          item_id: obj.item_id,
          hasDelta: typeof obj.delta === 'string',
        });
      }
      if (obj.type === 'response.output_text.delta' && typeof obj.delta === 'string') {
        delta += obj.delta;
        if (typeof obj.item_id === 'string') deltaItemId = obj.item_id;
      } else {
        const chatDelta = obj.choices?.[0]?.delta?.content;
        if (typeof chatDelta === 'string') delta += chatDelta;
      }

      // Capture the final_response item's id when it's added, so we can filter
      // streaming deltas to only that item's content downstream.
      if (
        obj.type === 'response.output_item.added' &&
        isFinalResponse(obj.item) &&
        typeof obj.item?.id === 'string'
      ) {
        finalResponseItemId = obj.item.id;
      }

      // On completion, scan the full output for the final_response item and
      // pull its text. This guarantees we end with exactly the final answer
      // even if some deltas were missed or filtered.
      if (obj.type === 'response.completed' && obj.response?.output) {
        const finalItem = obj.response.output.find((o) => isFinalResponse(o));
        if (finalItem) {
          const text = extractTextFromContent(
            (finalItem as { content?: unknown; text?: unknown }).content ??
              (finalItem as { text?: unknown }).text,
          );
          if (text) finalResponseText = text;
        }
      }

      // Surface a friendly trace label for UI progress.
      if (typeof obj.type === 'string') {
        const itemName = obj.item?.name;
        const itemType = obj.item?.type;
        // The supervisor's `final_response` item is the actual answer being
        // assembled — surface it as a generic drafting label rather than as a
        // step name, so the trace ticker doesn't leak the final-output marker.
        if (obj.type === 'response.output_item.added' && isFinalResponse(obj.item)) {
          trace = 'Drafting response…';
        } else if (obj.type === 'response.output_item.added' && itemName) {
          trace = `Calling ${itemName}…`;
        } else if (obj.type === 'response.output_item.added' && itemType) {
          trace = `Starting ${itemType.replace(/_/g, ' ')}…`;
        } else if (TRACE_TYPE_LABELS[obj.type]) {
          trace = TRACE_TYPE_LABELS[obj.type];
        } else if (obj.type.startsWith('response.')) {
          trace = humanizeType(obj.type);
        }
        // Never surface raw `final_response` labels — that's the answer itself,
        // which the chat reveals only when streaming completes.
        if (trace && /final[_\s-]?response/i.test(trace)) {
          trace = 'Drafting response…';
        }
      }
    } catch {
      // ignore non-JSON keepalives
    }
  }
  return { delta, deltaItemId, finalResponseItemId, finalResponseText, trace };
}

const CACHED_TRACE_SEQUENCE = [
  'Routing through supervisor agent…',
  'Resolving account context…',
  'Querying Genie for portfolio data…',
  'Searching filings & transcripts…',
  'Reasoning through the question…',
  'Drafting response…',
];

async function streamCachedResponse(
  convId: string,
  content: string,
  signal: AbortSignal,
  onTrace: (label: string) => void,
  updateFn: (convId: string, content: string) => void,
) {
  const chunkSize = Math.max(1, Math.ceil(content.length / CACHE_NUM_CHUNKS));
  const intervalMs = CACHE_TOTAL_MS / CACHE_NUM_CHUNKS;
  for (let i = 0; i < content.length; i += chunkSize) {
    if (signal.aborted) return;
    const traceIdx = Math.min(
      CACHED_TRACE_SEQUENCE.length - 1,
      Math.floor((i / content.length) * CACHED_TRACE_SEQUENCE.length),
    );
    onTrace(CACHED_TRACE_SEQUENCE[traceIdx]);
    updateFn(convId, content.slice(0, Math.min(i + chunkSize, content.length)));
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  updateFn(convId, content);
}

export function useMasChat(ops: ChatOps = globalOps) {
  // Subscribe to the global store for re-renders; isolated instances manage their own state.
  useChatStore();

  const [isStreaming, setIsStreaming] = useState(false);
  const [traceStatus, setTraceStatus] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep a stable ref to ops so async send() always sees the latest version.
  const opsRef = useRef(ops);
  useEffect(() => { opsRef.current = ops; }, [ops]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function stop() {
    abortRef.current?.abort();
  }

  async function send(content: string, opts?: { forceRefresh?: boolean }) {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;
    const forceRefresh = Boolean(opts?.forceRefresh);
    const o = opsRef.current;

    const convId = o.ensureConvId();
    o.appendMessage(convId, { role: 'user', content: trimmed });
    const messagesForApi = o.getMessages(convId);

    // Only fresh single-turn questions are eligible for any cache layer.
    // Follow-up turns must always hit the live agent because they depend on context.
    const isFresh = messagesForApi.length === 1 && messagesForApi[0].role === 'user';

    setIsStreaming(true);
    setTraceStatus('Routing through supervisor agent…');
    const controller = new AbortController();
    abortRef.current = controller;

    o.appendMessage(convId, { role: 'assistant', content: '' });

    if (isFresh && !forceRefresh) {
      // Layer 1: hand-curated prefab cache (chip-click prompts).
      const prefab = getCachedResponse(trimmed);
      if (prefab) {
        try {
          await streamCachedResponse(convId, prefab, controller.signal, setTraceStatus, o.updateLastAssistant);
        } finally {
          setIsStreaming(false);
          setTraceStatus(null);
          abortRef.current = null;
        }
        return;
      }
      // Layer 2: per-browser localStorage Q&A bucket.
      const local = getCached(CACHE_SOURCE, trimmed);
      if (local) {
        try {
          await streamCachedResponse(convId, local, controller.signal, setTraceStatus, o.updateLastAssistant);
        } finally {
          setIsStreaming(false);
          setTraceStatus(null);
          abortRef.current = null;
        }
        return;
      }
    }

    try {
      const res = await fetch('/api/portfolio-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesForApi, force_refresh: forceRefresh }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '');
        o.updateLastAssistant(convId, `Error: ${res.status} ${errText.slice(0, 200)}`.trim());
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // Track two streams: `finalAssembled` is just the final_response item's
      // content (preferred), and `allAssembled` is every output_text delta
      // (fallback when the endpoint doesn't surface a final_response marker).
      let finalItemId: string | null = null;
      let finalAssembled = '';
      let allAssembled = '';
      let completedFinalText: string | null = null;

      const ingest = (parsed: ParsedEvent) => {
        if (parsed.finalResponseItemId) {
          finalItemId = parsed.finalResponseItemId;
          finalAssembled = '';
        }
        if (parsed.delta) {
          allAssembled += parsed.delta;
          if (finalItemId && parsed.deltaItemId === finalItemId) {
            finalAssembled += parsed.delta;
          }
        }
        if (parsed.finalResponseText) {
          completedFinalText = parsed.finalResponseText;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSSEChunk(buffer);
        buffer = rest;
        let latestTrace: string | null = null;
        for (const evt of events) {
          const parsed = parseEvent(evt);
          ingest(parsed);
          if (parsed.trace) latestTrace = parsed.trace;
        }
        if (events.length > 0) {
          const display = finalAssembled || allAssembled;
          if (display) o.updateLastAssistant(convId, display);
          if (latestTrace) setTraceStatus(latestTrace);
        }
      }
      if (buffer.trim()) {
        const parsed = parseEvent(buffer);
        ingest(parsed);
        if (parsed.trace) setTraceStatus(parsed.trace);
      }
      const finalText = completedFinalText ?? finalAssembled ?? allAssembled;
      o.updateLastAssistant(convId, finalText || allAssembled);
      if (isFresh && finalText) {
        setCached(CACHE_SOURCE, trimmed, finalText);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[advisor-chat]', err);
        o.updateLastAssistant(convId, 'Sorry — the assistant ran into an error.');
      }
    } finally {
      setIsStreaming(false);
      setTraceStatus(null);
      abortRef.current = null;
    }
  }

  return { send, stop, isStreaming, traceStatus };
}
