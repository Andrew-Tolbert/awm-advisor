import { createBrowserRouter, RouterProvider, NavLink, Outlet } from 'react-router';
import { LayoutDashboard, FileText, Bot, MessageSquare } from 'lucide-react';
import { PortfolioPage } from './pages/portfolio/PortfolioPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { AgentsPage } from './pages/agents/AgentsPage';
import { GeniePage } from './pages/genie/GeniePage';
import { AdvisorProvider, useAdvisor } from './contexts/AdvisorContext';

const NAV_ITEMS = [
  { to: '/',          end: true,  icon: LayoutDashboard, label: 'Portfolio Intelligence' },
  { to: '/documents', end: false, icon: FileText,        label: 'Document Intelligence'  },
  { to: '/agents',    end: false, icon: Bot,             label: 'Agent Orchestration'    },
  { to: '/genie',     end: false, icon: MessageSquare,   label: 'Genie Chat'             },
];

function Sidebar() {
  return (
    <aside className="w-60 min-h-screen border-r bg-background flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-5 py-5 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1a3a5c] flex items-center justify-center text-white text-xs font-bold tracking-wide">
            GS
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground leading-tight">AWM Intelligence</div>
            <div className="text-xs text-muted-foreground leading-tight">Goldman Sachs</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'border-l-[3px] border-[#1a3a5c] bg-[#1a3a5c]/5 text-foreground font-medium pl-[9px]'
                  : 'border-l-[3px] border-transparent text-muted-foreground hover:bg-muted hover:text-foreground pl-[9px]'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
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
    <div className="px-4 py-4 border-t space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Viewing as</p>
      <select
        value={advisor.advisorId}
        onChange={(e) => setAdvisorId(e.target.value)}
        disabled={loading}
        className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        {advisors.map((a) => (
          <option key={a.advisorId} value={a.advisorId}>
            {a.advisorId}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground truncate">{advisor.title}</p>
    </div>
  );
}

function Layout() {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/',          element: <PortfolioPage /> },
      { path: '/documents', element: <DocumentsPage /> },
      { path: '/agents',    element: <AgentsPage /> },
      { path: '/genie',     element: <GeniePage /> },
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
