// Turns any Google Drive share link into something the browser can render.
// Accepted shapes:
//   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
//   https://drive.google.com/open?id=FILE_ID
//   https://drive.google.com/uc?id=FILE_ID
//   FILE_ID  (bare id also works)
//
// The file must be shared as "Anyone with the link — Viewer",
// otherwise Drive returns a sign-in page instead of the media.

export function driveId(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed.includes('/') && !trimmed.includes('?')) return trimmed; // bare id
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]{10,})/, /[?&]id=([a-zA-Z0-9_-]{10,})/, /\/d\/([a-zA-Z0-9_-]{10,})/];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return null;
}

/** Direct image URL. `size` is the pixel width Drive should render, e.g. w1200. */
export function driveImage(url, size = 'w1200') {
  const id = driveId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=${size}` : null;
}

/** Resolve supported video share URLs to a safe embed/player source. */
export function videoPreview(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  const value = url.trim();

  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) {
    return { type: 'iframe', src: `https://drive.google.com/file/d/${value}/preview` };
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const parts = parsed.pathname.split('/').filter(Boolean);
    const id = parsed.pathname === '/watch'
      ? parsed.searchParams.get('v')
      : ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : null;
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      return {
        type: 'iframe',
        src: `https://www.youtube.com/embed/${id}`,
        poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        provider: 'youtube',
      };
    }
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      return {
        type: 'iframe',
        src: `https://www.youtube.com/embed/${id}`,
        poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        provider: 'youtube',
      };
    }
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const match = parsed.pathname.match(/(?:^|\/)(?:video\/)?(\d+)(?:\/|$)/);
    if (match) return { type: 'iframe', src: `https://player.vimeo.com/video/${match[1]}` };
  }
  if (['drive.google.com', 'docs.google.com'].includes(host)) {
    const id = driveId(value);
    if (id) return { type: 'iframe', src: `https://drive.google.com/file/d/${id}/preview` };
  }

  if (/\.(mp4|webm|ogg|ogv|mov)(?:$|\/)/i.test(parsed.pathname)) {
    return { type: 'video', src: parsed.href };
  }
  return null;
}

/** Backwards-compatible iframe URL helper. */
export function driveVideo(url) {
  const preview = videoPreview(url);
  return preview?.type === 'iframe' ? preview.src : null;
}

export function videoOpen(url) {
  if (typeof url === 'string') {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
    } catch {
      // Bare Drive file IDs are supported below.
    }
  }
  return driveId(url) ? driveOpen(url) : null;
}

/** Normal "open in Drive" link. */
export function driveOpen(url) {
  const id = driveId(url);
  return id ? `https://drive.google.com/file/d/${id}/view` : url || null;
}

export function isFolder(url) {
  return typeof url === 'string' && url.includes('/folders/');
}
