'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { videoPreview } from '@/lib/drive';
import { LuExternalLink, LuMaximize2, LuX } from 'react-icons/lu';

function resolvePreview(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return null;

  if (/\.(avif|bmp|gif|jpe?g|png|webp)(?:$|\/)/i.test(parsed.pathname)) {
    return { type: 'image', src: parsed.href };
  }

  return videoPreview(parsed.href);
}

export default function RichMediaPreview({ url }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const preview = resolvePreview(url);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!preview || failed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-info underline decoration-info/40 underline-offset-2 hover:decoration-info">
        {url}
      </a>
    );
  }

  const fullView = preview.type === 'image' ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={preview.src} alt="Full-size note attachment" className="max-h-[calc(100vh-7rem)] max-w-full object-contain" />
  ) : preview.type === 'video' ? (
    <video src={preview.src} controls autoPlay preload="metadata" className="max-h-[calc(100vh-7rem)] max-w-full" />
  ) : (
    <iframe
      src={preview.src}
      title="Video or file preview"
      allow="autoplay; picture-in-picture; encrypted-media"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="aspect-video h-auto max-h-[calc(100vh-7rem)] w-[min(90vw,80rem)] rounded-lg border border-line bg-black"
    />
  );

  return (
    <span className="my-2 inline-flex max-w-full flex-col gap-1 align-middle">
      {preview.type === 'image' ? (
        <button type="button" onClick={() => setOpen(true)} aria-label="Open image full view" className="block max-w-full overflow-hidden rounded-md border border-line bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.src} alt="Image attachment preview" loading="lazy" onError={() => setFailed(true)} className="max-h-64 max-w-full object-contain" />
        </button>
      ) : preview.type === 'video' ? (
        <video src={preview.src} controls preload="metadata" onError={() => setFailed(true)} className="aspect-video w-[min(80vw,36rem)] max-w-full rounded-md border border-line bg-black" />
      ) : (
        <iframe
          src={preview.src}
          title="Video or file preview"
          allow="autoplay; picture-in-picture; encrypted-media"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="aspect-video w-[min(80vw,36rem)] max-w-full rounded-md border border-line bg-black"
        />
      )}
      <span className="flex flex-wrap items-center gap-3 text-[11px]">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-info hover:underline">
          <LuMaximize2 className="h-3.5 w-3.5" aria-hidden />Full view
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-info">
          <LuExternalLink className="h-3.5 w-3.5" aria-hidden />Open source
        </a>
      </span>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full view of note attachment"
          className="fixed inset-0 z-[80] flex flex-col bg-black/95 p-3 sm:p-6"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <header className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4 pb-3">
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-2 truncate text-[13px] text-muted hover:text-text">
              <LuExternalLink className="h-4 w-4 shrink-0" aria-hidden />Open source
            </a>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close full view" title="Close full view" className="rounded-md border border-white/15 p-2 text-white/80 hover:bg-white/10 hover:text-white">
              <LuX className="h-5 w-5" aria-hidden />
            </button>
          </header>
          <div className="flex min-h-0 flex-1 items-center justify-center">{fullView}</div>
        </div>,
        document.body,
      )}
    </span>
  );
}