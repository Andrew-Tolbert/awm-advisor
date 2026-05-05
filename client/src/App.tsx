import { createBrowserRouter, RouterProvider, NavLink, Outlet } from 'react-router';
import { LayoutDashboard, TrendingDown, FileText, Bot, MessageSquare, Cpu } from 'lucide-react';
import { PortfolioPage } from './pages/portfolio/PortfolioPage';
import { DriftPage } from './pages/drift/DriftPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { AgentsPage } from './pages/agents/AgentsPage';
import { GeniePage } from './pages/genie/GeniePage';
import { AdvisorProvider, useAdvisor } from './contexts/AdvisorContext';
import { TechStackPage } from './pages/tech-stack/TechStackPage';
import { PortfolioAssistant } from './components/PortfolioAssistant';

const NAV_ITEMS = [
  { to: '/',           end: true,  icon: LayoutDashboard, label: 'Portfolio Intelligence' },
  { to: '/drift',      end: false, icon: TrendingDown,    label: 'Drift Analysis'         },
  { to: '/documents',  end: false, icon: FileText,        label: 'Document Intelligence'  },
  { to: '/agents',     end: false, icon: Bot,             label: 'Agent Orchestration'    },
  { to: '/genie',      end: false, icon: MessageSquare,   label: 'Advisor Chat'           },
  { to: '/tech-stack', end: false, icon: Cpu,             label: 'Tech Stack'             },
];

function Sidebar() {
  return (
    <aside
      className="group fixed top-0 left-0 z-40 h-screen w-[75px] hover:w-[280px] bg-[#0E1928] text-white flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out"
    >
      {/* Logo header */}
      <div className="relative h-[86px] flex-shrink-0 overflow-hidden">
        {/* Collapsed: tiny Goldman wordmark */}
        <img
          src="/goldman-white-letters.png"
          alt="Goldman Sachs"
          className="absolute inset-y-0 left-0 w-[75px] h-full object-contain p-3 opacity-100 group-hover:opacity-0 transition-opacity duration-300 ease-in-out"
        />
        {/* Expanded: full Goldman wordmark */}
        <img
          src="/goldman-white-letters.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-[280px] object-contain p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 pt-5 space-y-1">
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex items-center h-14 text-sm transition-colors ${
                isActive
                  ? 'text-white bg-white/[0.08]'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-white" />
                )}
                <span className="w-[75px] flex-shrink-0 flex items-center justify-center">
                  <Icon className="w-6 h-6" strokeWidth={1.5} />
                </span>
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out">
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Advisor picker */}
      <AdvisorPicker />
    </aside>
  );
}

function AdvisorPicker() {
  const { advisors, advisor, setAdvisorId, loading } = useAdvisor();
  return (
    <div className="border-t border-white/10 py-3">
      <div className="flex items-start">
        {/* Collapsed state: initials avatar */}
        <div className="w-[75px] flex-shrink-0 flex items-center justify-center pt-1">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-semibold">
            {advisor.initials}
          </div>
        </div>
        {/* Expanded state: full picker */}
        <div className="min-w-0 pr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out space-y-1.5">
          <p className="text-xs text-white/50 uppercase tracking-wider font-medium">Viewing as</p>
          <select
            value={advisor.advisorId}
            onChange={(e) => setAdvisorId(e.target.value)}
            disabled={loading}
            className="w-full text-sm rounded bg-white/10 border border-white/20 px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
          >
            {advisors.map((a) => (
              <option key={a.advisorId} value={a.advisorId} className="bg-[#0E1928]">
                {a.advisorId}
              </option>
            ))}
          </select>
          <p className="text-xs text-white/50 truncate">{advisor.title}</p>
        </div>
      </div>
    </div>
  );
}

function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[75px] min-h-screen overflow-auto">
        <div className="mx-auto max-w-[1400px] px-10 py-6">
          <Outlet />
        </div>
      </main>
      <PortfolioAssistant />
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/',           element: <PortfolioPage /> },
      { path: '/drift',      element: <DriftPage /> },
      { path: '/documents',  element: <DocumentsPage /> },
      { path: '/agents',     element: <AgentsPage /> },
      { path: '/genie',      element: <GeniePage /> },
      { path: '/tech-stack', element: <TechStackPage /> },
    ],
  },
]);

export default function App() {
  return (
    <AdvisorProvider>
      <RouterProvider router={router} />
    </AdvisorProvider>
  );
}
