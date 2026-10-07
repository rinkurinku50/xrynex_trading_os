'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConceptIcon from '@/components/ConceptIcon';
import RichTextEditor from '@/components/RichTextEditor';
import SelectMenu from '@/components/SelectMenu';
import { useConfirmDialog } from '@/components/ConfirmDialogProvider';

function dateInputValue(value) {
  if (!value) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  const text = String(value);
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

export function Modal({ open, onClose, title, children, size = 'max-w-lg' }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) {
      document.addEventListener('keydown', onKey);
      ref.current?.focus();
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`panel w-full ${size} outline-none`}
      >
        <header className="panel-head">
          <h2 className="panel-title">{title}</h2>
          <button className="btn px-2 py-1" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  );
}

/**
 * Generic record form.
 * fields: [{ name, label, type: text|number|date|textarea|select, options, required, placeholder, help }]
 */
export function RecordForm({ endpoint, fields, initial = {}, method = 'POST', submitLabel = 'Save', onDone }) {
  const router = useRouter();
  const [values, setValues] = useState(() => {
    const v = {};
    for (const f of fields) {
      const value = initial[f.name] ?? f.default ?? '';
      v[f.name] = f.type === 'date' ? dateInputValue(value) : value;
    }
    return v;
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function inputValue(field) {
    const value = values[field.name] ?? '';
    if (field.type === 'date') return dateInputValue(value);
    return value;
  }

  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  async function submit(e) {
    e.preventDefault();
    const missingSelection = fields.find((field) => field.type === 'select' && field.required && !values[field.name]);
    if (missingSelection) {
      setError(`Choose a value for ${missingSelection.label}.`);
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {};
    for (const f of fields) {
      let v = values[f.name];
      if (v === '') v = null;
      if (v !== null && f.type === 'number') v = Number(v);
      if (v !== null && f.type === 'date') v = dateInputValue(v);
      payload[f.name] = v;
    }
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const responseText = await res.text();
      let data = {};
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(res.ok ? 'The server returned an invalid response.' : `Save failed (${res.status}). Please try again.`);
        }
      }
      if (!res.ok) throw new Error(data.error || 'That did not save. Check the fields and try again.');
      if (!responseText) throw new Error('The server returned an empty response. Your changes may not have been saved.');
      router.refresh();
      if (endpoint.startsWith('/api/concepts')) window.dispatchEvent(new Event('concepts-updated'));
      if (endpoint.startsWith('/api/strategies')) window.dispatchEvent(new Event('strategies-updated'));
      onDone?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {fields.map((f) => (
        <div key={f.name}>
          {f.type !== 'checkbox' && (
            <label htmlFor={f.name} className="mb-1 block text-[13px] text-muted">
              {f.label}
              {f.required && <span className="text-loss"> *</span>}
            </label>
          )}

          {f.type === 'richtext' ? (
            <RichTextEditor label={f.label} value={inputValue(f)} onChange={(value) => set(f.name, value)} />
          ) : f.type === 'textarea' ? (
            <textarea
              id={f.name} className="field min-h-[80px]" rows={3}
              placeholder={f.placeholder} required={f.required}
              value={inputValue(f)} onChange={(e) => set(f.name, e.target.value)}
            />
          ) : f.type === 'checkbox' ? (
            <label className="flex items-center gap-2 text-[13px] text-text">
              <input
                id={f.name}
                type="checkbox"
                checked={Boolean(values[f.name])}
                onChange={(e) => set(f.name, e.target.checked)}
              />
              {f.label}
            </label>
          ) : f.type === 'select' ? (
            <>
              <SelectMenu
                value={values[f.name] ?? ''}
                options={[{ value: '', label: '—' }, ...f.options]}
                onChange={(value) => set(f.name, value)}
                label={f.label}
                required={f.required}
                className="w-full"
              />
              {f.iconPreview && values[f.name] && (
                <span className="mt-2 inline-flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2 text-[12px] text-muted">
                  <ConceptIcon icon={values[f.name]} className="h-5 w-5" />
                  Selected icon
                </span>
              )}
            </>
          ) : (
            <input
              id={f.name} className="field" type={f.type || 'text'}
              step={f.type === 'number' ? '0.01' : undefined}
              placeholder={f.placeholder} required={f.required}
              value={inputValue(f)} onChange={(e) => set(f.name, e.target.value)}
            />
          )}

          {f.help && <p className="mt-1 text-[12px] text-muted">{f.help}</p>}
        </div>
      ))}

      {error && (
        <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-[13px] text-loss">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

/** Delete button that confirms, then refreshes the page data. */
export function DeleteButton({ endpoint, label = 'Delete', onDone }) {
  const router = useRouter();
  const confirm = useConfirmDialog();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="text-[12px] text-muted hover:text-loss"
      disabled={busy}
      onClick={async () => {
        const accepted = await confirm({
          title: 'Delete permanently?',
          message: 'This record will be permanently removed. This action cannot be undone.',
          confirmLabel: 'Delete',
        });
        if (!accepted) return;
        setBusy(true);
        await fetch(endpoint, { method: 'DELETE' });
        router.refresh();
        if (endpoint.startsWith('/api/concepts')) window.dispatchEvent(new Event('concepts-updated'));
        if (endpoint.startsWith('/api/strategies')) window.dispatchEvent(new Event('strategies-updated'));
        onDone?.();
        setBusy(false);
      }}
    >
      {busy ? '…' : label}
    </button>
  );
}
