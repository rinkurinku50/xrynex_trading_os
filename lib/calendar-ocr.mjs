import { lookup } from 'node:dns/promises';
import { mkdir } from 'node:fs/promises';
import { get as getHttp } from 'node:http';
import { get as getHttps } from 'node:https';
import { isIP } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9,
  october: 9, nov: 10, november: 10, dec: 11, december: 11,
};
const WEEKDAYS = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5, sat: 6, saturday: 6,
};

function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2))))
      || (a === 198 && (b === 18 || b === 19 || b === 51 && c === 100))
      || (a === 203 && b === 0 && c === 113)
    );
  }
  if (family !== 6) return false;
  const normalized = address.toLowerCase();
  return !(
    normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('::ffff:')
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || /^fe[89ab]/.test(normalized)
    || normalized.startsWith('ff')
    || normalized.startsWith('2001:db8:')
    || normalized.startsWith('2001:0:')
    || normalized.startsWith('2002:')
    || !/^[23]/.test(normalized)
  );
}

async function resolvePublicAddresses(hostname) {
  const hostnameWithoutBrackets = hostname.replace(/^\[|\]$/g, '');
  const family = isIP(hostnameWithoutBrackets);
  const addresses = family
    ? [{ address: hostnameWithoutBrackets, family }]
    : await lookup(hostnameWithoutBrackets, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('Calendar image URL must resolve to a public image host.');
  }
  return addresses;
}

function requestImage(url, addresses) {
  const client = url.protocol === 'https:' ? getHttps : getHttp;
  return new Promise((resolve, reject) => {
    const request = client(url, {
      headers: { accept: 'image/*' },
      lookup: (_hostname, options, callback) => {
        if (options?.all) callback(null, addresses);
        else callback(null, addresses[0].address, addresses[0].family);
      },
      timeout: 15_000,
    }, (response) => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        const location = new URL(response.headers.location, url);
        response.resume();
        resolve({ redirect: location });
        return;
      }
      if (status !== 200) {
        response.resume();
        reject(new Error('Could not download the calendar image.'));
        return;
      }
      if (!/^image\//i.test(response.headers['content-type'] ?? '')) {
        response.resume();
        reject(new Error('The calendar link did not return an image.'));
        return;
      }
      const contentLength = Number(response.headers['content-length']);
      if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
        response.resume();
        reject(new Error('Calendar images must be smaller than 12 MB.'));
        return;
      }
      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES) {
          request.destroy(new Error('Calendar images must be smaller than 12 MB.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ buffer: Buffer.concat(chunks) }));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('Calendar image download timed out.')));
    request.on('error', reject);
  });
}

async function downloadImage(value) {
  let url = new URL(value);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port && !['80', '443'].includes(url.port)) {
      throw new Error('Use a public HTTP or HTTPS calendar image URL.');
    }
    const addresses = await resolvePublicAddresses(url.hostname);
    const result = await requestImage(url, addresses);
    if (result.buffer) return result.buffer;
    if (redirects === 3) break;
    url = result.redirect;
  }
  throw new Error('The calendar image redirected too many times.');
}

function parseMonthDay(value) {
  const match = value.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|sept|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})(?:\s*,?\s*(\d{4}))?/i);
  if (!match) return null;
  return { month: MONTHS[match[1].toLowerCase()], day: Number(match[2]), year: match[3] ? Number(match[3]) : null };
}

function newYorkYear() {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric' }).format(new Date()));
}

