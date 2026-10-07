'use client';

import { useState } from 'react';
import { driveImage, driveOpen, videoOpen, videoPreview } from '@/lib/drive';

/** Google Drive image. Falls back to a link if the file is not shared publicly. */
export function DriveImage({ url, alt, className = '', size = 'w800', fit = 'cover' }) {
  const src = typeof url === 'string' && url.startsWith('/') ? url : driveImage(url, size);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-dashed border-line bg-ink text-[12px] text-muted ${className}`}>
        {url ? (
          <a href={driveOpen(url)} target="_blank" rel="noreferrer" className="px-3 text-center hover:text-win">
            Drive can’t show this here. Open it in Drive, or set sharing to “Anyone with the link”.
          </a>
        ) : (
          'No chart linked'
        )}
      </div>
    );
  }

  return (
    <a href={driveOpen(url)} target="_blank" rel="noreferrer" className="block h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${className}`}
      />
    </a>
  );
}

/** Google Drive video, played in Drive's own embed. */
export function DriveVideo({ url, title }) {
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const preview = videoPreview(url);
  const sourceUrl = videoOpen(url);
  const fallback = (message) => (
    <div className="relative flex aspect-[16/8] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed border-line bg-gradient-to-br from-[#172433] via-[#111923] to-[#211b26] px-4 text-center">
      <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 text-2xl text-muted">▶</span>
      <span className="text-[13px] font-medium text-text">Video preview unavailable</span>
      <span className="max-w-sm text-[12px] leading-5 text-muted">{message}</span>
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-info hover:underline">
          Try opening the video source
        </a>
      )}
    </div>
  );

  if (!preview) {
    return fallback(url ? 'This video link is invalid or unsupported.' : 'No video linked.');
  }
  if (preview.type === 'video') {
    if (videoFailed) return fallback('This video could not be played. Check that the file is available.');
    return (
      <video
        src={preview.src}
        title={title}
        controls
        preload="metadata"
        onError={() => setVideoFailed(true)}
        className="aspect-[16/8] w-full rounded-lg border border-line bg-black"
      />
    );
  }
  if (preview.provider === 'youtube' && preview.poster && posterFailed) {
    return fallback('Video preview unavailable. The video may be private, removed, or unavailable.');
  }
  if (embedFailed) return fallback('The video player could not load this video. It may be broken, private, or unavailable for embedding.');
  if (preview.provider === 'youtube' && preview.poster && !playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play ${title}`}
        className="group relative block aspect-[16/8] w-full overflow-hidden bg-black text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.poster}
          alt={`Preview thumbnail for ${title}`}
          loading="lazy"
          onError={() => setPosterFailed(true)}
          className="h-full w-full object-cover"
        />
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35">
          <span className="flex h-14 w-20 items-center justify-center rounded-2xl bg-red-600 text-3xl text-white shadow-lg transition-transform group-hover:scale-105">▶</span>
        </span>
      </button>
    );
  }
  let iframeSrc = preview.src;
  if (preview.provider === 'youtube' && typeof window !== 'undefined') {
    const embed = new URL(preview.src);
    embed.searchParams.set('origin', window.location.origin);
    iframeSrc = embed.toString();
  }
  return (
    <iframe
      src={iframeSrc}
      title={title}
      allow="autoplay; fullscreen"
      allowFullScreen
      loading="lazy"
      referrerPolicy={preview.provider === 'youtube' ? 'origin' : 'strict-origin-when-cross-origin'}
      onError={() => setEmbedFailed(true)}
      className="aspect-[16/8] w-full rounded-lg border border-line bg-black"
    />
  );
}
