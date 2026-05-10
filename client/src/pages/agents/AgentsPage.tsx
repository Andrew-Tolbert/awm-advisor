import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import { useAnalyticsQuery, Card, CardContent, Badge } from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { marked } from 'marked';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, CheckCheck, Pencil, Eye } from 'lucide-react';
import { useAdvisor } from '../../contexts/AdvisorContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommRow {
  client_id: string;
  signal_id: string;
  client_name: string;
  aum_millions: number;
  signal_type: string;
  symbol: string;
  email_draft: string;
}

// ── Signal metadata — alert banner copy and reallocation scenario per type ────

const SIGNAL_META: Record<string, {
  title: string;
  sub: string;
  detail: string;
  reallocation: { from_asset: string; from_pct: number; to_asset: string; to_pct: number; risk_impact: string };
}> = {
  'Earnings Miss': {
    title: 'PROACTIVE ALERT — Earnings Miss Detected',
    sub: 'UnitedHealth Group (UNH) · Q3 2025 10-Q',
    detail: 'Diluted EPS collapsed 60% YoY: $6.51 → $2.59 · Medical cost ratio +470bps to 89.9%',
    reallocation: { from_asset: 'Healthcare Equities', from_pct: 20, to_asset: 'Investment Grade Bonds', to_pct: 16, risk_impact: '−0.4%' },
  },
  'Credit Event': {
    title: 'PROACTIVE ALERT — Credit Event Detected',
    sub: 'BlackRock TCP Capital (TCPC) · 8-K Filing',
    detail: 'NAV collapsed 18.8% in Q1: $8.71 → $7.07 · Non-accruals at 9.7% · Leverage 1.41x',
    reallocation: { from_asset: 'Private Credit', from_pct: 18, to_asset: 'High Yield Bonds', to_pct: 14, risk_impact: '−0.3%' },
  },
  'Private Credit Health': {
    title: 'PROACTIVE ALERT — Private Credit Health Alert',
    sub: 'FS KKR Capital (FSK) · Q1 10-K',
    detail: '33% of net investment income now payment-in-kind · Non-accrual rate +55% YoY to 3.4%',
    reallocation: { from_asset: 'Private Credit', from_pct: 18, to_asset: 'Investment Grade Bonds', to_pct: 14, risk_impact: '−0.2%' },
  },
  'Surprise Disclosure': {
    title: 'PROACTIVE ALERT — Material Disclosure Detected',
    sub: 'Adobe Inc. (ADBE) · Q1 Earnings Call',
    detail: 'Stand-alone license business declining faster than guided · ARR headwind not previously disclosed',
    reallocation: { from_asset: 'Technology Equities', from_pct: 22, to_asset: 'Diversified ETFs', to_pct: 18, risk_impact: '−0.2%' },
  },
  'IPS Breach — OVER': {
    title: 'PROACTIVE ALERT — IPS Breach Detected',
    sub: 'Asset class above maximum IPS band',
    detail: 'One or more client accounts have exceeded their maximum IPS allocation band',
    reallocation: { from_asset: 'Over-weight Asset Class', from_pct: 22, to_asset: 'Fixed Income', to_pct: 18, risk_impact: '−0.2%' },
  },
  'Guidance Raise': {
    title: 'OPPORTUNITY ALERT — Guidance Raised',
    sub: 'American Tower Corporation (AMT) · Q1 2026 Earnings Call',
    detail: 'Full-year AFFO and EBITDA guidance raised; strong operational performance and favorable FX tailwinds',
    reallocation: { from_asset: 'Cash / Short-term', from_pct: 5, to_asset: 'Infrastructure REITs', to_pct: 7, risk_impact: '+0.2%' },
  },
};

const SIGNAL_META_FALLBACK = {
  title: 'PROACTIVE ALERT — Signal Detected',
  sub: 'Portfolio monitoring alert',
  detail: 'A high-severity signal was detected in your client portfolios',
  reallocation: { from_asset: 'Equities', from_pct: 20, to_asset: 'Fixed Income', to_pct: 16, risk_impact: '−0.3%' },
};

const SIGNAL_META_POSITIVE_FALLBACK = {
  title: 'OPPORTUNITY ALERT — Positive Signal Detected',
  sub: 'Portfolio opportunity identified',
  detail: 'A positive market signal was detected in your client portfolios',
  reallocation: { from_asset: 'Cash / Short-term', from_pct: 5, to_asset: 'Growth Equities', to_pct: 8, risk_impact: '+0.2%' },
};

