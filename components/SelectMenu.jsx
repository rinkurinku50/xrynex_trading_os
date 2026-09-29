'use client';

import { useEffect, useId, useRef, useState } from 'react';

export default function SelectMenu({
  value,
  options,
  onChange,
  label,
  required = false,
  labels = {},
  optionIcons = {},
  className = '',
  buttonClassName = '',
  menuClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();
  const optionValue = (option) => typeof option === 'object' ? option.value : option;
  const display = (option) => (typeof option === 'object' ? option.label : null) || labels[optionValue(option)] || optionValue(option);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className={`field flex items-center justify-between gap-3 text-left ${buttonClassName}`}
        aria-label={label}
        aria-required={required}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {optionIcons[optionValue(value)] && <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${optionIcons[optionValue(value)]}`} aria-hidden />}
          <span className="truncate">{display(value)}</span>
        </span>
        <span aria-hidden="true" className={`shrink-0 text-[10px] text-muted transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="listbox"
          aria-label={label}
          className={`absolute right-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden rounded-lg border border-line bg-panel p-1 shadow-2xl shadow-black/50 ${menuClassName}`}
        >
          {options.map((option) => (
            <button
              key={optionValue(option)}
              type="button"
              role="option"
              aria-selected={optionValue(option) === value}
              className={`flex w-full items-center justify-between gap-5 whitespace-nowrap rounded-md px-3 py-2 text-left text-[12px] transition-colors hover:bg-panel2 focus-visible:bg-panel2 focus-visible:outline-none ${optionValue(option) === value ? 'text-white' : 'text-muted'}`}
              onClick={() => {
                onChange(optionValue(option));
                setOpen(false);
              }}
            >
              <span className="flex items-center gap-2">
                {optionIcons[optionValue(option)] && <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${optionIcons[optionValue(option)]}`} aria-hidden />}
                <span>{display(option)}</span>
              </span>
              {optionValue(option) === value && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-win" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
