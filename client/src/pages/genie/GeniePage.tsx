import { AdvisorChat } from '../../components/chat/AdvisorChat';
import { ChatHistory } from '../../components/chat/ChatHistory';
import { exportChatPdf } from '../../components/chat/exportChatPdf';

const PRIMARY_CHIPS = [
  'Top portfolio risks across all asset classes right now',
  'Which BDC names have the most stressed covenants?',
  'Clients above their IPS Private Credit band, ranked by drift dollars',
  'Draft client outreach for accounts exposed to Blackstone PE SC IV',
];

const SECONDARY_CHIPS = [
  "What was UNH's management tone shift across the last 4 calls?",
  'AAPL succession risk — what did Q2 2026 prepared remarks say?',
  'YTD performance vs S&P 500 by advisor',
  'Total AUM exposure to names with active high-severity credit warnings',
  'Compare Q2 vs Q3 covenant headroom for our top 5 BDC holdings',
];

export function GeniePage() {
  return (
    <div className="space-y-4 max-w-[1400px]">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Advisor Chat</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Powered by the AWM multi-agent supervisor — Genie SQL plus the Knowledge Assistant for
          filings, transcripts, and signals.
        </p>
      </div>
      <div
        className="border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col"
        style={{ height: 'calc(100vh - 180px)', minHeight: '600px' }}
      >
        <div className="h-[2px] bg-[#c8a96a] flex-shrink-0" aria-hidden />
        <div className="flex flex-1 min-h-0">
          <div className="w-[260px] flex-shrink-0 min-h-0">
            <ChatHistory onExport={exportChatPdf} />
          </div>
          <div className="flex-1 min-w-0 min-h-0">
            <AdvisorChat
              mode="panel"
              primaryChips={PRIMARY_CHIPS}
              secondaryChips={SECONDARY_CHIPS}
              onExport={exportChatPdf}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