function isPositiveSentiment(sentiment?: string): boolean {
  const s = (sentiment ?? '').toLowerCase();
  return s === 'positive' || s === 'improving';
}

// ── Dynamic agent cascade per signal type ────────────────────────────────────

function buildSignalAgents(signalType: string, symbol: string, clientCount: number) {
  const n = clientCount;
  if (signalType === 'Earnings Miss') {
    return [
      { id: 1, name: 'Research Agent',
        summary: `Detected ${symbol} Q3 earnings collapse in 10-Q filing.`,
        detail: `Parsed Q3 2025 10-Q (filed November 2025). Diluted EPS: $2.59, down 60% year-over-year from $6.51. Consolidated operating earnings fell 50% to $4.3B. Medical cost ratio spiked 470 basis points to 89.9% across Medicare Advantage, Medicaid, and exchange products. Optum Health earnings collapsed 88%, signaling structural margin pressure, not a one-quarter event.` },
      { id: 2, name: 'Portfolio Construction Agent',
        summary: `Found ${n} client account${n !== 1 ? 's' : ''} with ${symbol} exposure.`,
        detail: `Scanned all client portfolios for ${symbol} holdings. Identified ${n} account${n !== 1 ? 's' : ''} with active positions. Cross-referenced each account's IPS equity targets. All ${n} accounts remain within IPS bands, but the magnitude of fundamental deterioration — 60% EPS collapse, guidance suspended — materially elevates near-term risk. Flagged for advisor review before next client contact.` },
      { id: 3, name: 'Client Personalization Agent',
        summary: `Drafted ${n} personalized communication${n !== 1 ? 's' : ''} in advisor tone.`,
        detail: `Generated individualized outreach for each affected client using prior advisor–client correspondence to match tone and style. Each draft references the client's specific ${symbol} position size, current IPS allocation context, and a recommended course of action (hold/trim/monitor). All drafts flagged for advisor review before send.` },
    ];
  }
  if (signalType === 'Credit Event') {
    return [
      { id: 1, name: 'Research Agent',
        summary: `Detected ${symbol} NAV collapse and credit deterioration in 8-K filing.`,
        detail: `Parsed recent 8-K/10-K disclosure. ${symbol} (BlackRock TCP Capital) NAV per share declined 18.8% in a single quarter, with combined realized and unrealized losses exceeding $140M across six borrowers. Non-accruals spiked to 9.7% of portfolio fair value and leverage climbed to 1.41x. Classic BDC credit deterioration — position now down 23.4% since year-end 2024.` },
      { id: 2, name: 'Portfolio Construction Agent',
        summary: `Found ${n} client account${n !== 1 ? 's' : ''} with ${symbol} exposure.`,
        detail: `Scanned all client portfolios for ${symbol} positions. Identified ${n} account${n !== 1 ? 's' : ''} with active holdings. Cross-referenced IPS private credit targets for each account. Assessed each account's current drift from IPS band and flagged for advisor notification and client disclosure per IPS policy.` },
      { id: 3, name: 'Client Personalization Agent',
        summary: `Drafted ${n} personalized communication${n !== 1 ? 's' : ''} in advisor tone.`,
        detail: `Generated individualized outreach using prior advisor–client correspondence. Each draft references the client's specific ${symbol} position size, current drift from IPS band, and a recommended action (hold/trim/exit). All drafts flagged for advisor review before send.` },
    ];
  }
  if (signalType === 'Guidance Raise') {
    return [
      { id: 1, name: 'Research Agent',
        summary: `Detected ${symbol} Q1 2026 guidance raise in earnings call transcript.`,
        detail: `Parsed Q1 2026 earnings call transcript (Apr 28, 2026). Management raised full-year AFFO guidance, citing stronger-than-expected operational performance in the US tower segment. International revenue acceleration and favorable FX tailwinds contributed to the upward revision. Management maintained elevated conviction language throughout prepared remarks and Q&A. No one-time items obscuring the guidance raise.` },
      { id: 2, name: 'Portfolio Construction Agent',
        summary: `Found ${n} client account${n !== 1 ? 's' : ''} with ${symbol} exposure.`,
        detail: `Scanned all client portfolios for ${symbol} holdings. Identified ${n} account${n !== 1 ? 's' : ''} with active positions. Cross-referenced each account's Infrastructure REIT and Real Assets IPS targets. The guidance raise and improved dividend coverage signal potential for continued appreciation. All accounts remain within IPS bands — no rebalancing required.` },
      { id: 3, name: 'Client Personalization Agent',
        summary: `Drafted ${n} personalized communication${n !== 1 ? 's' : ''} highlighting the positive development.`,
        detail: `Generated individualized outreach for each client using prior advisor–client correspondence to match tone and style. Each draft highlights the guidance raise and its potential impact on the client's infrastructure exposure. Framed as a proactive positive update — no action required from clients. All drafts flagged for advisor review before send.` },
    ];
  }
  // Generic fallback for other signal types
  return [
    { id: 1, name: 'Research Agent',
      summary: `Detected ${signalType} signal for ${symbol}.`,
      detail: `Parsed recent regulatory filing and earnings materials for ${symbol}. Identified material development that warrants client notification per IPS monitoring policy. Signal flagged with high severity for immediate advisor review.` },
    { id: 2, name: 'Portfolio Construction Agent',
      summary: `Found ${n} client account${n !== 1 ? 's' : ''} with ${symbol} exposure.`,
      detail: `Scanned all client portfolios for ${symbol} holdings. Identified ${n} affected account${n !== 1 ? 's' : ''}. Assessed each account's position against IPS targets and flagged for advisor review.` },
    { id: 3, name: 'Client Personalization Agent',
      summary: `Drafted ${n} personalized communication${n !== 1 ? 's' : ''} in advisor tone.`,
      detail: `Generated individualized outreach for each affected client. Each draft is tailored to the client's position size, allocation context, and prior communication style. Flagged for advisor review before send.` },
  ];
}

