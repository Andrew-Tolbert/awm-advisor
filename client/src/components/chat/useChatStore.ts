import { useEffect, useState } from 'react';
import type { ChatStoreState, Conversation, Message } from './types';

interface PendingPrompt {
  display: string; // shown in textarea and chat bubble
  hidden: string;  // silently appended to the actual agent call, never rendered
}

interface UiState {
  chatOpen: boolean;
  pendingPrompt: PendingPrompt | null;
}

const STORAGE_KEY = 'awm-advisor-chats-v1';

type Listener = () => void;
const listeners = new Set<Listener>();

function loadFromStorage(): ChatStoreState {
  if (typeof window === 'undefined') return { conversations: [], activeId: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatStoreState;
      if (parsed && Array.isArray(parsed.conversations)) return parsed;
    }
  } catch {
    // fall through to default
  }
  return { conversations: [], activeId: null };
}

let state: ChatStoreState = loadFromStorage();
let ui: UiState = { chatOpen: false, pendingPrompt: null };
const uiListeners = new Set<() => void>();

function emitUi() { uiListeners.forEach((l) => l()); }
function setUi(updater: (s: UiState) => UiState) { ui = updater(ui); emitUi(); }

export function openChat()  { setUi((s) => ({ ...s, chatOpen: true })); }
export function closeChat() { setUi((s) => ({ ...s, chatOpen: false })); }

/** Pre-fills the chat input with `display` text and opens the assistant.
 *  `hidden` is silently appended when the user submits — never shown anywhere. */
export function queueMessage(display: string, hidden: string) {
  setUi(() => ({ chatOpen: true, pendingPrompt: { display, hidden } }));
}

export function clearPendingPrompt() {
  setUi((s) => ({ ...s, pendingPrompt: null }));
}

export function useUiStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    uiListeners.add(l);
    return () => { uiListeners.delete(l); };
  }, []);
  return { chatOpen: ui.chatOpen, pendingPrompt: ui.pendingPrompt, openChat, closeChat, queueMessage, clearPendingPrompt };
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / privacy mode errors
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function setState(updater: (s: ChatStoreState) => ChatStoreState) {
  state = updater(state);
  persist();
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const next = JSON.parse(e.newValue) as ChatStoreState;
      if (next && Array.isArray(next.conversations)) {
        state = next;
        emit();
      }
    } catch {
      // ignore
    }
  });
}

export function getState(): ChatStoreState {
  return state;
}

function makeId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(content: string): string {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  return cleaned.length > 60 ? `${cleaned.slice(0, 60)}…` : cleaned || 'New conversation';
}

export function newConversation(): string {
  const id = makeId();
  const conv: Conversation = {
    id,
    title: 'New conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  setState((s) => ({
    conversations: [conv, ...s.conversations],
    activeId: id,
  }));
  return id;
}

export function setActive(id: string | null) {
  setState((s) => ({ ...s, activeId: id }));
}

export function appendMessage(convId: string, message: Message) {
  setState((s) => ({
    ...s,
    conversations: s.conversations.map((c) => {
      if (c.id !== convId) return c;
      const isFirstUser = c.messages.length === 0 && message.role === 'user';
      return {
        ...c,
        messages: [...c.messages, message],
        updatedAt: Date.now(),
        title: isFirstUser ? deriveTitle(message.content) : c.title,
      };
    }),
  }));
}

export function updateLastAssistant(convId: string, content: string) {
  setState((s) => ({
    ...s,
    conversations: s.conversations.map((c) => {
      if (c.id !== convId) return c;
      const msgs = [...c.messages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], content };
      }
      return { ...c, messages: msgs, updatedAt: Date.now() };
    }),
  }));
}

export function clearConversation(id: string) {
  setState((s) => ({
    ...s,
    conversations: s.conversations.map((c) =>
      c.id === id ? { ...c, messages: [], title: 'New conversation', updatedAt: Date.now() } : c
    ),
  }));
}

export function renameConversation(id: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  setState((s) => ({
    ...s,
    conversations: s.conversations.map((c) => (c.id === id ? { ...c, title: trimmed } : c)),
  }));
}

export function deleteConversation(id: string) {
  setState((s) => {
    const conversations = s.conversations.filter((c) => c.id !== id);
    return {
      conversations,
      activeId: s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId,
    };
  });
}

export function useChatStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const activeConversation =
    state.conversations.find((c) => c.id === state.activeId) ?? null;

  return {
    conversations: state.conversations,
    activeId: state.activeId,
    activeConversation,
    setActive,
    newConversation,
    appendMessage,
    updateLastAssistant,
    renameConversation,
    deleteConversation,
  };
}
