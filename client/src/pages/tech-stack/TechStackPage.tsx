import { Card, CardContent } from '@databricks/appkit-ui/react';
import {
  Workflow,
  Brain,
  BookOpen,
  Activity,
  Sparkles,
  LayoutDashboard,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';

interface StackItem {
  name: string;
  category: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
}

const STACK_ITEMS: StackItem[] = [
  {
    name: 'Job Runs',
    category: 'Lakeflow Jobs',
    description: 'Scheduled orchestration powering the nightly research, portfolio, and personalization cascade.',
    href: 'https://e2-demo-field-eng.cloud.databricks.com/jobs/170335066095656/runs?o=1444828305810485',
    icon: Workflow,
    accent: 'from-sky-500/15 to-sky-500/5 text-sky-600',
  },
  {
    name: 'Supervisor',
    category: 'Agent Bricks · SA',
    description: 'Top-level supervisor agent that routes tasks across research, portfolio construction, and personalization sub-agents.',
    href: 'https://e2-demo-field-eng.cloud.databricks.com/ml/bricks/sa/configure/af54fe47-a830-46d2-96e1-eca6681f4144?o=1444828305810485',
    icon: Brain,
    accent: 'from-violet-500/15 to-violet-500/5 text-violet-600',
  },
  {
    name: 'Knowledge Assistant',
    category: 'Agent Bricks · KA',
    description: 'Document-grounded retrieval over filings, transcripts, and research notes used by the research agent.',
    href: 'https://e2-demo-field-eng.cloud.databricks.com/ml/bricks/ka/configure/deb1b111-1923-490a-8826-dbc3f1a17b5b?o=1444828305810485',
    icon: BookOpen,
    accent: 'from-amber-500/15 to-amber-500/5 text-amber-600',
  },
  {
    name: 'Traces',
    category: 'MLflow Experiments',
    description: 'End-to-end trace and usage telemetry for every agent invocation, tool call, and LLM hop.',
    href: 'https://e2-demo-field-eng.cloud.databricks.com/ml/experiments/4396818073089522/overview/usage?o=1444828305810485',
    icon: Activity,
    accent: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600',
  },
  {
    name: 'Genie Space',
    category: 'AI/BI Genie',
    description: 'Natural-language SQL interface over the portfolio dataset that powers the in-app Genie Chat.',
    href: 'https://e2-demo-field-eng.cloud.databricks.com/genie/rooms/01f147207fdd153cb94327ebddc171fe?o=1444828305810485',
    icon: Sparkles,
    accent: 'from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-600',
  },
  {
    name: 'Dashboard',
    category: 'AI/BI Dashboard',
    description: 'Published Lakeview dashboard summarizing portfolio exposures, risk metrics, and cascade outcomes.',
    href: 'https://e2-demo-field-eng.cloud.databricks.com/dashboardsv3/01f142dfebb71521b206239da8aa1d3d/published?o=1444828305810485',
    icon: LayoutDashboard,
    accent: 'from-rose-500/15 to-rose-500/5 text-rose-600',
  },
];

export function TechStackPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Behind the demo
        </p>
        <h1 className="text-2xl font-semibold text-foreground mt-1">Tech Stack</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          The Databricks components, services, and infrastructure powering the AWM Advisor experience.
          Click any tile to jump straight to its workspace asset.
        </p>
      </div>

      {/* Grid of stack items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STACK_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3a5c] focus-visible:ring-offset-2 rounded-lg"
            >
              <Card className="h-full shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 group-hover:border-[#1a3a5c]/30">
                <CardContent className="pt-5 pb-5 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-11 h-11 rounded-lg bg-gradient-to-br ${item.accent} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground/50 group-hover:text-[#1a3a5c] transition-colors flex-shrink-0 mt-1" />
                  </div>

                  <div className="mt-4 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.category}
                    </p>
                    <h3 className="text-base font-semibold text-foreground mt-0.5 group-hover:text-[#1a3a5c] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center text-xs text-[#1a3a5c] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Open in Databricks
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </a>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground pt-2">
        All assets live in the <span className="font-mono">e2-demo-field-eng</span> workspace.
        Access requires Databricks workspace credentials.
      </p>
    </div>
  );
}