// ── Draft viewer — renders markdown, toggles to raw edit ─────────────────────

function DraftViewer({ text, onChange }: { text: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const html = useMemo(() => marked.parse(text) as string, [text]);

  return (
    <div className="space-y-2">
      {editing ? (
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          autoFocus
          className="w-full text-sm border rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[#1a3a5c] bg-background text-foreground font-mono leading-relaxed"
        />
      ) : (
        <div
          className="md-body border rounded-md p-3 bg-background min-h-[160px]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      <button
        onClick={() => setEditing((v) => !v)}
        className="flex items-center gap-1 text-xs text-[#1a3a5c] hover:underline"
      >
        {editing
          ? <><Eye className="w-3 h-3" /> Preview</>
          : <><Pencil className="w-3 h-3" /> Edit draft</>}
      </button>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type AgentDef = { id: number; name: string; summary: string; detail: string };

function AgentStep({ agent, visible }: { agent: AgentDef; visible: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
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

// ── IPS Drift cascade builder (unchanged) ────────────────────────────────────

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

type AlertRow = { signal_id: string; symbol: string; signal_type: string; sentiment?: string };

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AgentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { params: advisorParams } = useAdvisor();

  const driftState = (location.state as { trigger?: string; row?: DriftRow } | null);
  const isDrift = driftState?.trigger === 'ips_drift' && driftState.row;
  const driftCascade = isDrift ? buildDriftCascade(driftState.row!) : null;

  // signal_id comes from the URL (?signal_id=xxx) set by alert card draft comms buttons
  const signalId = searchParams.get('signal_id') ?? '';

  // When visiting /agents with no signal_id, redirect to the top alert by severity
  const { data: alertsData } = useAnalyticsQuery('alerts', advisorParams);
  useEffect(() => {
    if (!signalId && !isDrift && alertsData) {
      const top = (alertsData as Array<{ signal_id: string }>)[0];
      if (top) navigate(`/agents?signal_id=${encodeURIComponent(top.signal_id)}`, { replace: true });
    }
  }, [alertsData, signalId, isDrift]); // eslint-disable-line react-hooks/exhaustive-deps

  const commsParams = { ...advisorParams, signal_id: sql.string(signalId) };
  const { data: commsData, loading: commsLoading } = useAnalyticsQuery(
    'client_communications',
    commsParams,
  );
  const commsRows = (commsData ?? []) as unknown as CommRow[];

  const signalType = commsRows[0]?.signal_type ?? 'Earnings Miss';
  const currentAlertRow = (alertsData as AlertRow[] ?? []).find(r => r.signal_id === signalId);
  const isPositiveAlert = !isDrift && isPositiveSentiment(currentAlertRow?.sentiment);
  const meta = SIGNAL_META[signalType] ?? (isPositiveAlert ? SIGNAL_META_POSITIVE_FALLBACK : SIGNAL_META_FALLBACK);

  const affectedClients = commsRows.map((r) => ({
    name: r.client_name,
    aum_millions: Number(r.aum_millions),
    tier: Number(r.aum_millions) >= 5 ? 'UHNW' : 'HNW',
    draft: r.email_draft,
  }));

  const commsSignalId = commsRows[0]?.signal_id ?? '';
  const signalAgents = buildSignalAgents(signalType, commsRows[0]?.symbol ?? '', affectedClients.length);
  const activeAgents = isDrift ? driftCascade!.agents : signalAgents;

  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [selectedClient, setSelectedClient] = useState(0);
  const [draftText, setDraftText] = useState('');
  const [approved, setApproved] = useState(false);
  const [pillsReady, setPillsReady] = useState(false);

  // Stagger agent steps — replay whenever the loaded signal data changes
  useEffect(() => {
    setVisibleSteps([]);
    activeAgents.forEach((a, i) => {
      setTimeout(() => setVisibleSteps((v) => [...v, a.id]), i * 400);
    });
  }, [commsSignalId, isDrift ? 'drift' : 'signal']); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate pills in after content is ready
  useEffect(() => {
    const t = setTimeout(() => setPillsReady(true), 80);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset interaction state when switching between alerts
  useEffect(() => {
    setApproved(false);
    setSelectedClient(0);
    setDraftText('');
    setVisibleSteps([]);
    setPillsReady(false);
    const t = setTimeout(() => setPillsReady(true), 80);
    return () => clearTimeout(t);
  }, [signalId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync draft to the correct alert + client tab. Guard on commsSignalId so we
  // never apply stale comms data from the previous alert while the new query loads.
  useEffect(() => {
    if (isDrift || !commsSignalId || commsSignalId !== signalId) return;
    setDraftText(affectedClients[selectedClient]?.draft ?? '');
  }, [signalId, selectedClient, commsSignalId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync draft for drift mode — prefer AI-drafted markdown email when available,
  // fall back to the programmatic draft while the query is still loading.
  useEffect(() => {
    if (!isDrift) return;
    if (commsRows.length > 0) {
      setDraftText(commsRows[0].email_draft);
    } else if (driftCascade) {
      setDraftText(driftCascade.draft);
    }
  }, [isDrift, commsRows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist the drift row so the IPS pill can restore it after switching to a signal alert
  useEffect(() => {
    if (isDrift && driftState?.row) {
      sessionStorage.setItem('awm_last_drift_row', JSON.stringify(driftState.row));
    }
  }, [isDrift]); // eslint-disable-line react-hooks/exhaustive-deps

  const alertTitle = isDrift
    ? `IPS Drift Alert — ${driftState!.row!.drift_status}`
    : meta.title;
  const alertSub = isDrift
    ? `${driftState!.row!.client_name} · ${driftState!.row!.account_name}`
    : meta.sub;
  const alertDetail = isDrift
    ? `${driftCascade!.trigger} · Detected ${driftCascade!.triggered_at}`
    : meta.detail;
  const draftLabel = isDrift
    ? `Draft Communication — ${driftState!.row!.client_name}`
    : affectedClients[selectedClient]
      ? `Draft Communication — ${affectedClients[selectedClient].name}`
      : 'Draft Communication';
  const dismissTarget = isDrift ? '/drift' : '/';
  const realloc = isDrift ? null : meta.reallocation;

  const bs = isPositiveAlert ? {
    outer: 'border-emerald-200 bg-emerald-50',
    strip: 'border-emerald-100',
    label: 'text-emerald-300',
    dotPing: 'bg-emerald-400',
    dotSolid: 'bg-emerald-500',
    title: 'text-emerald-800',
    sub: 'text-emerald-700',
    detail: 'text-emerald-600',
  } : {
    outer: 'border-red-200 bg-red-50',
    strip: 'border-red-100',
    label: 'text-red-300',
    dotPing: 'bg-red-400',
    dotSolid: 'bg-red-500',
    title: 'text-red-800',
    sub: 'text-red-700',
    detail: 'text-red-600',
  };

  if (!isDrift && (!signalId || (commsLoading && commsRows.length === 0))) {
    return null;
  }

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Alert banner with inline selector */}
      <div className={`rounded-lg border ${bs.outer} overflow-hidden`}>

        {/* Alert selector strip */}
        {(alertsData as AlertRow[] ?? []).length > 0 && (
          <div className={`flex items-center gap-1.5 px-4 py-2 border-b ${bs.strip}`}>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${bs.label} mr-1 flex-shrink-0`}>Alerts</span>
            <button
              onClick={() => {
                if (isDrift) return;
                const stored = sessionStorage.getItem('awm_last_drift_row');
                if (!stored) return;
                const row = JSON.parse(stored) as DriftRow;
                navigate(`/agents?signal_id=${encodeURIComponent(row.account_id)}`, {
                  state: { trigger: 'ips_drift', row },
                });
              }}
              style={{
                opacity: pillsReady ? 1 : 0,
                transform: pillsReady ? 'scale(1) translateY(0)' : 'scale(0.82) translateY(3px)',
                transition: 'opacity 200ms ease 0ms, transform 200ms ease 0ms',
              }}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                isDrift
                  ? 'bg-red-600 text-white'
                  : 'bg-white/60 text-red-700 hover:bg-white border border-red-200'
              }`}
            >
              IPS
            </button>
            {(alertsData as AlertRow[]).map((a, i) => {
              const isActive = a.signal_id === signalId;
              const isPillPositive = isPositiveSentiment(a.sentiment);
              return (
                <button
                  key={a.signal_id}
                  onClick={() => navigate(`/agents?signal_id=${encodeURIComponent(a.signal_id)}`, { replace: true })}
                  style={{
                    opacity: pillsReady ? 1 : 0,
                    transform: pillsReady ? 'scale(1) translateY(0)' : 'scale(0.82) translateY(3px)',
                    transition: `opacity 200ms ease ${i * 55}ms, transform 200ms ease ${i * 55}ms`,
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                    isActive
                      ? isPillPositive ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      : isPillPositive ? 'bg-white/60 text-emerald-700 hover:bg-white border border-emerald-200' : 'bg-white/60 text-red-700 hover:bg-white border border-red-200'
                  }`}
                >
                  {a.symbol}
                </button>
              );
            })}
          </div>
        )}

        {/* Active alert details */}
        <div className="flex items-start gap-4 p-4">
          <div className="relative flex-shrink-0 mt-0.5">
            <span className={`absolute inline-flex h-3 w-3 rounded-full ${bs.dotPing} opacity-75 animate-ping`} />
            <span className={`relative inline-flex h-3 w-3 rounded-full ${bs.dotSolid}`} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${bs.title}`}>{alertTitle}</p>
            <p className={`text-sm ${bs.sub} mt-0.5`}>{alertSub}</p>
            <p className={`text-xs ${bs.detail} mt-1`}>{alertDetail}</p>
          </div>
        </div>
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

          {/* Affected clients (non-drift mode only) */}
          {!isDrift && (
            <Card className="shadow-sm">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Affected Clients ({commsLoading ? '…' : affectedClients.length})
                </p>
                {commsLoading ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
                ) : (
                  <div className="space-y-2">
                    {affectedClients.map((c, i) => (
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
                )}
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
                    {isDrift
                      ? 'Communication queued for 1 client'
                      : `Communications queued for ${affectedClients.length} client${affectedClients.length !== 1 ? 's' : ''}`}
                  </p>
                  <p className="text-xs text-muted-foreground">Audit record saved · {new Date().toLocaleTimeString()}</p>
                </div>
              ) : (
                <>
                  {commsLoading && !isDrift ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">Loading draft…</div>
                  ) : (
                    <DraftViewer text={draftText} onChange={setDraftText} />
                  )}
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

          {/* Re-allocation scenario (non-drift mode only) */}
          {!isDrift && realloc && (
            <Card className="shadow-sm">
              <CardContent className="pt-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Re-Allocation Scenario</p>
                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Reduce</p>
                    <p className="font-medium">{realloc.from_asset}</p>
                    <p className="text-xs text-muted-foreground">{realloc.from_pct}% → {realloc.to_pct}%</p>
                  </div>
                  <div className="text-muted-foreground text-xl">→</div>
                  <div className="space-y-1 text-right">
                    <p className="text-muted-foreground text-xs">Reallocate to</p>
                    <p className="font-medium">{realloc.to_asset}</p>
                    <p className="text-xs text-emerald-600">Est. risk impact: {realloc.risk_impact}</p>
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
