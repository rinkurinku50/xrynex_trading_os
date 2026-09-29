'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import ConceptIcon from '@/components/ConceptIcon';

const groups = [
  {
    items: [
      { href: '/', label: 'Dashboard', icon: '🏠' },
      { href: '/daily-tasks', label: 'Daily Tasks', icon: '✅' },
      { href: '/trading-plan', label: 'Trading Plan', icon: '🗓' },
    ],
  },
  {
    title: 'Knowledge Base',
    href: '/concepts',
    icon: '📚',
    items: []
  },
  { items: [{ href: '/videos', label: 'Video Notes', icon: '🎬' }] },
  {
    title: 'Strategy Lab',
    href: '/strategies',
    icon: '🧪',
    items: []
  },
  {
    items: [
      { href: '/charts', label: 'Charts', icon: '🖼' },
      { href: '/ideas', label: 'Idea Inbox', icon: '💡' },
      { href: '/questions', label: 'Questions / Doubts', icon: '❓' },
      { href: '/archive', label: 'Archive', icon: '🗄' },
      { href: '/tutorial', label: 'Tutorial', icon: '🧭' }
    ]
  }
];

export default function Sidebar({ isAdmin = false }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [concepts, setConcepts] = useState([]);
  const [strategies, setStrategies] = useState([]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const loadConcepts = () => fetch('/api/concepts', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : [])
      .then((rows) => setConcepts(rows.filter((concept) => concept.showInNav)))
      .catch(() => setConcepts([]));

    loadConcepts();
    window.addEventListener('concepts-updated', loadConcepts);
    return () => window.removeEventListener('concepts-updated', loadConcepts);
  }, []);

  useEffect(() => {
    const loadStrategies = () => fetch('/api/strategies', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : [])
      .then((rows) => setStrategies(rows.filter((strategy) => strategy.showInNav)))
      .catch(() => setStrategies([]));

    loadStrategies();
    window.addEventListener('strategies-updated', loadStrategies);
    return () => window.removeEventListener('strategies-updated', loadStrategies);
  }, []);

  const navigationGroups = [...groups, ...(isAdmin ? [{ items: [{ href: '/admin', label: 'Admin Settings', icon: '⚙️' }] }] : [])].map((group) => {
    if (group.title === 'Knowledge Base') {
      return {
        ...group,
        items: concepts.map((concept) => ({
          href: `/concepts#${concept.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
          label: concept.name,
          icon: <ConceptIcon icon={concept.icon} className="h-4 w-4 shrink-0" />,
        })),
      };
    }
    if (group.title === 'Strategy Lab') {
      return {
        ...group,
        items: strategies.map((strategy) => ({
          href: `/strategies#strategy-${strategy.id}`,
          label: `${strategy.code ? `${strategy.code} · ` : ''}${strategy.name}`,
          icon: '📑',
        })),
      };
    }
    return group;
  });

  const match = (label) => !query || label.toLowerCase().includes(query.toLowerCase());

  return (
    <>
      <button
        type="button"
        className={`fixed left-3 top-3 z-50 h-11 w-11 items-center justify-center rounded-lg border border-line bg-panel text-xl text-text shadow-lg shadow-black/30 lg:hidden ${open ? 'hidden' : 'flex'}`}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden>{open ? '×' : '☰'}</span>
      </button>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,280px)] shrink-0 flex-col border-r border-line bg-panel px-3 py-4 shadow-2xl shadow-black/40 transition-all duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${collapsed ? 'lg:w-[72px] lg:px-2' : 'lg:w-[260px]'} ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className={`mb-4 flex min-w-0 items-center justify-between gap-1 px-1 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
        <div className={`flex min-w-0 items-center gap-1 ${collapsed ? 'lg:hidden' : ''}`}>
          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-line bg-black" aria-hidden="true">
            <img src="/xrynex-logo.png" alt="" className="h-full w-full object-contain" />
          </span>
          <span className="whitespace-nowrap text-[14px] font-semibold text-white">Xrynex Trading OS</span>
        </div>
        <button
          type="button"
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-panel2 text-lg text-text hover:border-win/50 hover:text-win lg:flex"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed}
          aria-controls="workspace-navigation"
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={() => setCollapsed((current) => !current)}
        >
          <span aria-hidden>☰</span>
        </button>
        <button type="button" className="btn px-2 py-1 text-lg leading-none lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)}>×</button>
      </div>

      <label className="sr-only" htmlFor="sidebar-search">Search the workspace</label>
      <input
        id="sidebar-search"
        className={`field mb-3 lg:mb-4 ${collapsed ? 'lg:hidden' : ''}`}
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <nav id="workspace-navigation" className="flex-1 space-y-4 overflow-y-auto pr-1">
        {navigationGroups.map((group, gi) => {
          const visible = group.items.filter((i) => match(i.label));
          const titleMatches = group.title ? match(group.title) : false;
          if (!visible.length && !titleMatches) return null;
          return (
            <div key={gi}>
              {group.title && (
                <Link
                  href={group.href}
                  aria-label={group.title}
                  title={collapsed ? group.title : undefined}
                  className={`nav-link font-semibold ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''} ${pathname === group.href ? 'nav-link-active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <span aria-hidden>{group.icon}</span>
                  <span className={collapsed ? 'lg:hidden' : ''}>{group.title}</span>
                </Link>
              )}
              <div className={`${group.title ? 'ml-3 border-l border-line pl-2' : ''} ${collapsed && group.title ? 'lg:ml-0 lg:border-l-0 lg:pl-0' : ''}`}>
                {visible.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    aria-label={item.label}
                    title={collapsed ? item.label : undefined}
                    className={`nav-link ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''} ${pathname === item.href ? 'nav-link-active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    <span aria-hidden>{item.icon}</span>
                    <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <figure className={`mt-4 border-t border-line px-2 pt-4 ${collapsed ? 'lg:hidden' : ''}`}>
        <blockquote className="font-display text-[19px] leading-tight text-text/90">
          “Discipline turns knowledge into profit.”
        </blockquote>
        <figcaption className="mt-1 text-[12px] text-muted">— Keep going</figcaption>
      </figure>
      </aside>
    </>
  );
}
