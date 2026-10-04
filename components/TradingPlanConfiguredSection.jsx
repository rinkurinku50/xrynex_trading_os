'use client';

import { useRef, useState } from 'react';
import { writePreferences } from '@/lib/client-preferences';

function updateItem(section, itemId, subsectionId, done) {
  if (subsectionId) {
    return {
      ...section,
      subsections: (section.subsections || []).map((subsection) => subsection.id !== subsectionId ? subsection : {
        ...subsection,
        items: (subsection.items || []).map((item) => item.id === itemId ? { ...item, done } : item),
      }),
    };
  }
  return { ...section, items: (section.items || []).map((item) => item.id === itemId ? { ...item, done } : item) };
}

function ChecklistItems({ items, subsectionId, onToggle }) {
  const visibleItems = (items || []).filter((item) => item.enabled !== false);
  if (!visibleItems.length) return <p className="py-3 text-[12px] text-muted">No visible items in this section.</p>;
  return <ul className="divide-y divide-line">{visibleItems.map((item) => (
    <li key={item.id} className="flex items-center gap-3 py-3">
      <button type="button" role="checkbox" aria-checked={Boolean(item.done)} aria-label={`${item.done ? 'Uncheck' : 'Check'} ${item.title}`} onClick={() => onToggle(item, subsectionId)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${item.done ? 'border-win bg-win text-ink' : 'border-[#7890a1] bg-transparent text-transparent hover:border-win/70'}`}>
        {item.done ? '✓' : ''}
      </button>
      <span className={`min-w-0 flex-1 text-[13px] ${item.done ? 'text-muted line-through' : 'text-text'}`}>{item.title}</span>
    </li>
  ))}</ul>;
}

export default function TradingPlanConfiguredSection({ section }) {
  const [currentSection, setCurrentSection] = useState(section);
  const [error, setError] = useState('');
  const saveQueue = useRef(Promise.resolve());

  async function toggleItem(item, subsectionId) {
    const done = !item.done;
    setCurrentSection((current) => updateItem(current, item.id, subsectionId, done));
    setError('');
    saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
      const response = await fetch('/api/preferences?keys=trading-plan-layout', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load Trading Plan layout.');
      const layout = result.values['trading-plan-layout'];
      const sections = layout.sections.map((savedSection) => savedSection.id === section.id
        ? updateItem(savedSection, item.id, subsectionId, done)
        : savedSection);
      await writePreferences({ 'trading-plan-layout': { ...layout, sections } });
    }).catch((saveError) => setError(saveError.message));
  }

  const visibleSubsections = (currentSection.subsections || []).filter((subsection) => subsection.enabled !== false);
  return (
    <section className="panel">
      <header className="panel-head">
        <h2 className="panel-title">{currentSection.title}</h2>
        {currentSection.type === 'conditions' && <span className="text-[11px] text-muted">Conditions to assess</span>}
      </header>
      <div className="panel-body">
        {error && <p role="alert" className="mb-3 text-[12px] text-loss">{error}</p>}
        {visibleSubsections.length ? <div className="space-y-4">
          {visibleSubsections.map((subsection) => <section key={subsection.id} aria-label={subsection.title}>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{subsection.title}</h3>
            <ChecklistItems items={subsection.items} subsectionId={subsection.id} onToggle={toggleItem} />
          </section>)}
        </div> : <ChecklistItems items={currentSection.items} onToggle={toggleItem} />}
      </div>
    </section>
  );
}
