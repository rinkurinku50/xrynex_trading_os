'use client';

import { useEffect, useState } from 'react';
import { FiCheck, FiChevronLeft, FiChevronRight, FiPlus, FiTrash2 } from 'react-icons/fi';
import { DEFAULT_TAB, DEFAULT_TIPS, dayOfYear, readDailyCheckStore, writeDailyCheckStore } from '@/lib/daily-check-data';

function markedText(text) {
  return String(text || '').split(/\*\*(.+?)\*\*/g).map((part, index) => (
    index % 2 ? <strong key={index} className="font-semibold text-white">{part}</strong> : part
  ));
}

export default function DailyCheck() {
  const [store, setStore] = useState({ tabs: [], tips: [] });
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB.id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [date, setDate] = useState(null);
  const [addingTab, setAddingTab] = useState(false);
  const [tabName, setTabName] = useState('');

  useEffect(() => {
    setStore(readDailyCheckStore());
    setDate(new Date());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeDailyCheckStore(store);
  }, [loaded, store]);

  const tabs = [DEFAULT_TAB, ...store.tabs];
  const tips = [
    ...(activeTab === DEFAULT_TAB.id ? DEFAULT_TIPS.map((tip, index) => ({ ...tip, id: `default-${index}` })) : []),
    ...store.tips.filter((tip) => tip.tab === activeTab),
  ];
  const selectedIndex = Math.min(currentIndex, Math.max(0, tips.length - 1));
  const selectedTip = tips[selectedIndex];
  const todayIndex = date && tips.length ? dayOfYear(date) % tips.length : 0;
  const hue = (208 + Math.max(0, tabs.findIndex((tab) => tab.id === activeTab)) * 62 + selectedIndex * 19) % 360;

  function chooseTab(id) {
    setActiveTab(id);
    const nextTips = [
      ...(id === DEFAULT_TAB.id ? DEFAULT_TIPS : []),
      ...store.tips.filter((tip) => tip.tab === id),
    ];
    setCurrentIndex(date && nextTips.length ? dayOfYear(date) % nextTips.length : 0);
  }

  function addTab(event) {
    event.preventDefault();
    const name = tabName.trim();
    if (!name) return;
    const tab = { id: `tab-${Date.now()}`, name };
    setStore((current) => ({ ...current, tabs: [...current.tabs, tab] }));
    setTabName('');
    setAddingTab(false);
    setActiveTab(tab.id);
    setCurrentIndex(0);
  }

  function deleteTab(id) {
    if (!window.confirm('Delete this category and all its custom tips?')) return;
    setStore((current) => ({
      tabs: current.tabs.filter((tab) => tab.id !== id),
      tips: current.tips.filter((tip) => tip.tab !== id),
    }));
    chooseTab(DEFAULT_TAB.id);
  }

  function addTip(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tip = {
      id: `tip-${Date.now()}`,
      tab: String(form.get('tab')),
      title: String(form.get('title')).trim(),
      icon: String(form.get('icon')).trim() || '💡',
      problem: String(form.get('problem')).trim(),
      why: String(form.get('why')).trim(),
      action: String(form.get('action')).trim(),
    };
    setStore((current) => ({ ...current, tips: [...current.tips, tip] }));
    setActiveTab(tip.tab);
    setCurrentIndex(store.tips.filter((item) => item.tab === tip.tab).length + (tip.tab === DEFAULT_TAB.id ? DEFAULT_TIPS.length : 0));
    event.currentTarget.reset();
  }

  function deleteTip(id) {
    if (!window.confirm('Delete this tip?')) return;
    const nextTips = store.tips.filter((tip) => tip.id !== id);
    const removedIndex = tips.findIndex((tip) => tip.id === id);
    const nextIndex = selectedIndex - (removedIndex >= 0 && removedIndex < selectedIndex ? 1 : 0);
    setStore((current) => ({ ...current, tips: nextTips }));
    setCurrentIndex(Math.max(0, Math.min(nextIndex, tips.length - 2)));
  }

  function moveTip(offset) {
    setCurrentIndex((index) => tips.length ? (index + offset + tips.length) % tips.length : 0);
  }

  return (
    <div className="daily-check-shell" style={{ '--daily-hue': hue }}>
      <header className="daily-check-header">
        <div className="flex items-center gap-3">
          <span className="daily-check-logo">✦</span>
          <div>
            <h1 className="daily-check-title">Mindset &amp; Discipline</h1>
            <p className="daily-check-date">{date ? date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Loading today'}</p>
          </div>
        </div>
        <button type="button" onClick={() => setCurrentIndex(todayIndex)} className="daily-check-today">Today’s tip</button>
      </header>

      <nav className="daily-check-tabs" role="tablist" aria-label="Tip categories">
        {tabs.map((tab) => (
          <div key={tab.id} className={`daily-check-tab ${activeTab === tab.id ? 'is-active' : ''}`}>
            <button type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => chooseTab(tab.id)}>
              {tab.name}<span className="daily-check-count">{store.tips.filter((tip) => tip.tab === tab.id).length + (tab.id === DEFAULT_TAB.id ? DEFAULT_TIPS.length : 0)}</span>
            </button>
            {tab.id !== DEFAULT_TAB.id && <button type="button" title={`Delete ${tab.name}`} aria-label={`Delete ${tab.name}`} onClick={() => deleteTab(tab.id)} className="daily-check-tab-delete"><FiTrash2 size={13} /></button>}
          </div>
        ))}
        {!addingTab ? (
          <button type="button" onClick={() => setAddingTab(true)} className="daily-check-add-tab"><FiPlus /> New category</button>
        ) : (
          <form onSubmit={addTab} className="flex gap-2">
            <input autoFocus required maxLength={30} value={tabName} onChange={(event) => setTabName(event.target.value)} placeholder="Category name" aria-label="Category name" className="field w-40 px-3 py-2 text-sm" />
            <button className="daily-check-submit" type="submit">Add</button>
          </form>
        )}
      </nav>

      {!loaded ? <div className="daily-check-empty">Loading your daily check…</div> : tips.length ? (
        <>
          <article key={`${activeTab}-${selectedTip.id}`} className="daily-check-hero" aria-live="polite">
            <div className="daily-check-art">
              <span className="daily-check-emoji" aria-hidden="true">{selectedTip.icon || '💡'}</span>
            </div>
            <div className="daily-check-copy">
              <span className="daily-check-tag">{tabs.find((tab) => tab.id === activeTab)?.name} · #{selectedIndex + 1}</span>
              <h2 className="daily-check-tip-title">{selectedTip.title}</h2>
              <p className="daily-check-paragraph">{markedText(selectedTip.problem)}</p>
              {selectedTip.why && <p className="daily-check-paragraph">{markedText(selectedTip.why)}</p>}
              <p className="daily-check-action"><FiCheck aria-hidden="true" />{selectedTip.action}</p>
              <div className="daily-check-controls">
                <button type="button" onClick={() => moveTip(-1)} className="daily-check-previous"><FiChevronLeft /> Previous</button>
                <button type="button" onClick={() => moveTip(1)} className="daily-check-next">Next tip <FiChevronRight /></button>
                <div className="daily-check-dots" aria-label={`Tip ${selectedIndex + 1} of ${tips.length}`}>
                  {tips.map((tip, index) => <button key={tip.id} type="button" onClick={() => setCurrentIndex(index)} aria-label={`Show tip ${index + 1}`} className={index === selectedIndex ? 'is-active' : ''} />)}
                </div>
              </div>
            </div>
          </article>

          <section className="daily-check-list" aria-labelledby="all-daily-tips-heading">
            <h2 id="all-daily-tips-heading" className="daily-check-section-title">All tips <span>{tips.length}</span></h2>
            <div className="daily-check-grid">
              {tips.map((tip, index) => (
                <article key={tip.id} style={{ '--card-hue': (hue + index * 37) % 360, animationDelay: `${index * 55}ms` }} className={`daily-check-card ${index === selectedIndex ? 'is-active' : ''}`}>
                  <button type="button" onClick={() => setCurrentIndex(index)} className="w-full text-left">
                    <span className="daily-check-card-icon">{tip.icon || '💡'}</span>
                    <span className="daily-check-card-title">{tip.title}</span>
                    <span className="daily-check-card-number">Tip #{index + 1}</span>
                  </button>
                  {!tip.id.startsWith('default-') && <button type="button" onClick={() => deleteTip(tip.id)} title={`Delete ${tip.title}`} aria-label={`Delete ${tip.title}`} className="daily-check-delete"><FiTrash2 size={14} /></button>}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="daily-check-empty">
          <strong>No tips in this category yet</strong>
          <span>Add a tip below to start this collection.</span>
        </div>
      )}

      <details className="daily-check-form">
        <summary>Write a new tip <span aria-hidden="true">+</span></summary>
        <form onSubmit={addTip}>
          <label className="sm:col-span-2">Category
            <select key={activeTab} name="tab" defaultValue={activeTab} className="field w-full px-3 py-2.5 text-sm text-text">{tabs.map((tab) => <option key={tab.id} value={tab.id}>{tab.name}</option>)}</select>
          </label>
          <label>Title
            <input name="title" required maxLength={60} placeholder="Protect your focus" className="field w-full px-3 py-2.5 text-sm" />
          </label>
          <label>Icon <small>(emoji)</small>
            <input name="icon" maxLength={4} placeholder="🎯" className="field w-full px-3 py-2.5 text-sm" />
          </label>
          <label className="sm:col-span-2">The problem <small>Use **double stars** for bold</small>
            <textarea name="problem" required maxLength={500} rows={2} placeholder="What tends to get in the way?" className="field w-full resize-y px-3 py-2.5 text-sm" />
          </label>
          <label className="sm:col-span-2">Why it matters
            <textarea name="why" maxLength={500} rows={2} placeholder="What is the impact?" className="field w-full resize-y px-3 py-2.5 text-sm" />
          </label>
          <label className="sm:col-span-2">What to do
            <input name="action" required maxLength={240} placeholder="Choose one useful next action." className="field w-full px-3 py-2.5 text-sm" />
          </label>
          <div className="sm:col-span-2"><button className="daily-check-submit" type="submit"><FiPlus /> Add tip</button></div>
        </form>
      </details>
    </div>
  );
}