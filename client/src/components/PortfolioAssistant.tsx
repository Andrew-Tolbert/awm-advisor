import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Sparkles, X } from 'lucide-react';
import { AdvisorChat } from './chat/AdvisorChat';
import { PREFAB_PROMPTS } from '../data/prefab-prompts';

const PRIMARY_CHIPS = PREFAB_PROMPTS.portfolio.map((p) => p.prompt);

export function PortfolioAssistant() {
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // The /genie panel is the canonical chat surface — hide the floating bubble there.
  if (location.pathname === '/genie') return null;

  return (
    <>
      <button
        onClick={() => setChatOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[10000] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all bg-[#0E1928] text-white hover:bg-[#1a2a3e]"
        title={chatOpen ? 'Close assistant' : 'Open assistant'}
      >
        {chatOpen ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {chatOpen && (
        <div
          className="fixed bottom-20 left-[300px] right-20 z-[9999] flex justify-center pointer-events-none"
          style={{ animation: 'fade-in 0.15s ease-out' }}
        >
          <div className="w-full pointer-events-auto">
            <AdvisorChat
              mode="floating"
              primaryChips={PRIMARY_CHIPS}
              floatingTitle="Portfolio Assistant"
              onOpenInMainView={() => {
                void navigate('/genie');
                setChatOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
