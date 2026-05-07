import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Download, Maximize2, RefreshCw, RotateCcw, Send, Sparkles, Square, X } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { PromptChips } from './PromptChips';
import { clearConversation, newConversation, useChatStore, useUiStore } from './useChatStore';
import { useMasChat, type ChatOps } from './useMasChat';
import type { Conversation, Message } from './types';

interface AdvisorChatProps {
  mode: 'floating' | 'panel';
  primaryChips?: string[];
  secondaryChips?: string[];
  placeholder?: string;
  onExport?: (conv: Conversation) => void;
  /** Floating mode only — opens conversation in the main /genie panel. */
  onOpenInMainView?: () => void;
  /** Floating mode only — title shown in compact header. */
  floatingTitle?: string;
  /** Floating mode only — renders an X button in the header. */
  onClose?: () => void;
  /** Silently appended to every message sent from this instance. Never shown anywhere. */
  hiddenContext?: string;
  /** When true, uses local ephemeral state — no shared history with the global chat store. */
  isolated?: boolean;
}

const DEFAULT_PLACEHOLDER = 'Ask about your portfolio, IPS drift, BDC covenants…';

export function AdvisorChat({
  mode,
  primaryChips = [],
  secondaryChips = [],
  placeholder = DEFAULT_PLACEHOLDER,
  onExport,
  onOpenInMainView,
  floatingTitle = 'Portfolio Assistant',
  onClose,
  hiddenContext = '',
  isolated = false,
}: AdvisorChatProps) {
  // Isolated mode: local ephemeral messages, no shared store.
  const localMessagesRef = useRef<Message[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  const localOps = useRef<ChatOps>({
    ensureConvId: () => 'isolated',
    appendMessage: (_, msg) => {
      localMessagesRef.current = [...localMessagesRef.current, msg];
      setLocalMessages([...localMessagesRef.current]);
    },
    updateLastAssistant: (_, content) => {
      const msgs = [...localMessagesRef.current];
      const last = msgs.length - 1;
      if (last >= 0 && msgs[last].role === 'assistant') {
        msgs[last] = { ...msgs[last], content };
        localMessagesRef.current = msgs;
        setLocalMessages([...msgs]);
      }
    },
    getMessages: () => localMessagesRef.current,
  }).current;

  const { activeConversation } = useChatStore();
  const { pendingPrompt, clearPendingPrompt } = useUiStore();
  const { send, stop, isStreaming, traceStatus } = useMasChat(isolated ? localOps : undefined);

  const allMessages = isolated ? localMessages : (activeConversation?.messages ?? []);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  // Hidden context for the current pre-filled question — never rendered anywhere.
  const hiddenContextRef = useRef('');

  // Global store: pre-fill from queueMessage() calls.
  useEffect(() => {
    if (pendingPrompt) {
      setInput(pendingPrompt.display);
      hiddenContextRef.current = pendingPrompt.hidden;
      clearPendingPrompt();
      textareaRef.current?.focus();
    }
  }, [pendingPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep hiddenContextRef in sync with the prop so chips and manual sends both pick it up.
  useEffect(() => {
    hiddenContextRef.current = hiddenContext;
  }, [hiddenContext]);

  const [input, setInput] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // allMessages defined above (isolated vs global)
  // While streaming, hide the in-progress assistant bubble — show only the
  // spinner until the full response is ready.
  const lastIsStreamingAssistant =
    isStreaming && allMessages[allMessages.length - 1]?.role === 'assistant';
  const messages = lastIsStreamingAssistant ? allMessages.slice(0, -1) : allMessages;
  const hasMessages = messages.length > 0;
  const lastMessage = messages[messages.length - 1];
  // Most-recent user turn — used by the force-refresh button to re-ask the same
  // question while bypassing both the localStorage and server caches.
  const lastUserMessage = [...allMessages].reverse().find((m) => m.role === 'user');
  const canForceRefresh = !isStreaming && Boolean(lastUserMessage?.content);

  function handleForceRefresh() {
    if (!lastUserMessage || isStreaming) return;
    void send(lastUserMessage.content, { forceRefresh: true });
  }

  useEffect(() => {
    // Scroll the message container directly so we never bubble up to the document.
    // Only autoscroll when the user is already near the bottom (within 80px),
    // so manual scroll-up to read earlier messages isn't fought by streaming updates.
    const c = messagesContainerRef.current;
    if (!c) return;
    const distanceFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight;
    if (distanceFromBottom < 80) {
      c.scrollTop = c.scrollHeight;
    }
  }, [messages.length, lastMessage?.content.length]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const max = 160;
    if (ta.scrollHeight <= max) {
      ta.style.height = `${ta.scrollHeight}px`;
      ta.style.overflowY = 'hidden';
    } else {
      ta.style.height = `${max}px`;
      ta.style.overflowY = 'auto';
    }
  }, [input]);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    const hidden = hiddenContextRef.current;
    hiddenContextRef.current = '';
    void send(hidden ? `${trimmed} ${hidden}` : trimmed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isFloating = mode === 'floating';
  const showStreamingDots = isStreaming;

  const emptyState = (
    <div
      className={
        isFloating
          ? 'space-y-3'
          : 'flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12 space-y-5'
      }
    >
      {!isFloating && (
        <>
          <div className="w-12 h-12 rounded-full bg-[#0E1928]/[0.04] flex items-center justify-center">
            <Sparkles size={22} className="text-[#0E1928]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Ask the AWM Advisor</h3>
            <p className="text-sm text-muted-foreground">
              Routes through the multi-agent supervisor — combines Genie SQL with the Knowledge
              Assistant for filings, transcripts, and signals.
            </p>
          </div>
        </>
      )}
      {primaryChips.length > 0 && (
        <PromptChips
          primary={primaryChips}
          secondary={secondaryChips}
          onSelect={(p) => {
            const ctx = hiddenContextRef.current;
            void send(ctx ? `${p} ${ctx}` : p);
          }}
          layout={isFloating ? 'wrap' : 'stack'}
        />
      )}
    </div>
  );

  const messagesList = (
    <>
      {messages.map((m, i) => (
        // Messages append-only within a conversation; index is a stable key here.
        // eslint-disable-next-line react/no-array-index-key
        <MessageBubble key={`${isolated ? 'isolated' : (activeConversation?.id ?? 'none')}-${i}`} message={m} />
      ))}
      {showStreamingDots && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground transition-opacity">
          <div className="w-3 h-3 border-2 border-[#0E1928]/20 border-t-[#0E1928] rounded-full animate-spin flex-shrink-0" />
          <span className="truncate">{traceStatus ?? 'Routing through supervisor agent…'}</span>
        </div>
      )}
    </>
  );

  const inputBar = (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isStreaming}
        rows={1}
        className="flex-1 resize-none overflow-hidden text-sm border rounded-lg px-3 py-2 leading-snug focus:outline-none focus:ring-2 focus:ring-[#0E1928]/40 focus:border-[#0E1928] disabled:opacity-60 max-h-40"
      />
      {isStreaming ? (
        <button
          onClick={stop}
          className="flex items-center justify-center px-3 h-9 bg-[#0E1928] text-white rounded-lg text-sm font-medium hover:bg-[#1a2a3e] transition-colors"
          title="Stop"
        >
          <Square size={14} fill="currentColor" />
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="flex items-center justify-center px-3 h-9 bg-[#0E1928] text-white rounded-lg text-sm font-medium hover:bg-[#1a2a3e] disabled:opacity-50 transition-colors"
          title="Send"
        >
          <Send size={14} />
        </button>
      )}
    </div>
  );

  if (isFloating) {
    return (
      <div className="flex flex-col w-full bg-white border shadow-2xl rounded-xl px-4 py-3 max-h-[70vh]">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-[#0E1928] flex items-center gap-1.5">
            <Sparkles size={12} /> {floatingTitle}
          </div>
          <div className="flex items-center gap-0.5 text-muted-foreground">
            {canForceRefresh && (
              <button
                onClick={handleForceRefresh}
                className="p-1 rounded hover:bg-muted hover:text-foreground"
                title="Regenerate (bypass cache)"
              >
                <RefreshCw size={12} />
              </button>
            )}
            <button
              onClick={() => {
                if (isolated) {
                  localMessagesRef.current = [];
                  setLocalMessages([]);
                } else if (activeConversation) {
                  clearConversation(activeConversation.id);
                } else {
                  newConversation();
                }
              }}
              className="p-1 rounded hover:bg-muted hover:text-foreground"
              title="Reset chat"
            >
              <RotateCcw size={12} />
            </button>
            {onOpenInMainView && (
              <button
                onClick={onOpenInMainView}
                className="p-1 rounded hover:bg-muted hover:text-foreground"
                title="Open in main view"
              >
                <Maximize2 size={12} />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-muted hover:text-foreground"
                title="Close"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        {hasMessages ? (
          <div
            ref={messagesContainerRef}
            className="max-h-[45vh] overflow-y-auto pr-1 space-y-3 mb-3"
          >
            {messagesList}
          </div>
        ) : (
          <div className="mb-2">{emptyState}</div>
        )}
        {inputBar}
      </div>
    );
  }

  // Panel mode
  return (
    <div className="flex flex-col h-full bg-white">
      {activeConversation && hasMessages && (
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#c8a96a]/30">
          <div className="text-sm font-medium text-foreground truncate" title={activeConversation.title}>
            {activeConversation.title}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => activeConversation && clearConversation(activeConversation.id)}
              className="flex items-center gap-1.5 text-xs text-[#0E1928] hover:text-[#1a2a3e] border border-[#0E1928]/20 hover:border-[#0E1928]/40 rounded-md px-2.5 py-1 transition-colors"
              title="Reset chat"
            >
              <RotateCcw size={12} />
              Reset
            </button>
            {canForceRefresh && (
              <button
                onClick={handleForceRefresh}
                className="flex items-center gap-1.5 text-xs text-[#0E1928] hover:text-[#1a2a3e] border border-[#0E1928]/20 hover:border-[#0E1928]/40 rounded-md px-2.5 py-1 transition-colors"
                title="Regenerate the last response, bypassing the cache"
              >
                <RefreshCw size={12} />
                Regenerate
              </button>
            )}
            {onExport && (
              <button
                onClick={() => onExport(activeConversation)}
                className="flex items-center gap-1.5 text-xs text-[#0E1928] hover:text-[#1a2a3e] border border-[#0E1928]/20 hover:border-[#0E1928]/40 rounded-md px-2.5 py-1 transition-colors"
                title="Export conversation as PDF"
              >
                <Download size={12} />
                Export PDF
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col px-6">
        {hasMessages ? (
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto pr-2 space-y-3 pt-3 pb-3"
          >
            {messagesList}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">{emptyState}</div>
        )}
      </div>
      <div className="px-6 py-4 border-t">{inputBar}</div>
    </div>
  );
}
