import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Pencil, Plus, Trash2, Download, MessageSquare } from 'lucide-react';
import {
  deleteConversation as deleteConv,
  newConversation,
  renameConversation,
  setActive,
  useChatStore,
} from './useChatStore';
import type { Conversation } from './types';

interface ChatHistoryProps {
  onExport?: (conv: Conversation) => void;
}

type Bucket = 'today' | 'yesterday' | 'earlier';
const BUCKET_LABEL: Record<Bucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

function bucketOf(updatedAt: number): Bucket {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  if (updatedAt >= today) return 'today';
  if (updatedAt >= yesterday) return 'yesterday';
  return 'earlier';
}

function ConversationRow({
  conv,
  active,
  onExport,
}: {
  conv: Conversation;
  active: boolean;
  onExport?: (conv: Conversation) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conv.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commitRename() {
    const next = draft.trim();
    if (next && next !== conv.title) renameConversation(conv.id, next);
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(conv.title);
      setEditing(false);
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm(`Delete "${conv.title}"?`)) deleteConv(conv.id);
  }

  return (
    <div
      onClick={() => !editing && setActive(conv.id)}
      className={`group relative cursor-pointer pl-3 pr-2 py-2 border-l-2 transition-colors ${
        active
          ? 'border-l-[#0E1928] bg-[#0E1928]/[0.04]'
          : 'border-l-transparent hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center gap-2">
        <MessageSquare
          size={13}
          className={`flex-shrink-0 ${active ? 'text-[#0E1928]' : 'text-muted-foreground'}`}
        />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 text-sm border border-[#0E1928]/40 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#0E1928] bg-white"
          />
        ) : (
          <span
            className={`flex-1 min-w-0 truncate text-sm ${
              active ? 'font-medium text-foreground' : 'text-foreground/80'
            }`}
            title={conv.title}
          >
            {conv.title}
          </span>
        )}
        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onExport && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExport(conv);
                }}
                className="p-1 rounded hover:bg-[#0E1928]/10 text-muted-foreground hover:text-foreground"
                title="Export to PDF"
              >
                <Download size={12} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="p-1 rounded hover:bg-[#0E1928]/10 text-muted-foreground hover:text-foreground"
              title="Rename"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatHistory({ onExport }: ChatHistoryProps) {
  const { conversations, activeId } = useChatStore();

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const grouped: Record<Bucket, Conversation[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };
  for (const c of sorted) grouped[bucketOf(c.updatedAt)].push(c);

  const buckets: Bucket[] = ['today', 'yesterday', 'earlier'];

  return (
    <div className="flex flex-col h-full bg-muted/20 border-r">
      <div className="px-3 py-3 border-b">
        <button
          onClick={() => newConversation()}
          className="w-full flex items-center justify-center gap-2 bg-[#0E1928] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#1a2a3e] transition-colors"
        >
          <Plus size={14} />
          New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No conversations yet. Start one to populate your history.
          </div>
        ) : (
          buckets.map((b) =>
            grouped[b].length === 0 ? null : (
              <div key={b} className="mb-4">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {BUCKET_LABEL[b]}
                </p>
                <div>
                  {grouped[b].map((c) => (
                    <ConversationRow
                      key={c.id}
                      conv={c}
                      active={c.id === activeId}
                      onExport={onExport}
                    />
                  ))}
                </div>
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
