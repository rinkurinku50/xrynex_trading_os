'use client';

import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuChevronDown, LuGripVertical, LuPencil, LuPlus, LuSettings, LuTrash2 } from 'react-icons/lu';
import SelectMenu from '@/components/SelectMenu';
import { useConfirmDialog } from '@/components/ConfirmDialogProvider';

const initialGroups = [
  {
    id: 'pre-market',
    title: 'Pre-market',
    rules: [
      { id: 'calendar', title: 'Review economic calendar and news', required: false },
      { id: 'levels', title: 'Mark key levels and higher-timeframe trend', required: true },
      { id: 'bias', title: 'Define bias and the only setups I trade today', required: true },
      { id: 'loss-limit', title: 'Confirm daily loss limit is set', required: true },
      { id: 'focus', title: 'Write the one thing I must execute well', required: true },
    ],
  },
  {
    id: 'entry-criteria',
    title: 'Entry criteria',
    rules: [
      { id: 'plan-match', title: 'Setup matches my written plan', required: true },
      { id: 'trend', title: 'Trend and momentum confirm the direction', required: false },
      { id: 'trigger', title: 'Entry trigger has printed, no anticipating', required: true },
      { id: 'risk-reward', title: 'Risk-to-reward is at least 2:1', required: true },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    rules: [
      { id: 'journal', title: 'Journal the trade with a screenshot', required: true },
      { id: 'mistake', title: 'Record one lesson without judging the outcome', required: false },
    ],
  },
];

const storageKey = 'xrynex-trading-plan-checklist';
const defaultRequirements = ['Must pass', 'Optional'];

function requirementFor(rule) {
  return rule.requirement || (rule.required ? 'Must pass' : 'Optional');
}

export default function TradingPlanChecklist() {
  const confirm = useConfirmDialog();
  const [groups, setGroups] = useState(initialGroups);
  const [collapsed, setCollapsed] = useState({});
  const [filter, setFilter] = useState('All');
  const [sessions, setSessions] = useState(6);
  const [requirements, setRequirements] = useState(defaultRequirements);
  const [newRequirements, setNewRequirements] = useState({});
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newRequirementValue, setNewRequirementValue] = useState('');
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draggedGroup, setDraggedGroup] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      if (saved?.groups) {
        setGroups(saved.groups.map((group) => ({
          ...group,
          rules: group.rules.map((rule) => ({ ...rule, requirement: requirementFor(rule) })),
        })));
      }
      if (saved?.sessions) setSessions(saved.sessions);
      if (Array.isArray(saved?.requirements) && saved.requirements.length) setRequirements([...new Set(saved.requirements)]);
    } catch {
      // Use the starter checklist when browser storage is unavailable.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify({ groups, sessions, requirements }));
  }, [groups, hydrated, requirements, sessions]);

  const stats = useMemo(() => {
    const rules = groups.flatMap((group) => group.rules);
    const completed = rules.filter((rule) => rule.done).length;
    const mustPass = rules.filter((rule) => requirementFor(rule) === 'Must pass');
    const passedRequired = mustPass.filter((rule) => rule.done).length;
    return {
      total: rules.length,
      completed,
      required: mustPass.length,
      passedRequired,
      completion: rules.length ? Math.round((completed / rules.length) * 100) : 0,
      readiness: mustPass.length && passedRequired === mustPass.length,
    };
  }, [groups]);

  function toggleRule(groupId, ruleId) {
    setGroups((current) => current.map((group) => group.id !== groupId ? group : {
      ...group,
      rules: group.rules.map((rule) => rule.id === ruleId ? { ...rule, done: !rule.done } : rule),
    }));
  }

  function setRequirement(groupId, ruleId, requirement) {
    setGroups((current) => current.map((group) => group.id !== groupId ? group : {
      ...group,
      rules: group.rules.map((rule) => rule.id === ruleId ? { ...rule, requirement, required: requirement === 'Must pass' } : rule),
    }));
  }

  function uncheckAll() {
    setGroups((current) => current.map((group) => ({
      ...group,
      rules: group.rules.map((rule) => ({ ...rule, done: false })),
    })));
  }

  function addRule(groupId, title, requirement) {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setGroups((current) => current.map((group) => group.id !== groupId ? group : {
      ...group,
      rules: [...group.rules, { id: `${groupId}-${Date.now()}`, title: cleanTitle, requirement, required: requirement === 'Must pass' }],
    }));
  }

  async function removeGroup(groupId) {
    const group = groups.find((item) => item.id === groupId);
    const accepted = await confirm({
      title: 'Delete checklist section?',
      message: `“${group?.title || 'This section'}” and all its rules will be permanently removed.`,
      confirmLabel: 'Delete section',
    });
    if (!accepted) return;
    setGroups((current) => current.filter((group) => group.id !== groupId));
  }

  function addGroup(event) {
    event.preventDefault();
    const title = newGroupTitle.trim();
    if (!title) return;
    setGroups((current) => [...current, { id: `group-${Date.now()}`, title, rules: [] }]);
    setNewGroupTitle('');
  }

  function saveRequirement(event) {
    event.preventDefault();
    const value = newRequirementValue.trim();
    if (!value) return;
    const duplicate = requirements.some((requirement) => requirement !== editingRequirement && requirement.toLowerCase() === value.toLowerCase());
    if (duplicate) return;
    if (editingRequirement) {
      setRequirements((current) => current.map((requirement) => requirement === editingRequirement ? value : requirement));
      setGroups((current) => current.map((group) => ({
        ...group,
        rules: group.rules.map((rule) => requirementFor(rule) === editingRequirement
          ? { ...rule, requirement: value, required: value === 'Must pass' }
          : rule),
      })));
    } else {
      setRequirements((current) => [...current, value]);
    }
    setNewRequirementValue('');
    setEditingRequirement(null);
  }

  function editRequirement(value) {
    setEditingRequirement(value);
    setNewRequirementValue(value);
  }

  async function removeRequirement(value) {
    if (defaultRequirements.includes(value)) return;
    const accepted = await confirm({
      title: 'Remove requirement value?',
      message: `“${value}” will be removed. Rules using it will become Optional.`,
      confirmLabel: 'Remove value',
    });
    if (!accepted) return;
    setRequirements((current) => current.filter((requirement) => requirement !== value));
    setGroups((current) => current.map((group) => ({
      ...group,
      rules: group.rules.map((rule) => requirementFor(rule) === value ? { ...rule, requirement: 'Optional', required: false } : rule),
    })));
    if (editingRequirement === value) {
      setEditingRequirement(null);
      setNewRequirementValue('');
    }
  }

  function moveGroup(targetId, sourceId = draggedGroup) {
    if (!sourceId || sourceId === targetId) return;
    setGroups((current) => {
      const fromIndex = current.findIndex((group) => group.id === sourceId);
      const toIndex = current.findIndex((group) => group.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedGroup(null);
    setDropTarget(null);
  }

  return (
    <section className="overflow-visible rounded-xl border border-line bg-[#0e1a24] shadow-xl shadow-black/10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#0a141d] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-win text-ink" aria-hidden>✓</span>
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-semibold text-white">Trading Plan</h2>
            <p className="text-[12px] text-muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn" onClick={uncheckAll}>Uncheck all</button>
          <button type="button" className={`btn ${settingsOpen ? 'border-info/50 text-info' : ''}`} onClick={() => setSettingsOpen((current) => !current)} aria-expanded={settingsOpen}>
            <LuSettings className="h-4 w-4" aria-hidden />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {settingsOpen && <div className="border-b border-line bg-[#0b1721] px-4 py-5 sm:px-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Checklist settings</p>
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </div>
        <form onSubmit={addGroup} className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-info/40 bg-info/5 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-text">Add a checklist section</p>
            <p className="mt-1 text-[12px] text-muted">Create a new card for another stage of your trading process.</p>
          </div>
          <input className="field min-w-0 flex-1 sm:max-w-xs" value={newGroupTitle} onChange={(event) => setNewGroupTitle(event.target.value)} placeholder="Section name" aria-label="New checklist section name" maxLength={80} />
          <button type="submit" className="btn btn-primary shrink-0"><LuPlus className="h-4 w-4" aria-hidden /><span>Add section</span></button>
        </form>
        <form onSubmit={saveRequirement} className="mt-3 rounded-lg border border-line bg-panel2/30 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-muted">Add or manage values available in every requirement dropdown.</p>
            {editingRequirement && <button type="button" className="text-[12px] text-muted hover:text-text" onClick={() => { setEditingRequirement(null); setNewRequirementValue(''); }}>Cancel edit</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input className="field min-w-0 flex-1 sm:w-52" value={newRequirementValue} onChange={(event) => setNewRequirementValue(event.target.value)} placeholder={editingRequirement ? 'Edit requirement value' : 'e.g. Review'} aria-label="New requirement value" maxLength={40} />
            <button type="submit" className="btn"><LuPlus className="h-4 w-4" aria-hidden />{editingRequirement ? 'Save value' : 'Add value'}</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {requirements.map((value) => (
              <div key={value} className="inline-flex items-center gap-1 rounded-lg border border-line bg-ink px-2 py-1 text-[12px] text-text">
                <span>{value}</span>
                {defaultRequirements.includes(value) ? <span className="ml-1 text-[10px] uppercase tracking-wide text-muted">Built in</span> : <>
                  <button type="button" className="rounded p-1 text-muted hover:bg-panel2 hover:text-info" aria-label={`Edit ${value}`} title={`Edit ${value}`} onClick={() => editRequirement(value)}><LuPencil className="h-3.5 w-3.5" aria-hidden /></button>
                  <button type="button" className="rounded p-1 text-muted hover:bg-panel2 hover:text-loss" aria-label={`Remove ${value}`} title={`Remove ${value}`} onClick={() => removeRequirement(value)}><LuTrash2 className="h-3.5 w-3.5" aria-hidden /></button>
                </>}
              </div>
            ))}
          </div>
        </form>
      </div>}

      <div className="grid border-b border-line sm:grid-cols-2 lg:grid-cols-4">
        <div className={`border-b border-line px-4 py-4 sm:col-span-2 sm:border-r lg:col-span-1 lg:border-b-0 ${stats.readiness ? 'bg-win/10' : 'bg-loss/10'}`}>
          <p className="text-[12px] text-muted">Trade readiness</p>
          <p className={`mt-1 text-2xl font-semibold ${stats.readiness ? 'text-win' : 'text-loss'}`}>{stats.readiness ? 'Ready' : 'Not ready'}</p>
          <p className="mt-1 text-[12px] text-muted">{stats.required - stats.passedRequired} must-pass rules remaining</p>
        </div>
        <div className="border-b border-line px-4 py-4 sm:border-r lg:border-b-0">
          <p className="text-[12px] text-muted">Completion</p>
          <p className="mt-1 text-2xl font-semibold text-text">{stats.completion}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel2"><div className="h-full rounded-full bg-win transition-all" style={{ width: `${stats.completion}%` }} /></div>
        </div>
        <div className="border-b border-line px-4 py-4 sm:border-r lg:border-b-0">
          <p className="text-[12px] text-muted">Must-pass rules</p>
          <p className="mt-1 text-2xl font-semibold text-text">{stats.passedRequired}/{stats.required}</p>
          <p className="mt-1 text-[12px] text-muted">{stats.completed}/{stats.total} rules checked</p>
        </div>
        <div className="px-4 py-4">
          <p className="text-[12px] text-muted">Plan adherence</p>
          <p className="mt-1 text-2xl font-semibold text-text">{sessions ? Math.round((stats.completed / Math.max(stats.total, 1)) * 100) : 0}%</p>
          <p className="mt-1 text-[12px] text-muted">{sessions} sessions logged</p>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[16px] font-semibold text-text">Checklist</h3>
          <div className="flex rounded-lg border border-line bg-[#0a141d] p-1" role="group" aria-label="Filter checklist rules">
            {['All', 'Must pass', 'Optional', 'Remaining'].map((option) => (
              <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)} className={`rounded-md px-3 py-1.5 text-[12px] font-medium ${filter === option ? 'bg-text text-ink' : 'text-muted hover:text-text'}`}>{option}</button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {groups.map((group) => {
            const visibleRules = group.rules.filter((rule) => {
              if (filter === 'All') return true;
              if (filter === 'Must pass') return requirementFor(rule) === 'Must pass';
              if (filter === 'Optional') return requirementFor(rule) === 'Optional';
              return !rule.done;
            });
            const checked = group.rules.filter((rule) => rule.done).length;
            if (!visibleRules.length && filter !== 'All') return null;
            return (
              <div
                key={group.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', group.id);
                  setDraggedGroup(group.id);
                }}
                onDragEnter={() => setDropTarget(group.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  moveGroup(group.id, event.dataTransfer.getData('text/plain') || draggedGroup);
                }}
                onDragEnd={() => { setDraggedGroup(null); setDropTarget(null); }}
                className={`overflow-visible rounded-xl border bg-[#101e29] transition-shadow ${draggedGroup === group.id ? 'border-info/60 opacity-60 shadow-lg shadow-info/10' : dropTarget === group.id ? 'border-win/70 shadow-lg shadow-win/10' : 'border-line'}`}
              >
                <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                  <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => setCollapsed((current) => ({ ...current, [group.id]: !current[group.id] }))}>
                    <LuChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${collapsed[group.id] ? '-rotate-90' : ''}`} aria-hidden />
                    <LuGripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted/60 active:cursor-grabbing" aria-label="Drag to reorder section" />
                    <span className="truncate text-[14px] font-semibold text-text">{group.title}</span>
                    <span className="rounded-full bg-panel2 px-2 py-0.5 text-[11px] text-muted">{checked}/{group.rules.length}</span>
                  </button>
                  <button type="button" className="rounded-md p-1.5 text-muted hover:bg-panel2 hover:text-loss" aria-label={`Delete ${group.title} group`} title={`Delete ${group.title} group`} onClick={() => removeGroup(group.id)}><LuTrash2 className="h-4 w-4" aria-hidden /></button>
                </div>
                {!collapsed[group.id] && (
                  <>
                    <ul className="divide-y divide-line">
                      {visibleRules.map((rule) => (
                        <li key={rule.id} className="flex items-center gap-3 px-4 py-3">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={Boolean(rule.done)}
                            aria-label={`${rule.done ? 'Uncheck' : 'Check'} ${rule.title}`}
                            onClick={() => toggleRule(group.id, rule.id)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${rule.done ? 'border-win bg-win text-ink' : 'border-[#7890a1] bg-transparent text-transparent hover:border-win/70'}`}
                          >
                            <LuCheck className="h-4 w-4" strokeWidth={3} aria-hidden />
                          </button>
                          <span className={`min-w-0 flex-1 text-[13px] ${rule.done ? 'text-muted line-through' : 'text-text'}`}>{rule.title}</span>
                          <SelectMenu
                            value={requirementFor(rule)}
                            options={requirements}
                            onChange={(value) => setRequirement(group.id, rule.id, value)}
                            label={`Requirement for ${rule.title}`}
                            className="w-auto min-w-[112px] max-w-[42vw]"
                            buttonClassName={`py-1 text-[11px] font-semibold ${requirementFor(rule) === 'Must pass' ? 'border-gold/30 bg-gold/15 text-gold' : 'text-muted'}`}
                          />
                        </li>
                      ))}
                    </ul>
                    <form className="flex flex-wrap gap-2 border-t border-line p-3" onSubmit={(event) => { event.preventDefault(); addRule(group.id, event.currentTarget.elements.rule.value, newRequirements[group.id] || requirements[0]); event.currentTarget.elements.rule.value = ''; setNewRequirements((current) => ({ ...current, [group.id]: requirements[0] })); }}>
                      <input name="rule" className="field min-w-0 flex-1" placeholder={`Add a rule to ${group.title}`} aria-label={`Add a rule to ${group.title}`} />
                      <SelectMenu
                        value={newRequirements[group.id] || requirements[0]}
                        options={requirements}
                        onChange={(value) => setNewRequirements((current) => ({ ...current, [group.id]: value }))}
                        label="Rule requirement"
                        className="w-full sm:w-[140px]"
                      />
                      <button type="submit" className="btn shrink-0"><LuPlus className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Add rule</span></button>
                    </form>
                  </>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}