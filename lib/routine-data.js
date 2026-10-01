export function routineStorageKeys(userId) {
  const suffix = encodeURIComponent(userId || 'workspace');
  return {
    tasks: `xrynex-routine-tasks:${suffix}`,
    done: `xrynex-routine-done:${suffix}`,
    autoDone: `xrynex-routine-auto-done:${suffix}`,
    categories: `xrynex-routine-categories:${suffix}`,
    updatedEvent: `routine-schedule-updated:${suffix}`,
  };
}

export function formatTime12Hour(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return value || '';
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export const DEFAULT_ROUTINE_TASKS = [
  { id: 'wake-up', title: 'Wake up & drink water', time: '06:30', cat: 'health', days: [1, 2, 3, 4, 5, 6], note: 'Hydrate before coffee.' },
  { id: 'workout', title: 'Workout', time: '07:00', cat: 'health', days: [1, 2, 3, 4, 5], note: 'Mon, Wed, Fri are strength days.' },
  { id: 'plan-day', title: 'Plan the day', time: '08:30', cat: 'work', days: [1, 2, 3, 4, 5], note: 'Set priorities and top tasks.' },
  { id: 'deep-work', title: 'Deep work block', time: '09:30', cat: 'work', days: [1, 2, 3, 4, 5], note: 'Protected focus time.' },
  { id: 'lunch-walk', title: 'Lunch walk', time: '13:00', cat: 'health', days: [1, 2, 3, 4, 5], note: '20-minute reset.' },
  { id: 'read-pages', title: 'Read 20 pages', time: '17:30', cat: 'learning', days: [1, 2, 3, 4, 5, 6], note: 'A short, steady habit.' },
  { id: 'tidy-house', title: 'Tidy the house', time: '19:00', cat: 'home', days: [0, 1, 2, 3, 4, 5, 6], note: 'Reset the room before bed.' },
  { id: 'journal', title: 'Journal & wind down', time: '21:30', cat: 'personal', days: [1, 2, 3, 4, 5, 6], note: 'Reflect and sleep well.' },
];
