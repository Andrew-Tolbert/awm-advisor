import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PromptChipsProps {
  primary: string[];
  secondary?: string[];
  onSelect: (prompt: string) => void;
  layout?: 'wrap' | 'stack';
}

function Chip({
  text,
  onClick,
  layout,
}: {
  text: string;
  onClick: () => void;
  layout: 'wrap' | 'stack';
}) {
  const base =
    'text-left text-xs bg-[#0E1928]/[0.04] text-[#0E1928] border border-[#0E1928]/15 rounded-full px-3 py-1.5 hover:bg-[#0E1928]/[0.08] hover:border-[#0E1928]/30 transition-colors';
  return (
    <button onClick={onClick} className={layout === 'stack' ? `${base} w-full` : base}>
      {text}
    </button>
  );
}

export function PromptChips({
  primary,
  secondary = [],
  onSelect,
  layout = 'wrap',
}: PromptChipsProps) {
  const [showMore, setShowMore] = useState(false);
  const containerCls =
    layout === 'stack' ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2';

  return (
    <div className="space-y-2">
      <div className={containerCls}>
        {primary.map((p) => (
          <Chip key={p} text={p} onClick={() => onSelect(p)} layout={layout} />
        ))}
      </div>
      {secondary.length > 0 && (
        <>
          <button
            onClick={() => setShowMore((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showMore ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showMore ? 'Hide examples' : 'More examples'}
          </button>
          {showMore && (
            <div className={containerCls}>
              {secondary.map((p) => (
                <Chip key={p} text={p} onClick={() => onSelect(p)} layout={layout} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
