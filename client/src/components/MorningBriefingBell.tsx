import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  Activity,
  FileWarning,
  Sparkles,
  ListChecks,
  ClipboardList,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { marked } from 'marked';
import { useAnalyticsQuery } from '@databricks/appkit-ui/react';
import { useAdvisor } from '../contexts/AdvisorContext';

type Severity = 'high' | 'medium' | 'low';

interface BriefingSection {
  section_id: number;
  section_key: string;
  section_name: string;
  content: string;
  status: string;
  generated_at: string;
}

const SECTION_META: Record<
  string,
  { severity: Severity; icon: LucideIcon }
> = {
  executive_summary:    { severity: 'high',   icon: ClipboardList },
  portfolio_alerts:     { severity: 'high',   icon: AlertTriangle },
  bdc_surveillance:     { severity: 'medium', icon: Activity },
  credit_events:        { severity: 'medium', icon: FileWarning },
  earnings_highlights:  { severity: 'low',    icon: TrendingUp },
  ai_signals:           { severity: 'medium', icon: Sparkles },
  recommended_actions:  { severity: 'high',   icon: ListChecks },
};

const SEVERITY_STYLES: Record<Severity, { stripe: string; iconBg: string; iconText: string; label: string }> = {
  high:   { stripe: '#E53935', iconBg: 'rgba(229,57,53,0.18)',  iconText: '#FF6B68', label: 'Action' },
  medium: { stripe: '#F9A825', iconBg: 'rgba(249,168,37,0.18)', iconText: '#FFC658', label: 'Watch' },
  low:    { stripe: '#1E88E5', iconBg: 'rgba(30,136,229,0.18)', iconText: '#5AA9F0', label: 'FYI' },
};

marked.setOptions({ breaks: true, gfm: true });

/** Pull a clean preview line out of markdown content for the collapsed card. */
function previewText(md: string, maxLen = 220): string {
  if (!md) return '';
  const lines = md.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) continue;             // headings
    if (line.startsWith('|') || line.startsWith('---')) continue; // tables / hr
    // strip leading bold markers and bullets
    const cleaned = line
      .replace(/^[-*]\s+/, '')
      .replace(/^\*\*(.*?)\*\*\s*[-–:]?\s*/, '$1 — ')
      .replace(/[*_`]/g, '');
    if (cleaned.length < 4) continue;
    return cleaned.length > maxLen ? cleaned.slice(0, maxLen).trimEnd() + '…' : cleaned;
  }
  return '';
}

export function MorningBriefingBell() {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { params } = useAdvisor();
  const { data, loading } = useAnalyticsQuery('morning_briefings', params);

  const rows = (data ?? []) as BriefingSection[];
  const count = rows.length;
  const badge = useMemo(() => (count > 9 ? '9+' : String(count)), [count]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpandedId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setExpandedId(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    setExpandedId(null);
  }, [params]);

  return (
    <div ref={containerRef} className="fixed top-5 right-6 z-[10000]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all bg-[#0E1928] text-white hover:bg-[#1a2a3e]"
        title="Morning briefing"
        aria-label="Morning briefing"
      >
        <Bell size={20} strokeWidth={1.75} />
        {!loading && count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center ring-2 ring-background">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-14 right-0 w-[560px] max-h-[calc(100vh-90px)] overflow-y-auto overflow-x-hidden pl-2 pr-2 pb-6 pt-1"
          style={{ animation: 'mb-fade-in 0.18s ease-out' }}
        >
          <div className="flex flex-col gap-3 items-end">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : rows.length === 0 ? (
              <EmptyCard />
            ) : (
              rows.map((row, idx) => (
                <SectionCard
                  key={row.section_id}
                  row={row}
                  index={idx}
                  expanded={expandedId === row.section_id}
                  onToggle={() =>
                    setExpandedId((cur) => (cur === row.section_id ? null : row.section_id))
                  }
                />
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes mb-fade-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mb-card-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .mb-md { color: rgba(255,255,255,0.9); font-size: 13px; line-height: 1.55; }
        .mb-md h1, .mb-md h2, .mb-md h3 { font-weight: 600; margin: 0.6em 0 0.3em; }
        .mb-md h1 { font-size: 15px; }
        .mb-md h2 { font-size: 14px; color: #fff; }
        .mb-md h3 { font-size: 13px; color: rgba(255,255,255,0.85); }
        .mb-md p  { margin: 0.4em 0; }
        .mb-md ul, .mb-md ol { margin: 0.4em 0; padding-left: 1.1em; }
        .mb-md li { margin: 0.15em 0; }
        .mb-md strong { color: #fff; }
        .mb-md hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 0.7em 0; }
        .mb-md code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
        .mb-md table { border-collapse: collapse; width: 100%; margin: 0.5em 0; font-size: 12px; }
        .mb-md th, .mb-md td { border: 1px solid rgba(255,255,255,0.1); padding: 4px 6px; text-align: left; vertical-align: top; }
        .mb-md th { background: rgba(255,255,255,0.05); font-weight: 600; }
        .mb-md a { color: #5AA9F0; text-decoration: underline; }
      `}</style>
    </div>
  );
}

