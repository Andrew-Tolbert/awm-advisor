import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  useAnalyticsQuery,
  AreaChart,
  DonutChart,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@databricks/appkit-ui/react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useAdvisor } from '../../contexts/AdvisorContext';

// ── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'neutral';
  loading?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, sub, trend, loading, onClick }: StatCardProps) {
  return (
    <Card
      className={`shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:border-foreground/20 transition-all' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-600" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
              <span className={`text-xs ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
                {sub}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Holdings Table ───────────────────────────────────────────────────────────

interface Holding {
  holding_id: string;
  name: string;
  asset_class: string;
  aum: number;
  pct_of_portfolio: number;
  ytd_return: number;
}

interface HoldingsTableProps {
  data: Holding[] | undefined;
  loading: boolean;
  onRowClick: (holdingId: string) => void;
  assetClassFilter?: string;
}

function HoldingsTable({ data, loading, onRowClick, assetClassFilter: externalFilter = '' }: HoldingsTableProps) {
  const [nameFilter, setNameFilter] = useState('');
  const [assetClassFilter, setAssetClassFilter] = useState(externalFilter);

  useEffect(() => { setAssetClassFilter(externalFilter); }, [externalFilter]);

  const assetClasses = useMemo(
    () => [...new Set((data ?? []).map((h) => h.asset_class))].sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const name = nameFilter.toLowerCase();
    return rows.filter(
      (h) =>
        (!name || h.name.toLowerCase().includes(name)) &&
        (!assetClassFilter || h.asset_class === assetClassFilter),
    );
  }, [data, nameFilter, assetClassFilter]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No holdings found</p>;
  }

  return (
    <div className="space-y-2">
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search name…"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring w-40"
        />
        <select
          value={assetClassFilter}
          onChange={(e) => setAssetClassFilter(e.target.value)}
          className="h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All classes</option>
          {assetClasses.map((ac) => <option key={ac} value={ac}>{ac}</option>)}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length}{filtered.length !== data.length ? ` of ${data.length}` : ''} holdings
        </span>
      </div>

      {/* Scrollable table — first ~10 rows visible, scroll for more */}
      <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: '420px' }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left py-2 pr-4 font-medium">Name</th>
              <th className="text-left py-2 pr-4 font-medium">Asset Class</th>
              <th className="text-right py-2 pr-4 font-medium">AUM</th>
              <th className="text-right py-2 pr-4 font-medium">% Portfolio</th>
              <th className="text-right py-2 pr-4 font-medium">YTD Return</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr
                key={h.holding_id}
                onClick={() => onRowClick(h.holding_id)}
                className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <td className="py-2.5 pr-4 font-medium text-foreground">{h.name}</td>
                <td className="py-2.5 pr-4 text-muted-foreground">{h.asset_class}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums">{(() => {
                  const v = Number(h.aum);
                  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
                  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
                  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
                  return `$${v.toFixed(0)}`;
                })()}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums">{Number(h.pct_of_portfolio).toFixed(1)}%</td>
                <td className={`py-2.5 pr-4 text-right tabular-nums ${Number(h.ytd_return) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {Number(h.ytd_return) >= 0 ? '+' : ''}{Number(h.ytd_return).toFixed(1)}%
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No holdings match filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Alerts Feed ──────────────────────────────────────────────────────────────

interface AlertItem {
  level: 'critical' | 'warning' | 'positive';
  title: string;
  body: string;
  onClick: () => void;
}

const ALERT_COLORS: Record<AlertItem['level'], { icon: string; title: string; border: string; hover: string }> = {
  critical: { icon: 'text-red-500',     title: 'text-red-700',     border: 'border-red-200',    hover: 'hover:bg-red-50/50' },
  warning:  { icon: 'text-amber-500',   title: 'text-amber-700',   border: 'border-amber-200',  hover: 'hover:bg-amber-50/50' },
  positive: { icon: 'text-emerald-500', title: 'text-emerald-700', border: 'border-emerald-200', hover: 'hover:bg-emerald-50/50' },
};

function AlertCard({ alert }: { alert: AlertItem }) {
  const c = ALERT_COLORS[alert.level];
  return (
    <button
      onClick={alert.onClick}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border ${c.border} ${c.hover} transition-colors cursor-pointer`}
    >
      <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.icon}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${c.title}`}>{alert.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-3" title={alert.body}>
          {alert.body}
        </p>
      </div>
    </button>
  );
}

function AlertsFeed({ signals, drift }: { signals: AlertItem[]; drift: AlertItem[] }) {
  const empty = signals.length === 0 && drift.length === 0;
  if (empty) {
    return <p className="text-sm text-muted-foreground text-center py-6">No active alerts</p>;
  }

  return (
    <div className="space-y-2">
      {signals.map((a, i) => <AlertCard key={i} alert={a} />)}

      {signals.length > 0 && drift.length > 0 && (
        <div className="flex items-center gap-2 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            IPS Drift
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {drift.map((a, i) => <AlertCard key={i} alert={a} />)}
    </div>
  );
}

// ── Portfolio Page ────────────────────────────────────────────────────────────

interface DriftRow {
  client_name: string;
  account_name: string;
  asset_class: string;
  delta_pct: number;
  drift_status: string;
  drift_severity: string;
  rebalance_to_band: number;
}

interface AlertSignalRow {
  signal_id: string;
  symbol: string;
  company_name: string;
  signal_date: string;
  source_type: string;
  source_description: string;
  sentiment: string;
  severity_score: number;
  advisor_action_needed: boolean;
  signal_type: string;
  signal: string;
  signal_value: string;
  total_exposure: number;
  rationale: string;
}

export function PortfolioPage() {
  const navigate = useNavigate();
  const { advisor, params: advisorParams } = useAdvisor();

  const { data: summary, loading: summaryLoading } = useAnalyticsQuery('portfolio_summary', advisorParams);
  const { data: holdings, loading: holdingsLoading } = useAnalyticsQuery('top_holdings', advisorParams);
  const { data: driftData } = useAnalyticsQuery('account_drift', advisorParams);
  const { data: allocationData } = useAnalyticsQuery('asset_allocation', advisorParams);
  const { data: alertsData } = useAnalyticsQuery('alerts', advisorParams);

  const driftAlerts = useMemo<AlertItem[]>(() => {
    const rows = (driftData ?? []) as unknown as DriftRow[];
    return rows
      .filter((r) => r.drift_severity === 'Critical')
      .map((r) => {
        const direction = r.delta_pct > 0 ? 'over' : 'under';
        const absDelta = Math.abs(Number(r.delta_pct)).toFixed(1);
        const absBand = Math.abs(Number(r.rebalance_to_band));
        const bandStr = absBand >= 1 ? `$${absBand.toFixed(1)}M` : `$${(absBand * 1000).toFixed(0)}K`;
        return {
          level: 'critical' as const,
          title: `Allocation Drift — ${r.client_name}`,
          body: `${r.account_name} · ${r.asset_class} is ${absDelta}% ${direction} IPS target · ${bandStr} to resolve`,
          onClick: () => navigate('/drift'),
        };
      });
  }, [driftData, navigate]);

  const signalAlerts = useMemo<AlertItem[]>(() => {
    const rows = ((alertsData ?? []) as unknown as AlertSignalRow[])
      .filter(r => !r.signal_type?.startsWith('IPS'));
    const fmtExposure = (v: number) => {
      const n = Number(v);
      if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
      if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
      return `$${n.toFixed(0)}`;
    };
    return rows.map((r) => {
      const sentiment = r.sentiment?.toLowerCase() ?? '';
      const level: AlertItem['level'] =
        sentiment === 'positive' || sentiment === 'improving'
          ? 'positive'
          : Number(r.severity_score) >= 0.8 && r.advisor_action_needed
          ? 'critical'
          : 'warning';
      return {
        level,
        title: `${r.company_name} — ${r.signal_type}`,
        body: `${fmtExposure(r.total_exposure)} exposure · ${r.source_description}`,
        onClick: () => navigate(`/documents?holding=${encodeURIComponent(r.symbol)}`),
      };
    });
  }, [alertsData, navigate]);

  const [holdingsAssetFilter, setHoldingsAssetFilter] = useState('');

  const s = summary?.[0] as Record<string, number> | undefined;

  const fmtAum = (v: number) => {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toLocaleString()}`;
  };
  const fmtAumDelta = (v: number) => {
    const sign = v >= 0 ? '+' : '-';
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B QTD`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M QTD`;
    return `${sign}$${abs.toLocaleString()} QTD`;
  };
  const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v}%`;

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Portfolio Intelligence</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {advisor.name} · {advisor.title} · As of Nov 2025
        </p>
      </div>

      {/* KPI stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total AUM"
          value={s ? fmtAum(s.total_aum) : '—'}
          sub={s ? fmtAumDelta(s.qtd_aum_change) : '—'}
          trend={s ? (s.qtd_aum_change >= 0 ? 'up' : 'down') : 'neutral'}
          loading={summaryLoading}
        />
        <StatCard
          label="Perf vs Benchmark"
          value={s ? fmtPct(s.perf_vs_bench_pct) : '—'}
          sub="YTD alpha"
          trend={s ? (s.perf_vs_bench_pct >= 0 ? 'up' : 'down') : 'neutral'}
          loading={summaryLoading}
        />
        <StatCard
          label="Allocation Drift"
          value={s ? `${s.drift_count} assets` : '—'}
          sub="Above threshold"
          trend="down"
          loading={summaryLoading}
          onClick={() => navigate('/drift')}
        />
        <StatCard
          label="Clients at Risk"
          value={s ? String(s.clients_at_risk) : '—'}
          sub="Needs review"
          trend="down"
          loading={summaryLoading}
          onClick={() => navigate('/drift')}
        />
      </div>

      {/* Bento row 1: Asset Allocation + Performance */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pr-10">
            <DonutChart
              data={
                (allocationData ?? []).map((row) => {
                  const r = row as Record<string, unknown>;
                  const colorMap: Record<string, string> = {
                    'Equity':         '#3b82f6',
                    'Fixed Income':   '#14b8a6',
                    'Alternatives':   '#a855f7',
                    'Private Credit': '#f59e0b',
                    'Commodities':    '#f97316',
                  };
                  return {
                    ...r,
                    itemStyle: {
                      color: colorMap[r.asset_class as string] ?? '#94a3b8',
                      borderWidth: 2,
                      borderColor: '#ffffff',
                    },
                  };
                })
              }
              showLegend={false}
              height={260}
            />
            {/* Clickable legend — filters Holdings table by asset class */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {((allocationData ?? []) as Array<{ asset_class: string; pct_of_portfolio: number }>).map((row) => {
                const active = holdingsAssetFilter === row.asset_class;
                const acColors: Record<string, { idle: string; on: string }> = {
                  'Equity':         { idle: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',     on: 'bg-blue-600 text-white border-blue-600' },
                  'Fixed Income':   { idle: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',     on: 'bg-teal-600 text-white border-teal-600' },
                  'Alternatives':   { idle: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100', on: 'bg-purple-600 text-white border-purple-600' },
                  'Private Credit': { idle: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', on: 'bg-amber-600 text-white border-amber-600' },
                  'Commodities':    { idle: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100', on: 'bg-orange-600 text-white border-orange-600' },
                };
                const palette = acColors[row.asset_class] ?? { idle: 'bg-muted text-muted-foreground border-border hover:bg-muted/80', on: 'bg-foreground text-background border-foreground' };
                return (
                  <button
                    key={row.asset_class}
                    onClick={() => setHoldingsAssetFilter(active ? '' : row.asset_class)}
                    className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-colors cursor-pointer ${active ? palette.on : palette.idle}`}
                  >
                    {row.asset_class} · {Number(row.pct_of_portfolio).toFixed(1)}%
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 shadow-sm overflow-hidden">
          <CardHeader className="pb-0 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Performance vs Benchmark — Daily (%)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AreaChart
              queryKey="performance_timeseries"
              parameters={advisorParams}
              height={420}
              showLegend
              smooth
              xKey="date"
              colors={['#1a3a5c', '#94a3b8']}

              options={{
                grid: { top: 36, right: 24, bottom: 36, left: 8, containLabel: true },
                xAxis: {
                  type: 'time',
                  boundaryGap: false,
                  axisLine: { lineStyle: { color: '#e2e8f0' } },
                  axisTick: { show: false },
                  splitLine: { show: false },
                  axisLabel: {
                    color: '#94a3b8',
                    fontSize: 10,
                    margin: 10,
                    formatter: (val: number) => {
                      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                      const d = new Date(val);
                      return `${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
                    },
                  },
                },
                yAxis: {
                  axisLabel: {
                    formatter: (v: number) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`,
                    color: '#94a3b8',
                    fontSize: 10,
                  },
                  splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
                  axisLine: { show: false },
                  axisTick: { show: false },
                },
                tooltip: {
                  trigger: 'axis',
                  axisPointer: {
                    type: 'cross',
                    lineStyle: { color: '#1a3a5c', width: 1, type: 'dashed' },
                    crossStyle: { color: '#1a3a5c', width: 1 },
                    label: { backgroundColor: '#1a3a5c' },
                  },
                  backgroundColor: 'rgba(255,255,255,0.96)',
                  borderColor: '#e2e8f0',
                  textStyle: { color: '#1e293b', fontSize: 12 },
                },
                legend: {
                  top: 12,
                  right: 24,
                  textStyle: { color: '#64748b', fontSize: 11 },
                  itemWidth: 20,
                  itemHeight: 3,
                },
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Bento row 2: Holdings table + Alerts */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Top Holdings</CardTitle>
              {holdingsAssetFilter && (
                <button
                  onClick={() => setHoldingsAssetFilter('')}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {holdingsAssetFilter} ×
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <HoldingsTable
              data={holdings as unknown as Holding[]}
              loading={holdingsLoading}
              onRowClick={(id) => navigate(`/documents?holding=${encodeURIComponent(id)}`)}
              assetClassFilter={holdingsAssetFilter}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertsFeed signals={signalAlerts} drift={driftAlerts} />
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
