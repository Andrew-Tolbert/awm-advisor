import { useEffect, useRef, useState } from 'react';
import { getCachedResponse } from '../../data/prefab-prompts';
import {
  appendMessage,
  getState,
  newConversation,
  updateLastAssistant,
  useChatStore,
} from './useChatStore';

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
}
interface ChatCompletionsDelta {
  choices?: Array<{ delta?: { content?: unknown } }>;
}

function extractDelta(eventText: string): string {
  const lines = eventText.split('\n').filter((l) => l.startsWith('data:'));
  let out = '';
  for (const line of lines) {
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const obj = JSON.parse(data) as ResponsesDelta & ChatCompletionsDelta;
      if (obj.type === 'response.output_text.delta' && typeof obj.delta === 'string') {
        out += obj.delta;
        continue;
      }
      const chatDelta = obj.choices?.[0]?.delta?.content;
      if (typeof chatDelta === 'string') out += chatDelta;
    } catch {
      // ignore non-JSON keepalives
    }
  }
  return out;
}

async function streamCachedResponse(
  convId: string,
  content: string,
  signal: AbortSignal,
) {
  const chunkSize = Math.max(1, Math.ceil(content.length / CACHE_NUM_CHUNKS));
  const intervalMs = CACHE_TOTAL_MS / CACHE_NUM_CHUNKS;
  for (let i = 0; i < content.length; i += chunkSize) {
    if (signal.aborted) return;
    updateLastAssistant(convId, content.slice(0, Math.min(i + chunkSize, content.length)));
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  updateLastAssistant(convId, content);
}

export function useMasChat() {
  // Subscribe so callers re-render on store changes; the hook itself doesn't read
  // values off this object — it reads from getState() to avoid stale closures.
  useChatStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  function stop() {
    abortRef.current?.abort();
  }

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;

    let convId = getState().activeId;
    if (!convId) convId = newConversation();

    appendMessage(convId, { role: 'user', content: trimmed });

    const snapshot = getState().conversations.find((c) => c.id === convId);
    const messagesForApi = snapshot?.messages ?? [];

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    appendMessage(convId, { role: 'assistant', content: '' });

    const cached = getCachedResponse(trimmed);
    if (cached) {
      try {
        await streamCachedResponse(convId, cached, controller.signal);
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
      return;
    }

    try {
      const res = await fetch('/api/portfolio-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesForApi }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '');
        updateLastAssistant(
          convId,
          `Error: ${res.status} ${errText.slice(0, 200)}`.trim(),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assembled = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSSEChunk(buffer);
        buffer = rest;
        for (const evt of events) {
          assembled += extractDelta(evt);
        }
        if (events.length > 0) {
          updateLastAssistant(convId, assembled);
        }
      }
      if (buffer.trim()) {
        assembled += extractDelta(buffer);
        updateLastAssistant(convId, assembled);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[advisor-chat]', err);
        updateLastAssistant(convId, 'Sorry — the assistant ran into an error.');
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  return { send, stop, isStreaming };
}