function SectionCard({
  row,
  index,
  expanded,
  onToggle,
}: {
  row: BriefingSection;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = SECTION_META[row.section_key] ?? { severity: 'low' as Severity, icon: Sparkles };
  const sev = SEVERITY_STYLES[meta.severity];
  const Icon = meta.icon;

  const html = useMemo(
    () => (row.content ? (marked.parse(row.content) as string) : ''),
    [row.content],
  );
  const preview = useMemo(() => previewText(row.content), [row.content]);

  // Apple-ish smooth easing
  const easing = 'cubic-bezier(0.32, 0.72, 0, 1)';
  const shapeMs = 520; // width + height
  const fadeInMs = 220;
  const fadeInDelay = 280; // wait for shape to mostly settle before painting text in
  const fadeOutMs = 140;   // text fades out quickly on collapse

  return (
    <div
      className={`group relative rounded-[22px] bg-[#1A2332] text-white overflow-hidden border border-white/5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)] ${
        expanded ? 'w-[540px]' : 'w-[440px]'
      }`}
      style={{
        animation: `mb-card-in 0.32s ease-out both`,
        animationDelay: `${index * 45}ms`,
        transition: `width ${shapeMs}ms ${easing}`,
        willChange: 'width',
      }}
    >
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1" style={{ background: sev.stripe }} />

      <button
        type="button"
        onClick={onToggle}
        className="text-left w-full pl-5 pr-4 py-4 flex gap-3 transition-transform hover:-translate-y-[1px]"
      >
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: sev.iconBg, color: sev.iconText }}
        >
          <Icon size={18} strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/55 font-semibold">
            <span>Section {Number(row.section_id) + 1}</span>
            <span aria-hidden>·</span>
            <span style={{ color: sev.iconText }}>{sev.label}</span>
          </div>
          <div className="mt-1 font-semibold text-[15px] leading-snug">{row.section_name}</div>
          <div
            className="overflow-hidden"
            style={{
              maxHeight: expanded ? 0 : 80,
              opacity: expanded ? 0 : 1,
              transition: expanded
                ? `max-height ${shapeMs}ms ${easing}, opacity ${fadeOutMs}ms ease-out`
                : `max-height ${shapeMs}ms ${easing} ${fadeInDelay}ms, opacity ${fadeInMs}ms ease-out ${fadeInDelay}ms`,
            }}
            aria-hidden={expanded}
          >
            {preview && (
              <div className="mt-1.5 text-[13px] leading-relaxed text-white/75 line-clamp-3">
                {preview}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Body: grid 0fr ↔ 1fr animates height; text fades in *after* the shape settles */}
      <div
        className="grid"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: `grid-template-rows ${shapeMs}ms ${easing}`,
        }}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-3 border-t border-white/5">
            <div
              className="mb-md"
              style={{
                opacity: expanded ? 1 : 0,
                transform: expanded ? 'translateY(0)' : 'translateY(-4px)',
                transition: expanded
                  ? `opacity ${fadeInMs}ms ease-out ${fadeInDelay}ms, transform ${fadeInMs}ms ease-out ${fadeInDelay}ms`
                  : `opacity ${fadeOutMs}ms ease-out, transform ${fadeOutMs}ms ease-out`,
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="w-[440px] rounded-[22px] bg-[#1A2332] border border-white/5 p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-white/10 rounded" />
          <div className="h-4 w-3/4 bg-white/15 rounded" />
          <div className="h-3 w-full bg-white/10 rounded" />
          <div className="h-3 w-5/6 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}

function EmptyCard() {
  return (
    <div className="w-[440px] rounded-[22px] bg-[#1A2332] border border-white/5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)] p-5 text-white">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(67,160,71,0.18)', color: '#7BC97F' }}
        >
          <CheckCircle2 size={18} strokeWidth={1.75} />
        </div>
        <div>
          <div className="font-semibold text-[15px]">All clear</div>
          <div className="text-[13px] text-white/70">No briefing sections for today.</div>
        </div>
      </div>
    </div>
  );
}
