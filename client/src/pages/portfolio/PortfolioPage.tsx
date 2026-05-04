import { useNavigate } from 'react-router';
import {
  useAnalyticsQuery,
  AreaChart,
  DonutChart,
  HeatmapChart,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Badge,
} from '@databricks/appkit-ui/react';
import { TrendingUp, TrendingDown, AlertCircle, Clock } from 'lucide-react';

// ── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

function StatCard({ label, value, sub, trend, loading }: StatCardProps) {
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
  aum_millions: number;
  pct_of_portfolio: number;
  ytd_return: number;
  risk_flag: string;
}

function RiskBadge({ flag }: { flag: string }) {
  if (flag === 'alert') return <Badge variant="destructive" className="text-xs py-0">Alert</Badge>;
  if (flag === 'watch') return <Badge className="text-xs py-0 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Watch</Badge>;
  return <span className="text-muted-foreground text-sm">—</span>;
}

interface HoldingsTableProps {
  data: Holding[] | undefined;
  loading: boolean;
  onRowClick: (holdingId: string) => void;
}

function HoldingsTable({ data, loading, onRowClick }: HoldingsTableProps) {
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
            <th className="text-left py-2 pr-4 font-medium">Name</th>
            <th className="text-left py-2 pr-4 font-medium">Asset Class</th>
            <th className="text-right py-2 pr-4 font-medium">AUM ($M)</th>
            <th className="text-right py-2 pr-4 font-medium">% Portfolio</th>
            <th className="text-right py-2 pr-4 font-medium">YTD Return</th>
            <th className="text-center py-2 font-medium">Risk</th>
          </tr>
        </thead>
        <tbody>
          {data.map((h) => (
            <tr
              key={h.holding_id}
              onClick={() => onRowClick(h.holding_id)}
              className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <td className="py-2.5 pr-4 font-medium text-foreground">{h.name}</td>
              <td className="py-2.5 pr-4 text-muted-foreground">{h.asset_class}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums">{Number(h.aum_millions).toFixed(1)}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums">{Number(h.pct_of_portfolio).toFixed(1)}%</td>
              <td className={`py-2.5 pr-4 text-right tabular-nums ${Number(h.ytd_return) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {Number(h.ytd_return) >= 0 ? '+' : ''}{Number(h.ytd_return).toFixed(1)}%
              </td>
              <td className="py-2.5 text-center">
                <RiskBadge flag={h.risk_flag} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Alerts Feed ──────────────────────────────────────────────────────────────

function AlertsFeed({ onCovenantClick, onDriftClick }: { onCovenantClick: () => void; onDriftClick: () => void }) {
  const alerts = [
    {
      level: 'critical' as const,
      title: 'Covenant breach risk',
      body: 'Blackstone PE SC IV — headroom compressed to 0.3x',
      time: '2 min ago',
      onClick: onCovenantClick,
    },
    {
      level: 'warning' as const,
      title: 'Allocation drift',
      body: 'Private Credit 3% above IPS target for R. Weinstein',
      time: '14 min ago',
      onClick: onDriftClick,
    },
  ];

  return (
    <div className="space-y-3">
      {alerts.map((alert, i) => (
        <button
          key={i}
          onClick={alert.onClick}
          className="w-full text-left flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <AlertCircle
            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${alert.level === 'critical' ? 'text-red-500' : 'text-amber-500'}`}
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${alert.level === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>
              {alert.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{alert.body}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Clock className="w-3 h-3" />
            {alert.time}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Portfolio Page ────────────────────────────────────────────────────────────

export function PortfolioPage() {
  const navigate = useNavigate();

  const { data: summary, loading: summaryLoading } = useAnalyticsQuery('portfolio_summary');
  const { data: holdings, loading: holdingsLoading } = useAnalyticsQuery('top_holdings');

  const s = summary?.[0] as Record<string, number> | undefined;

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Portfolio Intelligence</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          James Chen · Managing Director, AWM · As of Nov 2025
        </p>
      </div>

      {/* KPI stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total AUM"
          value={s ? `$${s.total_aum_billions}B` : '—'}
          sub="+$0.3B QTD"
          trend="up"
          loading={summaryLoading}
        />
        <StatCard
          label="Perf vs Benchmark"
          value={s ? `+${s.perf_vs_bench_pct}%` : '—'}
          sub="YTD alpha"
          trend="up"
          loading={summaryLoading}
        />
        <StatCard
          label="Allocation Drift"
          value={s ? `${s.drift_count} assets` : '—'}
          sub="Above threshold"
          trend="down"
          loading={summaryLoading}
        />
        <StatCard
          label="Clients at Risk"
          value={s ? String(s.clients_at_risk) : '—'}
          sub="Needs review"
          trend="down"
          loading={summaryLoading}
        />
      </div>

      {/* Bento row 1: Asset Allocation + Performance */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart queryKey="asset_allocation" />
          </CardContent>
        </Card>

        <Card className="col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Performance vs Benchmark — YTD (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart queryKey="performance_timeseries" />
          </CardContent>
        </Card>
      </div>

      {/* Bento row 2: Holdings table + Alerts */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <HoldingsTable
              data={holdings as unknown as Holding[]}
              loading={holdingsLoading}
              onRowClick={(id) => navigate(`/documents?holding=${id}`)}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertsFeed
              onCovenantClick={() => navigate('/agents')}
              onDriftClick={() => navigate('/documents')}
            />
          </CardContent>
        </Card>
      </div>

      {/* Bento row 3: Concentration risk heatmap */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Client Concentration Risk — Allocation vs IPS Target (Δ%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HeatmapChart
            queryKey="concentration_risk"
            yAxisKey="client_name"
            showLabels
            min={-10}
            max={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}
