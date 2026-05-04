import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AgentsPage() {
  const navigate = useNavigate();
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [selectedClient, setSelectedClient] = useState(0);
  const [draftText, setDraftText] = useState(CASCADE.draft_templates[0]);
  const [approved, setApproved] = useState(false);

  // Stagger agent steps appearing on mount
  useEffect(() => {
    CASCADE.agents.forEach((a, i) => {
      setTimeout(() => setVisibleSteps((v) => [...v, a.id]), i * 400);
    });
  }, []);

  // Sync draft when client tab changes
  useEffect(() => {
    setDraftText(CASCADE.draft_templates[selectedClient]);
  }, [selectedClient]);

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Alert banner */}
      <div className="flex items-start gap-4 p-4 rounded-lg border border-red-200 bg-red-50">
        <div className="relative flex-shrink-0 mt-0.5">
          <span className="absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-800">
            PROACTIVE ALERT — Covenant Breach Risk Detected
          </p>
          <p className="text-sm text-red-700 mt-0.5">{CASCADE.holding_name}</p>
          <p className="text-xs text-red-600 mt-1">{CASCADE.trigger} · Detected {CASCADE.triggered_at}</p>
        </div>
        <button
          onClick={() => navigate('/documents?holding=blackstone-pe-sc4')}
          className="ml-auto text-xs text-red-700 underline underline-offset-2 hover:text-red-900 flex-shrink-0"
        >
          View source →
        </button>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-2 gap-5">

        {/* ── Left: Agent cascade timeline ── */}
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Agent Cascade</p>
            <div>
              {CASCADE.agents.map((agent) => (
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
              3 cascade runs · Last: 2 minutes ago ·{' '}
              <span className="text-[#1a3a5c] underline underline-offset-2 cursor-pointer hover:text-[#1a3a5c]/80">
                View history
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Right: Human-in-the-loop ── */}
        <div className="space-y-4">

          {/* Affected clients */}
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

          {/* Draft communication */}
          <Card className="shadow-sm">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Draft Communication — {CASCADE.affected_clients[selectedClient].name}
                </p>
              </div>
              {approved ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-emerald-600">
                  <CheckCheck className="w-8 h-8" />
                  <p className="text-sm font-semibold">Communications queued for 3 clients</p>
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
                      onClick={() => navigate('/')}
                      className="flex-1 border text-sm font-medium py-2 px-4 rounded-md hover:bg-muted transition-colors text-foreground"
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Re-allocation scenario */}
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
        </div>
      </div>
    </div>
  );
}
