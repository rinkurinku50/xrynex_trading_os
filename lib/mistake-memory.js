const STORAGE_KEY = 'tradingMistakes.v1';
const LEGACY_STORAGE_KEY = 'xrynex-mistake-memory-v1';
const REVIEW_KEY = 'xrynex-mistake-memory-last-reviewed';
const REVIEW_POINTS_KEY = 'xrynex-mistake-memory-review-points-v1';

const seedMistakes = [
  { title: 'Revenge Trading', description: 'Entered multiple impulsive trades right after taking an initial loss.', category: 'Psychology', severity: 'Critical', frequency: 8, preventionRule: 'After 1 loss, stop trading for 15 minutes.' },
  { title: 'Early Entry', description: 'Pulled the trigger before candle close or confirmation.', category: 'Entry', severity: 'High', frequency: 6, preventionRule: 'Wait for a closed confirmation candle. No exceptions.' },
  { title: 'Moving Stop Loss', description: 'Widened the stop once price moved against the position.', category: 'Risk Management', severity: 'Critical', frequency: 5, preventionRule: 'Stops only move toward profit, never away.' },
  { title: 'Overtrading', description: 'Took low-quality setups out of boredom during chop.', category: 'Discipline', severity: 'High', frequency: 4, preventionRule: 'Max 3 trades per session.' },
  { title: 'Cutting Winners Early', description: 'Closed profitable trades before target out of fear.', category: 'Exit', severity: 'Medium', frequency: 3, preventionRule: 'Hold to the first target unless the thesis invalidates.' },
  { title: 'Oversized Position', description: 'Risked more than 1% on a high-conviction idea.', category: 'Risk Management', severity: 'High', frequency: 2, preventionRule: 'Risk is fixed at 1% of equity per trade.' },
  { title: 'Trading Against Trend', description: 'Faded the higher-timeframe trend without a plan.', category: 'Strategy', severity: 'Low', frequency: 2, preventionRule: 'Check the 4H trend before every entry.' },
];

const severityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function makeSeedData() {
  const now = Date.now();
  return seedMistakes.map((mistake, index) => {
    const occurred = new Date(now - index * 22 * 60 * 60 * 1000 - 15 * 60 * 1000);
    const timestamp = occurred.toISOString();
    return {
      ...mistake,
      id: `seed-${index + 1}`,
      lastOccurred: timestamp,
      active: true,
      acknowledged: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

export function rankMistakes(mistakes) {
  return [...mistakes].sort((first, second) =>
    (severityRank[first.severity] ?? 4) - (severityRank[second.severity] ?? 4)
    || second.frequency - first.frequency
    || new Date(second.lastOccurred).getTime() - new Date(first.lastOccurred).getTime()
  );
}

export const mistakeStorage = {
  load() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
        ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!stored) return makeSeedData();
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return makeSeedData();
      const today = new Date().toDateString();
      const mistakes = parsed.map((mistake) => mistake.acknowledgedDate === today
        ? mistake
        : { ...mistake, acknowledged: false, acknowledgedDate: null });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mistakes));
      return mistakes;
    } catch {
      return makeSeedData();
    }
  },
  save(mistakes) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mistakes));
    } catch {
      // Storage may be unavailable in private browsing or under quota pressure.
    }
  },
  loadLastReviewed() {
    try {
      return window.localStorage.getItem(REVIEW_KEY);
    } catch {
      return null;
    }
  },
  saveLastReviewed(timestamp) {
    try {
      window.localStorage.setItem(REVIEW_KEY, timestamp);
    } catch {
      // The review still completes for the current session if storage is unavailable.
    }
  },
  loadReviewPoints() {
    try {
      const stored = window.localStorage.getItem(REVIEW_POINTS_KEY);
      if (stored === null) return null;
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  saveReviewPoints(points) {
    try {
      window.localStorage.setItem(REVIEW_POINTS_KEY, JSON.stringify(points));
    } catch {
      // Checklist edits remain available for the current session if storage is unavailable.
    }
  },
};