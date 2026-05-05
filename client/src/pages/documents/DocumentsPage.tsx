import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useAnalyticsQuery, Card, CardContent, Skeleton } from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { AlertTriangle, FileText } from 'lucide-react';
import { useAdvisor } from '../../contexts/AdvisorContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HoldingItem {
  holding_id: string;
  name: string;
  asset_class: string;
  strategy: string;
  aum_millions: number;
  risk_flag: string; // 'alert' | 'watch' | 'none'
}

interface InsightRow {
  sort_order: number;
  kpi_name: string;
  prior_value: string;
  current_value: string;
  change_pct: number;
  flag: string;
  covenant_value: number;
  prior_period: string;
  current_period: string;
}

// ── Types (query results) ─────────────────────────────────────────────────────

interface ToneRow {
  holding_id: string;
  section: string;
  section_order: number;
  positive_pct: number | null;
  neutral_pct: number | null;
  negative_pct: number | null;
  sentiment: string;
  section_note: string;
  earnings_date: string;
  year: number;
  quarter: number;
  quarter_label: string;
  prior_quarter_label: string | null;
  source_description: string;
}

interface CitationRow {
  label: string;
  snippet: string;
}

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

const SENTIMENT_BADGE: Record<string, string> = {
  positive:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  negative:      'bg-red-50 text-red-700 border-red-200',
  mixed:         'bg-amber-50 text-amber-700 border-amber-200',
  neutral:       'bg-slate-50 text-slate-600 border-slate-200',
  improving:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  deteriorating: 'bg-red-50 text-red-700 border-red-200',
  stable:        'bg-slate-50 text-slate-600 border-slate-200',
};

const SENTIMENT_ICON: Record<string, string> = {
  improving: '↑', deteriorating: '↓', stable: '→',
  positive: '', negative: '', mixed: '', neutral: '',
};

function SectionToneBar({ row }: { row: ToneRow }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground w-36 flex-shrink-0">{row.section}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize ${SENTIMENT_BADGE[row.sentiment] ?? ''}`}>
          {row.sentiment}
        </span>
      </div>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden">
        <div className="bg-emerald-500 transition-all" style={{ width: `${row.positive_pct ?? 0}%` }} />
        <div className="bg-slate-300 transition-all"   style={{ width: `${row.neutral_pct ?? 0}%` }} />
        <div className="bg-red-400 transition-all"     style={{ width: `${row.negative_pct ?? 0}%` }} />
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground tabular-nums">
        <span>{row.positive_pct}% positive</span>
        <span>{row.neutral_pct}% neutral</span>
        <span>{row.negative_pct}% negative</span>
      </div>
      <p className="text-[11px] text-muted-foreground italic leading-snug">{row.section_note}</p>
    </div>
  );
}

