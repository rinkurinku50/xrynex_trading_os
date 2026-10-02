'use client';

import { useState } from 'react';
import MistakeMemory from '@/components/MistakeMemory';

export default function DashboardTabs({ children }) {
  const [activeTab, setActiveTab] = useState('main');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-line" role="tablist" aria-label="Dashboard views">
        <button
          id="main-dashboard-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === 'main'}
          aria-controls="main-dashboard-panel"
          onClick={() => setActiveTab('main')}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'main' ? 'border-gold text-white' : 'border-transparent text-muted hover:text-text'}`}
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
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'mistakes' ? 'border-gold text-white' : 'border-transparent text-muted hover:text-text'}`}
        >
          Trading Mistakes
        </button>
      </div>
      <section id="mistakes-panel" role="tabpanel" aria-labelledby="mistakes-tab" hidden={activeTab !== 'mistakes'}>
        <MistakeMemory />
      </section>
      <section id="main-dashboard-panel" role="tabpanel" aria-labelledby="main-dashboard-tab" hidden={activeTab !== 'main'}>
        {children}
      </section>
    </div>
  );
}