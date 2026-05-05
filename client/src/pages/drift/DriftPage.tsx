import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  useAnalyticsQuery,
  HeatmapChart,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@databricks/appkit-ui/react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown, MessageSquare } from 'lucide-react';
import { useAdvisor } from '../../contexts/AdvisorContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccountDriftRow {
  advisor_id: string;
  client_id: string;
  client_name: string;
  account_id: string;
  account_name: string;
  account_aum: number;
  asset_class: string;
  actual_dollars: number;
  actual_pct: number;
  target_pct: number;
  min_pct: number;
  max_pct: number;
  target_dollars: number;
  min_dollars: number;
  max_dollars: number;
  delta_pct: number;
  delta_dollars: number;
  drift_status: string;
  band_distance_pct: number;
  rebalance_to_band: number;
  rebalance_to_target: number;
  risk_profile: string;
  drift_severity: string;
}

type SortKey = keyof AccountDriftRow;
type SortDir = 'asc' | 'desc';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtM = (v: number) => {
  const n = Number(v);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}B`;
  if (abs >= 1) return `${sign}$${abs.toFixed(1)}M`;
  return `${sign}$${(abs * 1000).toFixed(0)}K`;
};

const fmtPct = (v: number, sign = true) =>
  `${sign && v > 0 ? '+' : ''}${Number(v).toFixed(1)}%`;

const fmtBand = (min: number, max: number) => {
  const lo = Number(min), hi = Number(max);
  return lo === 0 && hi === 0 ? '—' : `${lo.toFixed(0)}–${hi.toFixed(0)}%`;
};

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'Over Band')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        <TrendingUp className="w-3 h-3" /> Over Band
      </span>
    );
  if (status === 'Under Band')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <TrendingDown className="w-3 h-3" /> Under Band
      </span>
    );
  if (status === 'No IPS Target')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200 opacity-80">
        <AlertTriangle className="w-3 h-3" /> No IPS Target
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> Within Band
    </span>
  );
}

function rowBg(status: string, _idx: number, clientGroupEven: boolean) {
  if (status === 'Over Band') return 'bg-red-50/60';
  if (status === 'Under Band') return 'bg-amber-50/60';
  if (status === 'No IPS Target') return 'bg-red-50/30';
  return clientGroupEven ? 'bg-white' : 'bg-slate-50/50';
}

// ── KPI stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, loading, accent,
}: {
  label: string; value: string; sub: string; loading: boolean; accent?: 'red' | 'amber' | 'neutral';
}) {
  const color =
    accent === 'red' ? 'text-red-600' :
    accent === 'amber' ? 'text-amber-600' :
    'text-foreground';
  return (
    <Card className="shadow-sm">
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
            <p className={`text-2xl font-semibold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Asset class summary strip ─────────────────────────────────────────────────

interface AssetClassStats {
  assetClass: string;
  over: number;
  under: number;
  noTarget: number;
  within: number;
  totalRtt: number; // sum of abs(rebalance_to_target) for breaches
}

