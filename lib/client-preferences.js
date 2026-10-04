export const preferencesUpdatedEvent = 'db-preferences-updated';

export async function readPreferences(keys, legacyStorageKeys = {}) {
  async function load() {
    const query = new URLSearchParams({ keys: keys.join(',') });
    const response = await fetch(`/api/preferences?${query}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load saved settings.');
    return result.values;
  }

  const values = await load();
  const imported = {};
  const keysToRemove = [];
  const keysToInitialize = [];

  for (const key of keys) {
    const legacyKey = legacyStorageKeys[key];
    const raw = legacyKey ? window.localStorage.getItem(legacyKey) : null;
    if (raw === null) {
      if (!Object.hasOwn(values, key)) keysToInitialize.push(key);
      continue;
    }
    let legacyValue;
    try {
      legacyValue = JSON.parse(raw);
    } catch {
      legacyValue = raw;
    }
    if (Object.hasOwn(values, key)) {
      if (JSON.stringify(values[key]) === JSON.stringify(legacyValue)) keysToRemove.push(legacyKey);
      continue;
    }
    imported[key] = legacyValue;
    keysToRemove.push(legacyKey);
  }

  if (Object.keys(imported).length) await writePreferences(imported);
  if (keysToInitialize.length) {
    const response = await fetch('/api/preferences', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'initialize', keys: keysToInitialize }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not initialize saved settings.');
  }
  for (const key of keysToRemove) window.localStorage.removeItem(key);
  return load();
}

export async function writePreferences(values) {
  const response = await fetch('/api/preferences', {
    method: 'PUT',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not save settings.');
  window.dispatchEvent(new CustomEvent(preferencesUpdatedEvent, { detail: result.saved }));
  return result;
}