function dateString({ year, month, day }) {
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function inferWeekStart(text) {
  const parsed = parseMonthDay(text);
  if (!parsed) return null;
  if (parsed.year) return dateString({ ...parsed, year: parsed.year });
  const currentYear = newYorkYear();
  const today = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())}T00:00:00Z`);
  return [currentYear - 1, currentYear, currentYear + 1]
    .map((year) => dateString({ ...parsed, year }))
    .filter(Boolean)
    .sort((left, right) => Math.abs(new Date(`${left}T00:00:00Z`) - today) - Math.abs(new Date(`${right}T00:00:00Z`) - today))[0] ?? null;
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseDateInWeek(value, weekStart) {
  const parsed = parseMonthDay(value);
  if (!parsed) return null;
  const startParts = weekStart?.split('-').map(Number);
  const year = parsed.year ?? (startParts && parsed.month < startParts[1] - 1 ? startParts[0] + 1 : startParts?.[0] ?? newYorkYear());
  return dateString({ ...parsed, year });
}

function parseTsv(tsv, width) {
  const words = tsv.trim().split(/\r?\n/).slice(1).flatMap((row) => {
    const cells = row.split('\t');
    if (Number(cells[0]) !== 5 || !cells[11]?.trim()) return [];
    return [{
      block: cells[2], para: cells[3], line: cells[4],
      x: Number(cells[6]), y: Number(cells[7]), width: Number(cells[8]), height: Number(cells[9]),
      confidence: Number(cells[10]), text: cells.slice(11).join('\t').trim(),
    }];
  });
  const grouped = new Map();
  for (const word of words) {
    const key = `${word.block}/${word.para}/${word.line}`;
    const row = grouped.get(key) ?? { y: word.y, words: [] };
    row.y = Math.min(row.y, word.y);
    row.words.push(word);
    grouped.set(key, row);
  }
  const rows = [...grouped.values()].map((row) => ({
    ...row,
    words: row.words.sort((left, right) => left.x - right.x),
    text: row.words.map((word) => word.text).join(' '),
  })).sort((left, right) => left.y - right.y || left.words[0].x - right.words[0].x);
  const merged = [];
  for (const row of rows) {
    const previous = merged.at(-1);
    const previousCenter = previous ? previous.y + previous.height / 2 : null;
    const rowHeight = Math.max(...row.words.map((word) => word.height));
    const rowCenter = row.y + rowHeight / 2;
    if (previous && Math.abs(previousCenter - rowCenter) <= Math.min(7, rowHeight / 2)) {
      previous.words.push(...row.words);
      previous.words.sort((left, right) => left.x - right.x);
      previous.y = Math.min(previous.y, row.y);
      previous.height = Math.max(previous.height, rowHeight);
      previous.text = previous.words.map((word) => word.text).join(' ');
    } else {
      merged.push({ ...row, height: rowHeight, center: rowCenter });
    }
  }
  return merged.map((row) => ({ ...row, width }));
}

function findHeaders(rows, imageWidth) {
  const words = rows.flatMap((row) => row.words);
  const find = (value) => words.find((word) => word.text.toLowerCase().replace(/[^a-z]/g, '') === value);
  const impact = find('impact');
  const end = ['alerts', 'detail', 'actual', 'forecast', 'previous', 'graph']
    .map((name) => find(name)?.x)
    .filter((value) => Number.isFinite(value));
  return {
    impactX: impact?.x ?? Math.round(imageWidth * 0.24),
    titleStart: impact ? impact.x + impact.width + 8 : Math.round(imageWidth * 0.28),
    titleEnd: end.length ? Math.min(...end) : Math.round(imageWidth * 0.72),
  };
}

function weekdayIndex(line, width) {
  const leftWords = line.words.filter((word) => word.x < width * 0.12).map((word) => word.text.toLowerCase().replace(/[^a-z]/g, ''));
  for (const word of leftWords) {
    if (Object.hasOwn(WEEKDAYS, word)) return WEEKDAYS[word];
    if (['te', 'tuesd'].includes(word)) return 2;
    if (['fi'].includes(word)) return 5;
    if (['on', 'ohu'].includes(word) && /\d{1,2}:\d{2}/.test(line.text)) return 4;
  }
  return null;
}

function parseEventTime(value) {
  if (/\ball\s*day\b/i.test(value)) return null;
  const match = value.match(/\b(\d{1,2})(?::(\d{2}))?\s*([ap])\s*\.?\s*m?\.?\b/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (match[3].toLowerCase() === 'p' && hour !== 12) hour += 12;
  if (match[3].toLowerCase() === 'a' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function classifyImpact(raw, info, line, impactX) {
  const xStart = Math.max(0, Math.round(impactX + 8));
  const xEnd = Math.min(info.width, Math.round(impactX + 40));
  const yStart = Math.max(0, line.y - 1);
  const yEnd = Math.min(info.height, line.y + Math.max(24, line.height + 8));
  let red = 0;
  let orange = 0;
  let gray = 0;
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const index = (y * info.width + x) * info.channels;
      const r = raw[index];
      const g = raw[index + 1];
      const b = raw[index + 2];
      const maximum = Math.max(r, g, b);
      const minimum = Math.min(r, g, b);
      if (r > 100 && r > g * 1.8 && r > b * 1.5) red += 1;
      else if (r > 100 && r > g * 1.15 && g > b * 1.1) orange += 1;
      else if (maximum - minimum < 18 && maximum < 190 && maximum > 45) gray += 1;
    }
  }
  if (red >= 8) return 'High';
  if (orange >= 8) return 'Medium';
  if (gray >= 24) return 'Bank holiday';
  return null;
}

function extractEvents(data, raw, info) {
  const rows = parseTsv(data.tsv, info.width);
  const weekHeader = rows.find((row) => /\bweek\b/i.test(row.text));
  let currentDate = weekHeader ? inferWeekStart(weekHeader.text) : null;
  let currentTime = null;
  const weekStart = currentDate;
  const headers = findHeaders(rows, info.width);
  const events = [];
  let unclassified = 0;
  let skipped = 0;

  for (const row of rows) {
    if (weekHeader && row.y <= weekHeader.y) continue;
    const leftText = row.words.filter((word) => word.x < info.width * 0.12).map((word) => word.text).join(' ');
    const explicitDate = parseDateInWeek(leftText, weekStart);
    const weekday = weekdayIndex(row, info.width);
    let nextDate = currentDate;
    if (explicitDate) nextDate = explicitDate;
    else if (weekday !== null && (weekStart || currentDate)) {
      const referenceDate = weekStart ?? currentDate;
      const start = new Date(`${referenceDate}T00:00:00Z`);
      const offset = (weekday - start.getUTCDay() + 7) % 7;
      nextDate = addDays(referenceDate, offset);
    }
    if (nextDate !== currentDate) currentTime = null;
    currentDate = nextDate;

    if (/\ball\s*day\b/i.test(row.text)) currentTime = null;
    else currentTime = parseEventTime(row.text) ?? currentTime;

    const eventWords = row.words.filter((word) => word.x >= headers.titleStart && word.x < headers.titleEnd && word.confidence > 0);
    if (!eventWords.length || !currentDate) continue;
    const title = eventWords.map((word) => word.text).join(' ')
      .replace(/[|¦]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s+[\d.,]+%?\s*$/, '')
      .trim();
    if (!title || title.length < 3 || /^(actual|forecast|previous|graph)$/i.test(title)) continue;

    if (!currentTime) {
      skipped += 1;
      continue;
    }
    const priority = classifyImpact(raw, info, row, headers.impactX);
    if (!priority) {
      unclassified += 1;
      continue;
    }
    events.push({ title: title.slice(0, 160), priority, event_at: `${currentDate}T${currentTime}` });
  }

  return { events, unclassified, skipped };
}

export async function extractCalendarEvents(imageUrl) {
  let source;
  try {
    source = await downloadImage(imageUrl);
  } catch (error) {
    throw new Error(error.message || 'Could not read the calendar image.');
  }

  let normalized;
  try {
    normalized = await sharp(source, { failOn: 'error', limitInputPixels: MAX_IMAGE_PIXELS }).rotate().png().toBuffer();
  } catch {
    throw new Error('The calendar link did not contain a supported image.');
  }

  const { data: raw, info } = await sharp(normalized).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width * info.height > MAX_IMAGE_PIXELS || info.channels < 3) {
    throw new Error('The calendar image dimensions are not supported.');
  }

  const cachePath = join(tmpdir(), 'trading-os-tesseract');
  await mkdir(cachePath, { recursive: true });
  const worker = await createWorker('eng', undefined, { cachePath });
  try {
    const { data } = await worker.recognize(normalized, {}, { tsv: true });
    const extracted = extractEvents(data, raw, info);
    return extracted;
  } finally {
    await worker.terminate();
  }
}