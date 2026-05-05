import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Card, CardContent, Badge } from '@databricks/appkit-ui/react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, CheckCheck } from 'lucide-react';

// ── Hard-coded cascade data (wireframe) ───────────────────────────────────────

const CASCADE = {
  holding_name: 'Blackstone PE Strategic Capital IV',
  triggered_at: 'Nov 4, 2025 · 6:47 AM',
  trigger: 'Covenant headroom compressed: 0.7x → 0.3x (Q3 2025 10-K)',
  agents: [
    {
      id: 1,
      name: 'Research Agent',
      summary: 'Detected covenant compression in Q3 10-K filing.',
      detail: 'Parsed 248-page 10-K filing (filed Oct 31, 2025). Identified covenant headroom metric on p.47: compressed from 0.7x to 0.3x against a 1.0x minimum threshold. Cross-referenced Q3 earnings transcript — management tone shifted cautious. Flagged interest coverage at 2.4x, approaching 2.0x floor.',
    },
    {
      id: 2,
      name: 'Portfolio Construction Agent',
      summary: 'Found 3 client accounts with exposure — $101M total.',
      detail: 'Scanned all 47 UHNW/HNW client portfolios. Identified 3 accounts with Blackstone PE SC IV positions: R. Weinstein ($48M, 18.2% of PC allocation), S. Chen ($31M, 14.7%), J. Park ($22M, 11.4%). All 3 exceed their IPS private credit target. Combined exposure: $101M.',
    },
    {
      id: 3,
      name: 'Client Personalization Agent',
      summary: 'Drafted 3 personalized communications in advisor tone.',
      detail: 'Generated individualized outreach for each affected client using 6 months of prior advisor–client email history to match tone and style. Each draft references the client\'s specific allocation, IPS target, and a proposed re-allocation scenario. Drafts flagged for advisor review before send.',
    },
  ],
  affected_clients: [
    { name: 'Robert Weinstein', aum_millions: 48, tier: 'UHNW' },
    { name: 'Sarah Chen',       aum_millions: 31, tier: 'UHNW' },
    { name: 'James Park',       aum_millions: 22, tier: 'HNW'  },
  ],
  draft_templates: [
    `Dear Robert,\n\nI wanted to proactively reach out regarding your position in Blackstone PE Strategic Capital IV. Our analysis of their recently filed Q3 10-K identified a meaningful compression in covenant headroom — from 0.7x to 0.3x — which warrants a brief conversation.\n\nGiven your current 18.2% allocation to private credit relative to your 15% IPS target, I'd recommend we discuss a modest reallocation into high-yield bonds to reduce concentration risk while maintaining yield.\n\nI have time Thursday or Friday this week. Would either work?\n\nBest,\nJames`,
    `Dear Sarah,\n\nI'm reaching out about your Blackstone PE Strategic Capital IV holding. A review of their Q3 filing flagged compressed covenant headroom (0.7x → 0.3x), and I wanted to brief you before this becomes market news.\n\nYour private credit allocation is currently at 14.7% against a 15% IPS target — you're well-positioned, but I'd like to walk you through a scenario analysis.\n\nAre you available for a brief call this week?\n\nBest,\nJames`,
    `Dear James,\n\nFollowing our analysis of the Blackstone PE Strategic Capital IV Q3 filing, I wanted to flag a development in your portfolio. Covenant headroom has compressed to 0.3x — a level that merits proactive review.\n\nYour current private credit allocation sits at 11.4% against an IPS target of 12%, so you have room to work with. I've modeled a scenario I'd like to walk through with you.\n\nPlease let me know your availability.\n\nBest,\nJames`,
  ],
  reallocation: {
    from_asset: 'Private Credit',
    from_pct: 18,
    to_asset: 'High Yield Bonds',
    to_pct: 14,
    risk_impact: '−0.3%',
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function AgentStep({
  agent,
  visible,
}: {
  agent: (typeof CASCADE.agents)[0];
  visible: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {agent.id < 3 && <div className="w-px flex-1 bg-emerald-200 mt-1 mb-1" />}
        </div>
        <div className="pb-4 flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Agent {agent.id}: {agent.name}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{agent.summary}</p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-[#1a3a5c] mt-1 hover:underline"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide detail' : 'View detail'}
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed bg-muted/50 rounded p-3 border">
              {agent.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── IPS Drift cascade builder ─────────────────────────────────────────────────

interface DriftRow {
  client_name: string;
  account_id: string;
  account_name: string;
  account_aum: number;
  asset_class: string;
  actual_pct: number;
  target_pct: number;
  min_pct: number;
  max_pct: number;
  delta_pct: number;
  rebalance_to_band: number;
  rebalance_to_target: number;
  drift_status: string;
  risk_profile: string;
}

function buildDriftCascade(rawRow: DriftRow) {
  const row = {
    ...rawRow,
    actual_pct: Number(rawRow.actual_pct),
    target_pct: Number(rawRow.target_pct),
    min_pct: Number(rawRow.min_pct),
    max_pct: Number(rawRow.max_pct),
    delta_pct: Number(rawRow.delta_pct),
    rebalance_to_band: Number(rawRow.rebalance_to_band),
    rebalance_to_target: Number(rawRow.rebalance_to_target),
  };
  const direction = row.drift_status === 'Over Band' ? 'overweight' : 'underweight';
  const action = row.drift_status === 'Over Band' ? 'reduce' : 'increase';
  const bandEdge = row.drift_status === 'Over Band'
    ? `${row.max_pct.toFixed(0)}% max`
    : `${row.min_pct.toFixed(0)}% min`;

  return {
    trigger: `${row.asset_class} ${row.drift_status} — ${row.actual_pct.toFixed(1)}% actual vs ${row.target_pct.toFixed(1)}% target (band: ${row.min_pct.toFixed(0)}–${row.max_pct.toFixed(0)}%)`,
    triggered_at: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
    agents: [
      {
        id: 1,
        name: 'Portfolio Analysis Agent',
        summary: `Confirmed ${row.asset_class} is ${direction} by ${Math.abs(row.delta_pct).toFixed(1)}% vs IPS band.`,
        detail: `Analyzed current allocation for ${row.account_name} (${row.account_id}). ${row.asset_class} stands at ${row.actual_pct.toFixed(1)}% of portfolio — ${Math.abs(row.delta_pct).toFixed(1)}% ${row.drift_status === 'Over Band' ? 'above' : 'below'} the ${bandEdge}. Estimated trade to restore band compliance: $${Math.abs(row.rebalance_to_band).toFixed(2)}M. Full rebalance to target: $${Math.abs(row.rebalance_to_target).toFixed(2)}M.`,
      },
      {
        id: 2,
        name: 'IPS Compliance Agent',
        summary: `Reviewed IPS policy for ${row.risk_profile} profile. Rebalancing threshold breached.`,
        detail: `Cross-referenced client IPS document for ${row.client_name}. Risk profile: ${row.risk_profile}. ${row.asset_class} target: ${row.target_pct.toFixed(0)}% ± band (${row.min_pct.toFixed(0)}–${row.max_pct.toFixed(0)}%). Current drift of ${Math.abs(row.delta_pct).toFixed(1)}% exceeds tolerance. Policy requires advisor notification and client disclosure within 30 days of breach detection.`,
      },
      {
        id: 3,
        name: 'Client Personalization Agent',
        summary: `Drafted personalized communication for ${row.client_name} in advisor tone.`,
        detail: `Generated outreach using prior advisor–client correspondence to match tone and style. Draft references the specific ${row.asset_class} position, current vs. target allocation, and proposed rebalancing action. Flagged for advisor review before send.`,
      },
    ],
    draft: `Dear ${row.client_name.split(' ')[0]},\n\nI wanted to reach out regarding your ${row.asset_class} allocation in your ${row.account_name}.\n\nAs part of our ongoing portfolio monitoring, we've identified that this position has drifted outside its target band. Your current allocation is ${row.actual_pct.toFixed(1)}%, against a target of ${row.target_pct.toFixed(0)}% with a permitted range of ${row.min_pct.toFixed(0)}–${row.max_pct.toFixed(0)}%. We will be initiating a rebalancing trade to ${action} this exposure and bring the account back into compliance with your Investment Policy Statement.\n\nNo action is required on your part. I'll follow up once the trade settles with a full summary.\n\nPlease don't hesitate to reach out if you have any questions.\n\nBest,\n[Advisor Name]`,
  };
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AgentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const driftState = (location.state as { trigger?: string; row?: DriftRow } | null);
  const isDrift = driftState?.trigger === 'ips_drift' && driftState.row;
  const driftCascade = isDrift ? buildDriftCascade(driftState.row!) : null;

  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [selectedClient, setSelectedClient] = useState(0);
  const [draftText, setDraftText] = useState(
    driftCascade ? driftCascade.draft : CASCADE.draft_templates[0]
  );
  const [approved, setApproved] = useState(false);

  const activeAgents = driftCascade ? driftCascade.agents : CASCADE.agents;

  // Stagger agent steps appearing on mount
  useEffect(() => {
    activeAgents.forEach((a, i) => {
      setTimeout(() => setVisibleSteps((v) => [...v, a.id]), i * 400);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync draft when client tab changes (covenant mode only)
  useEffect(() => {
    if (!isDrift) setDraftText(CASCADE.draft_templates[selectedClient]);
  }, [selectedClient, isDrift]);

  const alertTitle = isDrift
    ? `IPS Drift Alert — ${driftState!.row!.drift_status}`
    : 'PROACTIVE ALERT — Covenant Breach Risk Detected';
  const alertSub = isDrift
    ? `${driftState!.row!.client_name} · ${driftState!.row!.account_name}`
    : CASCADE.holding_name;
  const alertDetail = isDrift
    ? `${driftCascade!.trigger} · Detected ${driftCascade!.triggered_at}`
    : `${CASCADE.trigger} · Detected ${CASCADE.triggered_at}`;
  const draftLabel = isDrift
    ? `Draft Communication — ${driftState!.row!.client_name}`
    : `Draft Communication — ${CASCADE.affected_clients[selectedClient].name}`;
  const dismissTarget = isDrift ? '/drift' : '/';

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Alert banner */}
      <div className="flex items-start gap-4 p-4 rounded-lg border border-red-200 bg-red-50">
        <div className="relative flex-shrink-0 mt-0.5">
          <span className="absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-800">{alertTitle}</p>
          <p className="text-sm text-red-700 mt-0.5">{alertSub}</p>
          <p className="text-xs text-red-600 mt-1">{alertDetail}</p>
        </div>
        {!isDrift && (
          <button
            onClick={() => navigate('/documents?holding=blackstone-pe-sc4')}
            className="ml-auto text-xs text-red-700 underline underline-offset-2 hover:text-red-900 flex-shrink-0"
          >
            View source →
          </button>
        )}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-2 gap-5">

        {/* ── Left: Agent cascade timeline ── */}
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Agent Cascade</p>
            <div>
              {activeAgents.map((agent) => (
                <AgentStep
                  key={agent.id}
                  agent={agent}
                  visible={visibleSteps.includes(agent.id)}
                />
              ))}
            </div>

            {/* Awaiting approval step */}
            <div className="flex gap-3">
              <Circle className={`w-5 h-5 flex-shrink-0 ${approved ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  {approved ? 'Advisor Approved' : 'Awaiting Advisor Approval'}
                </p>
              </div>
            </div>

            {/* Audit trail */}
            <div className="mt-5 pt-4 border-t text-xs text-muted-foreground">
              {isDrift ? '1 cascade run · Just now' : '3 cascade runs · Last: 2 minutes ago'} ·{' '}
              <span className="text-[#1a3a5c] underline underline-offset-2 cursor-pointer hover:text-[#1a3a5c]/80">
                View history
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Right: Human-in-the-loop ── */}
        <div className="space-y-4">

          {/* Affected clients (covenant mode only) */}
          {!isDrift && (
            <Card className="shadow-sm">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Affected Clients ({CASCADE.affected_clients.length})
                </p>
                <div className="space-y-2">
                  {CASCADE.affected_clients.map((c, i) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedClient(i)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors ${
                        selectedClient === i
                          ? 'border-[#1a3a5c] bg-[#1a3a5c]/5 text-foreground'
                          : 'border-border hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <span className="font-medium">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-muted-foreground">${c.aum_millions}M</span>
                        <Badge variant="outline" className="text-[10px] py-0">{c.tier}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Draft communication */}
          <Card className="shadow-sm">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {draftLabel}
                </p>
              </div>
              {approved ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-emerald-600">
                  <CheckCheck className="w-8 h-8" />
                  <p className="text-sm font-semibold">
                    {isDrift ? 'Communication queued for 1 client' : 'Communications queued for 3 clients'}
                  </p>
                  <p className="text-xs text-muted-foreground">Audit record saved · {new Date().toLocaleTimeString()}</p>
                </div>
              ) : (
                <>
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={10}
                    className="w-full text-sm border rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#1a3a5c] bg-background text-foreground"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setApproved(true)}
                      className="flex-1 bg-[#1a3a5c] text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-[#1a3a5c]/90 transition-colors"
                    >
                      Approve &amp; Send
                    </button>
                    <button
                      onClick={() => navigate(dismissTarget)}
                      className="flex-1 border text-sm font-medium py-2 px-4 rounded-md hover:bg-muted transition-colors text-foreground"
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Re-allocation scenario (covenant mode only) */}
          {!isDrift && (
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Re-Allocation Scenario</p>
                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Reduce</p>
                    <p className="font-medium">{CASCADE.reallocation.from_asset}</p>
                    <p className="text-xs text-muted-foreground">{CASCADE.reallocation.from_pct}% → {CASCADE.reallocation.to_pct}%</p>
                  </div>
                  <div className="text-muted-foreground text-xl">→</div>
                  <div className="space-y-1 text-right">
                    <p className="text-muted-foreground text-xs">Reallocate to</p>
                    <p className="font-medium">{CASCADE.reallocation.to_asset}</p>
                    <p className="text-xs text-emerald-600">Est. risk impact: {CASCADE.reallocation.risk_impact}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="w-full border text-sm font-medium py-1.5 px-4 rounded-md hover:bg-muted transition-colors text-foreground"
                >
                  Model Scenario
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