function ManagementTonePanel({ rows, loading, error }: { rows: ToneRow[]; loading: boolean; error: string | null }) {
  if (loading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (error) return <p className="text-xs text-red-500">{error}</p>;
  if (!rows.length) return <p className="text-xs text-muted-foreground">No tone data available for this holding.</p>;

  const sections = rows.filter((r) => r.section !== 'Delta');
  const delta    = rows.find((r) => r.section === 'Delta');

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Positive</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />Neutral</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Negative</span>
      </div>

      {/* Section bars */}
      <div className="space-y-4">
        {sections.map((row) => <SectionToneBar key={row.section} row={row} />)}
      </div>

      {/* Delta row */}
      {delta && (
        <div className="pt-3 border-t space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">vs Prior Call{rows[0]?.prior_quarter_label ? ` (${rows[0].prior_quarter_label})` : ''}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize ${SENTIMENT_BADGE[delta.sentiment] ?? ''}`}>
              {SENTIMENT_ICON[delta.sentiment]} {delta.sentiment}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground italic leading-snug">{delta.section_note}</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string>(searchParams.get('holding') ?? '');

  const { params: advisorParams } = useAdvisor();
  const { data: holdingsList, loading: listLoading } = useAnalyticsQuery('holdings_list', advisorParams);

  // Auto-select first holding once list loads (if no URL param is set)
  useEffect(() => {
    const urlHolding = searchParams.get('holding');
    if (urlHolding && urlHolding !== selectedId) {
      setSelectedId(urlHolding);
    } else if (!selectedId && holdingsList && (holdingsList as unknown[]).length > 0) {
      const first = (holdingsList as Array<{ holding_id: string }>)[0];
      setSelectedId(first.holding_id);
    }
  }, [searchParams, holdingsList]); // eslint-disable-line react-hooks/exhaustive-deps

  const insightParams = useMemo(
    () => selectedId ? { holding_id: sql.string(selectedId) } : undefined,
    [selectedId],
  );
  const queryOpts = { autoStart: !!selectedId };
  const { data: insights,  loading: insightsLoading } = useAnalyticsQuery('company_fundamentals', insightParams, queryOpts);
  const { data: citesData, loading: citesLoading }    = useAnalyticsQuery('source_citations',     insightParams, queryOpts);

  // Load all management tone rows once — filter client-side by selectedId
  const { data: allToneData, loading: toneLoading, error: toneError } = useAnalyticsQuery('management_tone');

  const holdings = (holdingsList ?? []) as HoldingItem[];
  const rows     = (insights   ?? []) as InsightRow[];
  const toneRows = ((allToneData ?? []) as ToneRow[]).filter((r) => r.holding_id === selectedId);
  const citations = (citesData ?? []) as CitationRow[];

  const selectedHolding = holdings.find((h) => h.holding_id === selectedId);
  const covenantRow = rows.find((r) => r.kpi_name === 'Covenant Headroom');

  function selectHolding(id: string) {
    setSelectedId(id);
    setSearchParams({ holding: id });
  }

  const [holdingSearch, setHoldingSearch] = useState('');

  const filteredHoldings = useMemo(() => {
    const q = holdingSearch.toLowerCase();
    return q ? holdings.filter((h) => h.name.toLowerCase().includes(q) || h.asset_class.toLowerCase().includes(q)) : holdings;
  }, [holdings, holdingSearch]);

  return (
    <div className="flex gap-0 border rounded-lg overflow-hidden max-w-[1400px]" style={{ height: 'calc(100vh - 120px)' }}>

      {/* ── Left panel: holdings + docs list ── */}
      <div className="w-64 flex-shrink-0 border-r bg-muted/20 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b flex-shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Holdings</p>
          <input
            type="text"
            placeholder="Search…"
            value={holdingSearch}
            onChange={(e) => setHoldingSearch(e.target.value)}
            className="w-full h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {holdingSearch && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {filteredHoldings.length} of {holdings.length}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {listLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))
            : filteredHoldings.map((h) => (
                <button
                  key={h.holding_id}
                  onClick={() => selectHolding(h.holding_id)}
                  className={`w-full text-left px-4 py-2.5 border-b transition-colors hover:bg-muted/50 ${
                    selectedId === h.holding_id ? 'bg-muted border-l-[3px] border-l-[#1a3a5c] pl-[13px]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-1">{h.name}</p>
                    {h.risk_flag === 'alert' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                    {h.risk_flag === 'watch' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                  </div>
                  <div className="mt-0.5">
                    <AssetClassBadge cls={h.asset_class} />
                  </div>
                </button>
              ))
          }
          {!listLoading && filteredHoldings.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No holdings match</p>
          )}
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
      <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
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

        {/* KPI Delta Table — only when a holding is selected and data exists */}
        {selectedId && (insightsLoading || rows.length > 0) && (
          <Card className="shadow-sm">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {rows[0]
                  ? `Key Metrics — ${rows[0].prior_period} vs ${rows[0].current_period}`
                  : 'Key Metrics'}
              </p>
              {insightsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-2 pr-6 font-medium">KPI</th>
                      <th className="text-right py-2 pr-6 font-medium">Prior</th>
                      <th className="text-right py-2 pr-6 font-medium">Current</th>
                      <th className="text-right py-2 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.kpi_name} className="border-b last:border-0">
                        <td className="py-2.5 pr-6 font-medium text-foreground">{r.kpi_name}</td>
                        <td className="py-2.5 pr-6 text-right text-muted-foreground tabular-nums">{r.prior_value}</td>
                        <td className="py-2.5 pr-6 text-right tabular-nums"><FlagCell flag={r.flag} value={r.current_value} /></td>
                        <td className={`py-2.5 text-right text-xs tabular-nums ${
                          r.flag === 'up' ? 'text-emerald-600' :
                          r.flag === 'alert' ? 'text-red-600' :
                          'text-orange-500'
                        }`}>
                          {Number(r.change_pct) > 0 ? '+' : ''}{Number(r.change_pct).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Covenant Health — only shown when a covenant value > 0 is present */}
        {!insightsLoading && covenantRow && Number(covenantRow.covenant_value) > 0 && (
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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Management Tone — {toneRows.find(r => r.section === 'Overall')?.quarter_label ?? ''} Earnings Call</p>
            <ManagementTonePanel rows={toneRows} loading={toneLoading} error={toneError} />
          </CardContent>
        </Card>

        {/* Source Citations */}
        <Card className="shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source Citations</p>
            {citesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {citations.map((c) => (
                  <div key={c.label} className="space-y-1">
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full border border-[#1a3a5c]/30 text-[#1a3a5c] bg-[#1a3a5c]/5 font-medium cursor-pointer hover:bg-[#1a3a5c]/10 transition-colors">
                      {c.label}
                    </span>
                    <p className="text-xs text-muted-foreground italic leading-relaxed pl-1">{c.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
