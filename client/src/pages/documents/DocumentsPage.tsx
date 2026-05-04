import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useAnalyticsQuery, Card, CardContent, Skeleton } from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { AlertTriangle, FileText } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HoldingItem {
  holding_id: string;
  name: string;
  asset_class: string;
  strategy: string;
  has_alert: boolean;
}

interface InsightRow {
  kpi_name: string;
  prior_value: string;
  current_value: string;
  change_pct: number;
  flag: string;
  covenant_value: number;
}

// ── Static per-holding content ────────────────────────────────────────────────

const TONE: Record<string, { positive: number; neutral: number; negative: number }> = {
  'blackstone-pe-sc4': { positive: 35, neutral: 30, negative: 35 },
  default:             { positive: 62, neutral: 25, negative: 13 },
};

const CITATIONS: Record<string, { label: string; snippet: string }[]> = {
  'blackstone-pe-sc4': [
    { label: '10-K 2025 — p.47',     snippet: '"...covenant headroom has compressed from 0.7x to 0.3x as of Q3 2025, approaching the minimum threshold of 1.0x..."' },
    { label: 'Q3 Earnings — p.12',   snippet: '"...management acknowledges elevated leverage, with interest coverage declining to 2.4x against a covenant floor of 2.0x..."' },
  ],
  default: [
    { label: 'Annual Report 2025 — p.23', snippet: '"...financial performance remains strong with EBITDA growth of 5.1% year-over-year, well within covenant thresholds..."' },
    { label: 'Q3 Update — p.8',           snippet: '"...leverage ratios have improved, reflecting disciplined capital allocation and robust cash generation..."' },
  ],
};

