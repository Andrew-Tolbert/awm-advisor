import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Send, Sparkles, X } from 'lucide-react';
import { renderMarkdown } from '../lib/markdown';
import { PREFAB_PROMPTS, getCachedResponse } from '../data/prefab-prompts';

const SAMPLE_PROMPTS = PREFAB_PROMPTS.portfolio.map((p) => p.prompt);

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function streamCachedResponse(
  content: string,
  onUpdate: (partial: string) => void,
  signal: AbortSignal,
) {
  const totalDurationMs = 600;
  const numChunks = 30;
  const chunkSize = Math.max(1, Math.ceil(content.length / numChunks));
  const intervalMs = totalDurationMs / numChunks;
  for (let i = 0; i < content.length; i += chunkSize) {
    if (signal.aborted) return;
    onUpdate(content.slice(0, Math.min(i + chunkSize, content.length)));
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  onUpdate(content);
}

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

function extractDelta(eventText: string): string {
  const lines = eventText.split('\n').filter((l) => l.startsWith('data:'));
  let out = '';
  for (const line of lines) {
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const json = JSON.parse(data);
      // Responses-API streaming: { type: "response.output_text.delta", delta: "..." }
      if (json?.type === 'response.output_text.delta' && typeof json.delta === 'string') {
        out += json.delta;
        continue;
      }
      // Chat-completions streaming fallback
      const chatDelta = json?.choices?.[0]?.delta?.content;
      if (typeof chatDelta === 'string') out += chatDelta;
    } catch {
      // ignore non-JSON keepalives
    }
  }
  return out;
}

function ChatBar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (hasMessages) setIsExpanded(true);
  }, [hasMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;

    const next: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const cached = getCachedResponse(trimmed);
    if (cached) {
      try {
        await streamCachedResponse(
          cached,
          (partial) => setMessages([...next, { role: 'assistant', content: partial }]),
          controller.signal,
        );
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
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '');
        setMessages([
          ...next,
          { role: 'assistant', content: `Error: ${res.status} ${errText.slice(0, 200)}` },
        ]);
        return;
      }

      setMessages([...next, { role: 'assistant', content: '' }]);

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
          setMessages([...next, { role: 'assistant', content: assembled }]);
        }
      }
      if (buffer.trim()) {
        assembled += extractDelta(buffer);
        setMessages([...next, { role: 'assistant', content: assembled }]);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[portfolio-chat]', err);
        setMessages([
          ...next,
          { role: 'assistant', content: 'Sorry — the assistant ran into an error.' },
        ]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="bg-white border shadow-2xl rounded-xl px-4 py-3 w-full pointer-events-auto max-h-[70vh] overflow-hidden flex flex-col">
      {isExpanded && hasMessages && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#0E1928]" /> Portfolio Assistant
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            >
              <ChevronDown size={14} /> Collapse
            </button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-2">
            {messages.map((msg, i) =>
              msg.role === 'assistant' && !msg.content ? null : (
                <div key={i} className={msg.role === 'user' ? 'ml-12' : 'mr-4'}>
                  {msg.role === 'user' ? (
                    <div className="rounded-lg px-3 py-2 text-sm whitespace-pre-wrap bg-[#0E1928] text-white">
                      {msg.content}
                    </div>
                  ) : (
                    <div
                      className="rounded-lg px-3 py-2 text-sm bg-muted text-foreground"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  )}
                </div>
              ),
            )}
            {isStreaming && !messages[messages.length - 1]?.content && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-[#0E1928]/20 border-t-[#0E1928] rounded-full animate-spin" />
                Analyzing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {!isExpanded && hasMessages && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <ChevronUp size={14} /> Show conversation ({messages.length} messages)
        </button>
      )}

      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-[#0E1928] flex-shrink-0" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask about your portfolio..."
          disabled={isStreaming}
          className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0E1928] disabled:opacity-60"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isStreaming || !input.trim()}
          className="flex items-center justify-center px-3 py-2 bg-[#0E1928] text-white rounded-lg text-sm font-medium hover:bg-[#1a2a3e] disabled:opacity-50 transition-colors"
        >
          <Send size={14} />
        </button>
      </div>

      {!hasMessages && !isStreaming && (
        <div className="flex flex-wrap gap-2 mt-2">
          {SAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-xs bg-[#0E1928]/5 text-[#0E1928] border border-[#0E1928]/15 rounded-full px-3 py-1 hover:bg-[#0E1928]/10 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PortfolioAssistant() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setChatOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[10000] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all bg-[#0E1928] text-white hover:bg-[#1a2a3e]"
        title={chatOpen ? 'Close assistant' : 'Open assistant'}
      >
        {chatOpen ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {chatOpen && (
        <div
          className="fixed bottom-20 left-[300px] right-20 z-[9999] flex justify-center pointer-events-none"
          style={{ animation: 'fade-in 0.15s ease-out' }}
        >
          <ChatBar />
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
