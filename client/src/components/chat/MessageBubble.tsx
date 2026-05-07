import { renderMarkdown } from '../../lib/markdown';
import type { Message } from './types';

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    // Strip any hidden [Scope: ...] context that was silently appended at send time.
    const display = message.content.replace(/\s*\[Scope:[^\]]*\]/g, '').trimEnd();
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-[#0E1928] text-white whitespace-pre-wrap">
          {display}
        </div>
      </div>
    );
  }

  if (!message.content) return null;

  return (
    <div className="rounded-lg px-3 py-2 text-sm bg-white border text-foreground">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
    </div>
  );
}
