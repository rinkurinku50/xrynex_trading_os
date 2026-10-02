export const DEFAULT_TAB = { id: 'discipline', name: 'Trading discipline' };
export const STORAGE_KEY = 'tradingOsDailyCheckV1';
export const UPDATED_EVENT = 'mindset-discipline-updated';

export const DEFAULT_TIPS = [
  { icon: '🚀', title: 'Waiting for motivation', problem: 'You may feel like you need motivation before you start. But **motivation often shows up once you begin.**', why: 'Waiting to feel ready can leave you **stuck for hours.**', action: 'Take one small step. Momentum tends to follow action.' },
  { icon: '🪨', title: 'Goals feel too big', problem: 'Large goals can make **your mind feel overwhelmed.**', why: 'When the next step is unclear, it is easier to put the whole task off.', action: 'Choose one small action and finish it before planning the next.' },
  { icon: '📵', title: 'Too many distractions', problem: 'Your phone, social media, and notifications can make it harder to focus.', why: 'Every interruption pulls attention away from **the plan in front of you.**', action: 'Silence nonessential alerts and protect one focused block of time.' },
  { icon: '⏱️', title: 'Saying “later”', problem: '“I’ll do it later” can quietly become a **habit of delaying.**', why: 'The task stays on your mind while your time keeps disappearing.', action: 'If the next step takes two minutes, do it now. Otherwise, schedule it.' },
  { icon: '🌱', title: 'Comfort zone', problem: 'Staying comfortable can **hold back your growth.**', why: 'Only repeating what feels safe can keep you from learning.', action: 'Pick one small, deliberate challenge and review what it teaches you.' },
  { icon: '🪜', title: 'Fear of failure', problem: 'Sometimes we avoid a task because we are **afraid of making mistakes.**', why: 'Mistakes are part of learning; waiting for perfect conditions costs progress.', action: 'Start, review the result, and improve the next attempt.' },
];

export function readDailyCheckStore() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      tabs: Array.isArray(value.tabs) ? value.tabs.filter((tab) => tab?.id && tab?.name) : [],
      tips: Array.isArray(value.tips) ? value.tips.filter((tip) => tip?.id && tip?.tab && tip?.title) : [],
    };
  } catch {
    return { tabs: [], tips: [] };
  }
}

export function writeDailyCheckStore(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(UPDATED_EVENT));
  } catch {}
}

export function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}