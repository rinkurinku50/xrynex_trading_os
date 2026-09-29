'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';

const ConfirmDialogContext = createContext(null);

export function useConfirmDialog() {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm) throw new Error('useConfirmDialog must be used within ConfirmDialogProvider.');
  return confirm;
}

export default function ConfirmDialogProvider({ children }) {
  const [activeRequest, setActiveRequest] = useState(null);
  const activeRef = useRef(null);
  const queueRef = useRef([]);
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  const confirm = useCallback((options = {}) => new Promise((resolve) => {
    const request = {
      title: options.title || 'Are you sure?',
      message: options.message || 'This action cannot be undone.',
      confirmLabel: options.confirmLabel || 'Confirm',
      cancelLabel: options.cancelLabel || 'Cancel',
      tone: options.tone || 'danger',
      resolve,
    };

    if (activeRef.current) {
      queueRef.current.push(request);
      return;
    }

    activeRef.current = request;
    setActiveRequest(request);
  }), []);

  const settle = useCallback((accepted) => {
    const request = activeRef.current;
    if (!request) return;

    const nextRequest = queueRef.current.shift() || null;
    activeRef.current = nextRequest;
    setActiveRequest(nextRequest);
    request.resolve(accepted);
  }, []);

  useEffect(() => {
    if (!activeRequest) return undefined;
    const previousFocus = document.activeElement;
    cancelRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        settle(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [activeRequest, settle]);

  const contextValue = useMemo(() => confirm, [confirm]);
  const isDanger = activeRequest?.tone !== 'default';

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      {activeRequest && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) settle(false);
          }}
        >
          <section
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/50"
          >
            <div className="flex gap-4 p-5 sm:p-6">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg ${isDanger ? 'border-loss/30 bg-loss/10 text-loss' : 'border-info/30 bg-info/10 text-info'}`} aria-hidden="true">
                {isDanger ? '!' : '?'}
              </div>
              <div className="min-w-0 pt-0.5">
                <h2 id={titleId} className="text-[16px] font-semibold text-text">{activeRequest.title}</h2>
                <p id={descriptionId} className="mt-2 text-[13px] leading-6 text-muted">{activeRequest.message}</p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-line bg-ink/40 p-4 sm:flex-row sm:justify-end">
              <button ref={cancelRef} type="button" className="btn" onClick={() => settle(false)}>
                {activeRequest.cancelLabel}
              </button>
              <button
                type="button"
                className={`btn ${isDanger ? 'border-loss/40 bg-loss/15 text-loss hover:border-loss/60 hover:bg-loss/25' : 'btn-primary'}`}
                onClick={() => settle(true)}
              >
                {activeRequest.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}