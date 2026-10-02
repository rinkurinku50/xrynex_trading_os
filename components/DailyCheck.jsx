'use client';

import { useEffect, useState } from 'react';
import { FiCheck, FiChevronLeft, FiChevronRight, FiPlus, FiTrash2 } from 'react-icons/fi';

async function requestMindsetApi(method, body) {
  const response = await fetch('/api/mindset', {
    method,
    cache: 'no-store',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not save mindset data.');
  return result;
}

const LEGACY_STORAGE_KEY = 'tradingOsDailyCheckV1';

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function markedText(text) {
  return String(text || '').split(/\*\*(.+?)\*\*/g).map((part, index) => (
    index % 2 ? <strong key={index} className="font-semibold text-white">{part}</strong> : part
  ));
}

export default function DailyCheck() {
  const [categories, setCategories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [date, setDate] = useState(null);
  const [addingTab, setAddingTab] = useState(false);
  const [tabName, setTabName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const saved = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved !== null) {
          let legacy;
          try {
            legacy = JSON.parse(saved);
          } catch {
            throw new Error('Saved browser mindset data is invalid; it was not removed.');
          }
          if (!legacy || !Array.isArray(legacy.tabs) || !Array.isArray(legacy.tips)) {
            throw new Error('Saved browser mindset data is invalid; it was not removed.');
          }
          await requestMindsetApi('POST', { type: 'import-legacy', tabs: legacy.tabs, tips: legacy.tips });
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        const data = await requestMindsetApi('GET');
        if (!mounted) return;
        setCategories(data.categories);
        setActiveTab(data.categories.find((category) => category.isDefault)?.id || data.categories[0]?.id || '');
        setDate(new Date());
      } catch (loadError) {
        if (mounted) setError(loadError.message);
      } finally {
        if (mounted) setLoaded(true);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const activeCategory = categories.find((category) => category.id === activeTab);
  const tips = activeCategory?.tips || [];
  const selectedIndex = Math.min(currentIndex, Math.max(0, tips.length - 1));
  const selectedTip = tips[selectedIndex];
  const todayIndex = date && tips.length ? dayOfYear(date) % tips.length : 0;
  const hue = (208 + Math.max(0, categories.findIndex((category) => category.id === activeTab)) * 62 + selectedIndex * 19) % 360;

  function chooseTab(id) {
    const nextTips = categories.find((category) => category.id === id)?.tips || [];
    setActiveTab(id);
    setCurrentIndex(date && nextTips.length ? dayOfYear(date) % nextTips.length : 0);
  }

  async function addTab(event) {
    event.preventDefault();
    const name = tabName.trim();
    if (!name) return;
    try {
      const category = await requestMindsetApi('POST', { type: 'category', name });
      setCategories((current) => [...current, { ...category, tips: [] }]);
      setTabName('');
      setAddingTab(false);
      setActiveTab(category.id);
      setCurrentIndex(0);
      setError('');
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function deleteTab(id) {
    if (!window.confirm('Delete this category and all its custom tips?')) return;
    try {
      await requestMindsetApi('DELETE', { type: 'category', id });
      const remaining = categories.filter((category) => category.id !== id);
      setCategories(remaining);
      if (activeTab === id) {
        const nextCategory = remaining.find((category) => category.isDefault) || remaining[0];
        setActiveTab(nextCategory?.id || '');
        setCurrentIndex(0);
      }
      setError('');
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function addTip(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const values = {
      categoryId: String(form.get('categoryId')),
      title: String(form.get('title')).trim(),
      icon: String(form.get('icon')).trim() || '💡',
      problem: String(form.get('problem')).trim(),
      why: String(form.get('why')).trim(),
      action: String(form.get('action')).trim(),
    };
    try {
      const tip = await requestMindsetApi('POST', { type: 'tip', ...values });
      setCategories((current) => current.map((category) => category.id === tip.categoryId
        ? { ...category, tips: [...category.tips, tip] }
        : category));
      setActiveTab(tip.categoryId);
      setCurrentIndex(activeCategory?.id === tip.categoryId ? tips.length : 0);
      setError('');
      formElement.reset();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function deleteTip(id) {
    if (!window.confirm('Delete this tip?')) return;
    try {
      await requestMindsetApi('DELETE', { type: 'tip', id });
      const removedIndex = tips.findIndex((tip) => tip.id === id);
      const nextIndex = selectedIndex - (removedIndex >= 0 && removedIndex < selectedIndex ? 1 : 0);
      setCategories((current) => current.map((category) => category.id === activeTab
        ? { ...category, tips: category.tips.filter((tip) => tip.id !== id) }
        : category));
      setCurrentIndex(Math.max(0, Math.min(nextIndex, tips.length - 2)));
      setError('');
    } catch (deleteError) {
      setError(deleteError.message);
    }
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

      {error && <p role="alert" className="daily-check-empty">{error}</p>}

      <nav className="daily-check-tabs" role="tablist" aria-label="Tip categories">
        {categories.map((category) => (
          <div key={category.id} className={`daily-check-tab ${activeTab === category.id ? 'is-active' : ''}`}>
            <button type="button" role="tab" aria-selected={activeTab === category.id} onClick={() => chooseTab(category.id)}>
              {category.name}<span className="daily-check-count">{category.tips.length}</span>
            </button>
            {!category.isDefault && <button type="button" title={`Delete ${category.name}`} aria-label={`Delete ${category.name}`} onClick={() => deleteTab(category.id)} className="daily-check-tab-delete"><FiTrash2 size={13} /></button>}
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
              <span className="daily-check-tag">{activeCategory?.name} · #{selectedIndex + 1}</span>
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
                  {!tip.isDefault && <button type="button" onClick={() => deleteTip(tip.id)} title={`Delete ${tip.title}`} aria-label={`Delete ${tip.title}`} className="daily-check-delete"><FiTrash2 size={14} /></button>}
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
            <select key={activeTab} name="categoryId" defaultValue={activeTab} className="field w-full px-3 py-2.5 text-sm text-text">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
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