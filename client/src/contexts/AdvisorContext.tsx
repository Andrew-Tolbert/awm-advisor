import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { useAnalyticsQuery } from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';

export interface AdvisorInfo {
  advisorId: string;
  name: string;
  title: string;
  initials: string;
}

interface AdvisorContextValue {
  advisors: AdvisorInfo[];
  advisor: AdvisorInfo;
  setAdvisorId: (id: string) => void;
  params: { advisor_id: ReturnType<typeof sql.string> };
  loading: boolean;
}

const DEFAULT_ADVISOR_ID = 'ADV001';

const AdvisorContext = createContext<AdvisorContextValue | null>(null);

export function AdvisorProvider({ children }: { children: ReactNode }) {
  const { data, loading } = useAnalyticsQuery('advisors');

  const advisors: AdvisorInfo[] = ((data ?? []) as Array<Record<string, string>>).map((row) => ({
    advisorId: row.advisor_id,
    name: row.name,
    title: row.title,
    initials: row.initials,
  }));

  const [selectedId, setSelectedId] = useState(DEFAULT_ADVISOR_ID);

  // Once advisor list loads, confirm the default exists (fall back to first row)
  useEffect(() => {
    if (advisors.length && !advisors.find((a) => a.advisorId === selectedId)) {
      setSelectedId(advisors[0].advisorId);
    }
  }, [advisors.length]);  // eslint-disable-line react-hooks/exhaustive-deps

  const advisor = advisors.find((a) => a.advisorId === selectedId) ?? {
    advisorId: selectedId,
    name: '—',
    title: '—',
    initials: '—',
  };

  const params = useMemo(
    () => ({ advisor_id: sql.string(selectedId) }),
    [selectedId]
  );

  return (
    <AdvisorContext.Provider value={{ advisors, advisor, setAdvisorId: setSelectedId, params, loading }}>
      {children}
    </AdvisorContext.Provider>
  );
}

export function useAdvisor(): AdvisorContextValue {
  const ctx = useContext(AdvisorContext);
  if (!ctx) throw new Error('useAdvisor must be used inside <AdvisorProvider>');
  return ctx;
}
