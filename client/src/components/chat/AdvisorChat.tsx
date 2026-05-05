import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Download, Maximize2, Plus, Send, Sparkles, Square } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { PromptChips } from './PromptChips';
import { newConversation, useChatStore } from './useChatStore';
import { useMasChat } from './useMasChat';
import type { Conversation } from './types';

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
}: AdvisorChatProps) {
  const { activeConversation } = useChatStore();
  const { send, stop, isStreaming } = useMasChat();

  const [input, setInput] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = activeConversation?.messages ?? [];
  const hasMessages = messages.length > 0;
  const lastMessage = messages[messages.length - 1];

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
    void send(trimmed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isFloating = mode === 'floating';
  const showStreamingDots = isStreaming && !lastMessage?.content;

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
          onSelect={(p) => void send(p)}
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
        <MessageBubble key={`${activeConversation?.id ?? 'none'}-${i}`} message={m} />
      ))}
      {showStreamingDots && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 border-2 border-[#0E1928]/20 border-t-[#0E1928] rounded-full animate-spin" />
          Routing through supervisor agent…
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
            <button
              onClick={() => newConversation()}
              className="p-1 rounded hover:bg-muted hover:text-foreground"
              title="New chat"
            >
              <Plus size={13} />
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
      )}
      <div className="flex-1 min-h-0 flex flex-col px-6 pt-4">
        {hasMessages ? (
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto pr-2 space-y-3"
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