function AssetClassSummary({ stats, loading }: { stats: AssetClassStats[]; loading: boolean }) {
  const ORDER = ['Equity', 'Alternatives', 'Fixed Income', 'Private Credit', 'ETF', 'Cash'];
  const sorted = [...stats].sort(
    (a, b) => ORDER.indexOf(a.assetClass) - ORDER.indexOf(b.assetClass),
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {sorted.map((s) => {
        const breachCount = s.over + s.under;
        const hasBreaches = breachCount > 0;
        return (
          <div
            key={s.assetClass}
            className={`flex items-center justify-between rounded-md border px-3 py-2 ${hasBreaches ? 'border-red-200 bg-red-50/40' : 'border-border bg-muted/20'}`}
          >
            <p className="text-xs font-semibold text-foreground">{s.assetClass}</p>
            <div className="flex items-center gap-2 text-xs">
              {s.over > 0 && <span className="text-red-700 font-medium">{s.over} over</span>}
              {s.under > 0 && <span className="text-amber-700 font-medium">{s.under} under</span>}
              {!hasBreaches && <span className="text-emerald-700">{s.within} ✓</span>}
              {hasBreaches && (
                <span className="text-muted-foreground tabular-nums">{fmtM(s.totalRtt)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: string; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground/50 inline ml-0.5" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 inline ml-0.5" />
    : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DriftPage() {
  const navigate = useNavigate();
  const { advisor, params: advisorParams } = useAdvisor();
  const { data: rawData, loading } = useAnalyticsQuery('account_drift', advisorParams);

  const rows = useMemo(
    () => (rawData ?? []) as unknown as AccountDriftRow[],
    [rawData],
  );

  // ── Filter state ────────────────────────────────────────────────────────────
  const [clientFilter, setClientFilter] = useState('');
  const [assetFilter, setAssetFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('client_id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── Derived: unique filter options ──────────────────────────────────────────
  const clients = useMemo(
    () => [...new Map(rows.map((r) => [r.client_id, r.client_name])).entries()],
    [rows],
  );
  const assetClasses = useMemo(
    () => [...new Set(rows.map((r) => r.asset_class))].sort(),
    [rows],
  );

  // ── Derived: KPI summary ────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const breachRows = rows.filter((r) => r.drift_status !== 'Within Band');
    const driftingAccounts = new Set(breachRows.map((r) => r.account_id)).size;
    const clientsAtRisk = new Set(breachRows.map((r) => r.client_id)).size;
    const totalBand = breachRows.reduce((s, r) => s + Math.abs(r.rebalance_to_band), 0);
    const totalTarget = rows.reduce((s, r) => s + Math.abs(r.rebalance_to_target), 0);
    return { driftingAccounts, clientsAtRisk, totalBand, totalTarget };
  }, [rows]);

  // ── Derived: asset class breakdown ─────────────────────────────────────────
  const assetStats = useMemo<AssetClassStats[]>(() => {
    const map = new Map<string, AssetClassStats>();
    for (const r of rows) {
      if (!map.has(r.asset_class)) {
        map.set(r.asset_class, {
          assetClass: r.asset_class,
          over: 0, under: 0, noTarget: 0, within: 0, totalRtt: 0,
        });
      }
      const s = map.get(r.asset_class)!;
      if (r.drift_status === 'Over Band') { s.over++; s.totalRtt += Math.abs(r.rebalance_to_target); }
      else if (r.drift_status === 'Under Band') { s.under++; s.totalRtt += Math.abs(r.rebalance_to_target); }
      else if (r.drift_status === 'No IPS Target') { s.noTarget++; s.totalRtt += Math.abs(r.rebalance_to_target); }
      else s.within++;
    }
    return [...map.values()];
  }, [rows]);

  // ── Derived: client group parity for row shading ────────────────────────────
  const clientOrder = useMemo(
    () => [...new Set(rows.map((r) => r.client_id))],
    [rows],
  );

  // ── Filtered + sorted rows ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let out = rows.filter(
      (r) =>
        (!clientFilter || r.client_id === clientFilter) &&
        (!assetFilter || r.asset_class === assetFilter) &&
        (!statusFilter || r.drift_status === statusFilter),
    );
    const statusPriority = (s: string) => s === 'Over Band' ? 0 : s === 'Under Band' ? 1 : 2;
    out = [...out].sort((a, b) => {
      const sp = statusPriority(a.drift_status) - statusPriority(b.drift_status);
      if (sp !== 0) return sp;
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [rows, clientFilter, assetFilter, statusFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const th = (label: string, key: SortKey, align: 'left' | 'right' = 'right') => (
    <th
      onClick={() => handleSort(key)}
      className={`py-2 pr-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-foreground transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {label}
      <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );

  const breachCount = filtered.filter((r) => r.drift_status !== 'Within Band').length;

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Drift Analysis</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {advisor.name} · {advisor.title} · IPS compliance across all accounts
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Accounts Drifting"
          value={loading ? '—' : String(summary.driftingAccounts)}
          sub="out-of-band accounts"
          loading={loading}
          accent="red"
        />
        <StatCard
          label="Clients at Risk"
          value={loading ? '—' : String(summary.clientsAtRisk)}
          sub="with ≥1 breach"
          loading={loading}
          accent="amber"
        />
        <StatCard
          label="$ to Band"
          value={loading ? '—' : fmtM(summary.totalBand)}
          sub="min trade to resolve breaches"
          loading={loading}
          accent="amber"
        />
        <StatCard
          label="$ to Target"
          value={loading ? '—' : fmtM(summary.totalTarget)}
          sub="full rebalance across book"
          loading={loading}
          accent="neutral"
        />
      </div>

      {/* Asset class summary + concentration risk heatmap */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="shadow-sm col-span-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Drift by Asset Class</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <AssetClassSummary stats={assetStats} loading={loading} />
          </CardContent>
        </Card>
        <Card className="shadow-sm col-span-3">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">
              Drift by Asset Class &amp; Risk Profile (Δ%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HeatmapChart
              queryKey="concentration_risk"
              parameters={advisorParams}
              xKey="asset_class"
              yAxisKey="risk_profile"
              showLabels
              min={-10}
              max={10}
              colors={['#b45309', '#fde68a', '#ffffff', '#fecaca', '#dc2626']}
            />
          </CardContent>
        </Card>
      </div>

      {/* Full detail table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-semibold">
              Account &amp; Asset Class Detail
              {!loading && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {filtered.length} rows
                  {breachCount > 0 && (
                    <span className="ml-1 text-red-600 font-medium">· {breachCount} breaches</span>
                  )}
                </span>
              )}
            </CardTitle>
            {/* Filters */}
            <div className="flex gap-2 flex-wrap items-center">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All clients</option>
                {clients.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <select
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value)}
                className="h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All asset classes</option>
                {assetClasses.map((ac) => (
                  <option key={ac} value={ac}>{ac}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All statuses</option>
                <option value="Over Band">Over Band</option>
                <option value="Under Band">Under Band</option>
                <option value="Within Band">Within Band</option>
              </select>
              {(clientFilter || assetFilter || statusFilter) && (
                <button
                  onClick={() => { setClientFilter(''); setAssetFilter(''); setStatusFilter(''); }}
                  className="h-7 px-2 text-xs rounded border border-input bg-background hover:bg-muted transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No rows match filters</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b">
                    {th('Client', 'client_name', 'left')}
                    {th('Account', 'account_name', 'left')}
                    {th('Asset Class', 'asset_class', 'left')}
                    {th('Actual $', 'actual_dollars')}
                    {th('Actual %', 'actual_pct')}
                    {th('Target %', 'target_pct')}
                    <th className="py-2 pr-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Band
                    </th>
                    {th('Δ%', 'delta_pct')}
                    {th('$ to Band', 'rebalance_to_band')}
                    {th('$ to Target', 'rebalance_to_target')}
                    <th className="py-2 pr-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-2 pl-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const groupEven = clientOrder.indexOf(row.client_id) % 2 === 0;
                    const bg = rowBg(row.drift_status, i, groupEven);
                    const prevRow = filtered[i - 1];
                    const showClientName = !prevRow || prevRow.client_id !== row.client_id;
                    const showAccountName = !prevRow ||
                      prevRow.account_id !== row.account_id ||
                      prevRow.client_id !== row.client_id;
                    const deltaNeg = row.delta_pct < 0;
                    const rttNeg = row.rebalance_to_target < 0;

                    return (
                      <tr key={`${row.account_id}-${row.asset_class}`} className={`border-b last:border-0 ${bg} transition-colors`}>
                        {/* Client */}
                        <td className="py-1.5 pr-3 font-medium text-foreground whitespace-nowrap max-w-[120px] truncate">
                          {showClientName ? row.client_name : ''}
                        </td>
                        {/* Account */}
                        <td className="py-1.5 pr-3 text-muted-foreground max-w-[160px] truncate">
                          {showAccountName ? row.account_name : ''}
                        </td>
                        {/* Asset Class */}
                        <td className="py-1.5 pr-3 text-foreground whitespace-nowrap">{row.asset_class}</td>
                        {/* Actual $ */}
                        <td className="py-1.5 pr-3 text-right tabular-nums font-medium">
                          {fmtM(row.actual_dollars)}
                        </td>
                        {/* Actual % */}
                        <td className="py-1.5 pr-3 text-right tabular-nums">
                          {fmtPct(row.actual_pct, false)}
                        </td>
                        {/* Target % */}
                        <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">
                          {row.target_pct === 0 ? <span className="text-red-400 text-xs">none</span> : fmtPct(row.target_pct, false)}
                        </td>
                        {/* Band */}
                        <td className="py-1.5 pr-3 text-right tabular-nums text-xs text-muted-foreground">
                          {fmtBand(row.min_pct, row.max_pct)}
                        </td>
                        {/* Δ% */}
                        <td className={`py-1.5 pr-3 text-right tabular-nums font-medium ${deltaNeg ? 'text-amber-600' : row.delta_pct > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {fmtPct(row.delta_pct)}
                        </td>
                        {/* $ to Band */}
                        <td className="py-1.5 pr-3 text-right tabular-nums text-xs">
                          {row.rebalance_to_band === 0
                            ? <span className="text-muted-foreground">—</span>
                            : <span className="text-amber-700 font-medium">{fmtM(row.rebalance_to_band)}</span>
                          }
                        </td>
                        {/* $ to Target */}
                        <td className="py-1.5 pr-3 text-right tabular-nums text-xs">
                          {row.rebalance_to_target === 0
                            ? <span className="text-muted-foreground">—</span>
                            : (
                              <span className={rttNeg ? 'text-red-600 font-medium' : 'text-emerald-700 font-medium'}>
                                {rttNeg ? '' : '+'}{fmtM(row.rebalance_to_target)}
                              </span>
                            )
                          }
                        </td>
                        {/* Status */}
                        <td className="py-1.5 pr-3 text-right">
                          <StatusBadge status={row.drift_status} />
                        </td>
                        {/* Action */}
                        <td className="py-1.5 pl-3 text-right">
                          {(row.drift_status === 'Over Band' || row.drift_status === 'Under Band') && (
                            <button
                              onClick={() => navigate('/agents', { state: { trigger: 'ips_drift', row } })}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#1a3a5c] text-white hover:bg-[#1a3a5c]/85 transition-colors whitespace-nowrap"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Draft Comms
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
