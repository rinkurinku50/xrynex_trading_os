'use client';

import { useContext, useEffect, useState } from 'react';
import { FiArrowUpRight } from 'react-icons/fi';
import { DashboardTabsContext } from '@/components/DashboardTabs';

export default function MindsetDisciplinePreview() {
  const dashboardTabs = useContext(DashboardTabsContext);
  const [weekday, setWeekday] = useState('');
  const [tip, setTip] = useState(null);

  useEffect(() => {
    let mounted = true;
    const today = new Date();
    setWeekday(today.toLocaleDateString(undefined, { weekday: 'long' }));
    fetch('/api/mindset', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!mounted || !data) return;
        const defaultTips = data.categories.find((category) => category.isDefault)?.tips || [];
        if (!defaultTips.length) return;
        const yearStart = new Date(today.getFullYear(), 0, 0);
        const dayIndex = Math.floor((today - yearStart) / 86400000) % defaultTips.length;
        setTip(defaultTips[dayIndex]);
      })
      .catch(() => {});
    return () => { mounted = false; };
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
              <h2>{tip?.title || 'No mindset focus saved'}</h2>
              <p>{tip?.action || 'Open Mindset & Discipline to review your saved focus.'}</p>
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