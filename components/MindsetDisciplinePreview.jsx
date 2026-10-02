'use client';

import { useContext, useEffect, useState } from 'react';
import { FiArrowUpRight } from 'react-icons/fi';
import { DashboardTabsContext } from '@/components/DashboardTabs';

export default function MindsetDisciplinePreview() {
  const dashboardTabs = useContext(DashboardTabsContext);
  const [weekday, setWeekday] = useState('');

  useEffect(() => {
    setWeekday(new Date().toLocaleDateString(undefined, { weekday: 'long' }));
  }, []);

  return (
    <div className="mindset-preview-wrap">
      <section className="mindset-preview" aria-labelledby="mindset-preview-title">
        <div className="mindset-preview-copy">
          <p className="mindset-preview-eyebrow">
            <span id="mindset-preview-title">Mindset &amp; Discipline</span>
            <span aria-hidden="true">·</span>
            <span>{weekday ? `${weekday} focus` : 'Today’s focus'}</span>
          </p>
          <div className="mindset-preview-feature">
            <span className="mindset-preview-icon" aria-hidden="true">✦</span>
            <div className="min-w-0">
              <h2>Start before you feel ready.</h2>
              <p>Waiting for motivation can leave you stuck. <strong>Take one small step; momentum follows.</strong></p>
            </div>
          </div>
        </div>
        <span className="mindset-preview-divider" aria-hidden="true" />
        <div className="mindset-preview-action">
          <span>DAILY FOCUS</span>
          <button type="button" className="mindset-preview-link" onClick={dashboardTabs?.openMindsetDiscipline}>
            Open Mindset &amp; Discipline <FiArrowUpRight aria-hidden="true" />
          </button>
        </div>
      </section>
      <div className="mindset-preview-bottom-rule" aria-hidden="true" />
    </div>
  );
}