const DOCUMENTS = [
  { icon: '📄', label: '10-K 2025' },
  { icon: '📄', label: 'Q3 Earnings Transcript' },
  { icon: '📄', label: 'CIM 2024' },
  { icon: '📄', label: 'Covenant Compliance Report' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function AssetClassBadge({ cls }: { cls: string }) {
  const colors: Record<string, string> = {
    'Private Equity':  'bg-blue-50 text-blue-700 border-blue-200',
    'Private Credit':  'bg-amber-50 text-amber-700 border-amber-200',
    'High Yield':      'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Public Equities': 'bg-purple-50 text-purple-700 border-purple-200',
    'ETFs':            'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${colors[cls] ?? 'bg-muted text-muted-foreground border-border'}`}>
      {cls}
    </span>
  );
}

function FlagCell({ flag, value }: { flag: string; value: string }) {
  if (flag === 'alert') return <span className="text-red-600 font-semibold">{value} ⚠</span>;
  if (flag === 'down')  return <span className="text-orange-500">{value} ↓</span>;
  if (flag === 'up')    return <span className="text-emerald-600">{value} ↑</span>;
  return <span>{value}</span>;
}

function CovenantGauge({ value }: { value: number }) {
  const pct = Math.min(value / 1.0, 1) * 100;
  const color = value < 0.5 ? 'bg-red-500' : value < 0.8 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0x</span>
        <span className="font-medium text-foreground">{value.toFixed(1)}x current</span>
        <span>1.0x minimum</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {value < 0.5 && (
        <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> APPROACHING BREACH
        </p>
      )}
    </div>
  );
}

function ToneBar({ holdingId }: { holdingId: string }) {
  const t = TONE[holdingId] ?? TONE.default;
  return (
    <div className="space-y-1.5">
      <div className="flex h-3 w-full rounded-full overflow-hidden">
        <div className="bg-emerald-500" style={{ width: `${t.positive}%` }} />
        <div className="bg-slate-300" style={{ width: `${t.neutral}%` }} />
        <div className="bg-red-400"   style={{ width: `${t.negative}%` }} />
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Positive {t.positive}%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />Neutral {t.neutral}%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Negative {t.negative}%</span>
      </div>
      {holdingId === 'blackstone-pe-sc4' && (
        <p className="text-xs text-muted-foreground">↓ More cautious tone vs Q2</p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string>(
    searchParams.get('holding') ?? 'blackstone-pe-sc4'
  );

  useEffect(() => {
    const p = searchParams.get('holding');
    if (p && p !== selectedId) setSelectedId(p);
  }, [searchParams]);

  const { data: holdingsList, loading: listLoading } = useAnalyticsQuery('holdings_list');

  const insightParams = { holding_id: sql.string(selectedId) };
  const { data: insights, loading: insightsLoading } = useAnalyticsQuery('document_insights', insightParams);

  const holdings = (holdingsList ?? []) as HoldingItem[];
  const rows = (insights ?? []) as InsightRow[];
  const selectedHolding = holdings.find((h) => h.holding_id === selectedId);
  const covenantRow = rows.find((r) => r.kpi_name === 'Covenant Headroom');

  function selectHolding(id: string) {
    setSelectedId(id);
    setSearchParams({ holding: id });
  }

  return (
    <div className="flex h-full gap-0 border rounded-lg overflow-hidden max-w-[1400px]" style={{ minHeight: '80vh' }}>

      {/* ── Left panel: holdings + docs list ── */}
      <div className="w-64 flex-shrink-0 border-r bg-muted/20 flex flex-col">
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Holdings</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {listLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))
            : holdings.map((h) => (
                <button
                  key={h.holding_id}
                  onClick={() => selectHolding(h.holding_id)}
                  className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50 ${
                    selectedId === h.holding_id ? 'bg-muted border-l-[3px] border-l-[#1a3a5c] pl-[13px]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{h.name}</p>
                    {h.has_alert && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                  </div>
                  <div className="mt-1">
                    <AssetClassBadge cls={h.asset_class} />
                  </div>
                </button>
              ))
          }
        </div>

        {/* Document list */}
        <div className="border-t">
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documents</p>
          </div>
          {DOCUMENTS.map((d) => (
            <div key={d.label} className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer transition-colors">
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              {d.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: delta view ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {selectedHolding?.name ?? '—'} — Document Delta
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedHolding?.strategy} · {selectedHolding?.asset_class}
            </p>
          </div>
          {selectedHolding && <AssetClassBadge cls={selectedHolding.asset_class} />}
        </div>

        {/* KPI Delta Table */}
        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Key Metrics — Q2 vs Q3 2025</p>
            {insightsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-2 pr-6 font-medium">KPI</th>
                    <th className="text-right py-2 pr-6 font-medium">Prior Period</th>
                    <th className="text-right py-2 pr-6 font-medium">Current Period</th>
                    <th className="text-right py-2 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.kpi_name} className="border-b last:border-0">
                      <td className="py-2.5 pr-6 font-medium text-foreground">{r.kpi_name}</td>
                      <td className="py-2.5 pr-6 text-right text-muted-foreground">{r.prior_value}</td>
                      <td className="py-2.5 pr-6 text-right"><FlagCell flag={r.flag} value={r.current_value} /></td>
                      <td className={`py-2.5 text-right text-xs tabular-nums ${r.change_pct < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {r.change_pct > 0 ? '+' : ''}{Number(r.change_pct).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Covenant Health — only shown when data is present */}
        {!insightsLoading && covenantRow && (
          <Card className="shadow-sm">
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Covenant Health</p>
              <CovenantGauge value={Number(covenantRow.covenant_value) || parseFloat(covenantRow.current_value)} />
            </CardContent>
          </Card>
        )}

        {/* Management Tone */}
        <Card className="shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Management Tone — Q3 Earnings Call</p>
            <ToneBar holdingId={selectedId} />
          </CardContent>
        </Card>

        {/* Source Citations */}
        <Card className="shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source Citations</p>
            <div className="space-y-3">
              {(CITATIONS[selectedId] ?? CITATIONS.default).map((c) => (
                <div key={c.label} className="space-y-1">
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full border border-[#1a3a5c]/30 text-[#1a3a5c] bg-[#1a3a5c]/5 font-medium cursor-pointer hover:bg-[#1a3a5c]/10 transition-colors">
                    {c.label}
                  </span>
                  <p className="text-xs text-muted-foreground italic leading-relaxed pl-1">{c.snippet}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
