'use client';

import { createContext, useState } from 'react';
import MistakeMemory from '@/components/MistakeMemory';
import DailyCheck from '@/components/DailyCheck';

export const DashboardTabsContext = createContext(null);

export default function DashboardTabs({ children }) {
  const [activeTab, setActiveTab] = useState('main');

  return (
    <DashboardTabsContext.Provider value={{ openMindsetDiscipline: () => setActiveTab('daily-check') }}>
    <div className="space-y-4">
      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard views">
        <button
          id="main-dashboard-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'main'}
          aria-controls="main-dashboard-panel"
          onClick={() => setActiveTab('main')}
          className={`dashboard-tab ${activeTab === 'main' ? 'is-active' : ''}`}
        >
          Main Dashboard
        </button>
        <button
          id="mistakes-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'mistakes'}
          aria-controls="mistakes-panel"
          onClick={() => setActiveTab('mistakes')}
          className={`dashboard-tab ${activeTab === 'mistakes' ? 'is-active' : ''}`}
        >
          Trading Mistakes
        </button>
        <button
          id="daily-check-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'daily-check'}
          aria-controls="daily-check-panel"
          onClick={() => setActiveTab('daily-check')}
          className={`dashboard-tab ${activeTab === 'daily-check' ? 'is-active' : ''}`}
        >
          Mindset &amp; Discipline
        </button>
      </div>
      <section id="mistakes-panel" role="tabpanel" aria-labelledby="mistakes-tab" hidden={activeTab !== 'mistakes'}>
        <MistakeMemory />
      </section>
      <section id="main-dashboard-panel" role="tabpanel" aria-labelledby="main-dashboard-tab" hidden={activeTab !== 'main'}>
        {children}
      </section>
      <section id="daily-check-panel" role="tabpanel" aria-labelledby="daily-check-tab" hidden={activeTab !== 'daily-check'}>
        <DailyCheck />
      </section>
    </div>
    </DashboardTabsContext.Provider>
  );
}