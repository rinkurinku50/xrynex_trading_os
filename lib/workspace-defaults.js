import { DEFAULT_ECONOMIC_NEWS_ALERT_SETTINGS } from '@/lib/economic-news-alert-settings';

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

export const DEFAULT_ROUTINE_CATEGORIES = [
  { id: 'all', n: 'All routines', c: '#0f766e' },
  { id: 'health', n: 'Health', c: '#22c55e' },
  { id: 'work', n: 'Work', c: '#3b82f6' },
  { id: 'learning', n: 'Learning', c: '#8b5cf6' },
  { id: 'home', n: 'Home', c: '#f97316' },
  { id: 'personal', n: 'Personal', c: '#ec4899' },
];

export const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  keepPopupOpen: true,
  tasksEnabled: true,
  routinesEnabled: true,
  tone: 'chime',
  volume: 55,
  popupSeconds: 8,
};

export const DEFAULT_TRADING_PLAN_CHECKLIST = {
  groups: [
    {
      id: 'pre-market',
      title: 'Pre-market',
      rules: [
        { id: 'calendar', title: 'Review economic calendar and news', required: false },
        { id: 'levels', title: 'Mark key levels and higher-timeframe trend', required: true },
        { id: 'bias', title: 'Define bias and the only setups I trade today', required: true },
        { id: 'loss-limit', title: 'Confirm daily loss limit is set', required: true },
        { id: 'focus', title: 'Write the one thing I must execute well', required: true },
      ],
    },
    {
      id: 'entry-criteria',
      title: 'Entry criteria',
      rules: [
        { id: 'plan-match', title: 'Setup matches my written plan', required: true },
        { id: 'trend', title: 'Trend and momentum confirm the direction', required: false },
        { id: 'trigger', title: 'Entry trigger has printed, no anticipating', required: true },
        { id: 'risk-reward', title: 'Risk-to-reward is at least 2:1', required: true },
      ],
    },
    {
      id: 'review',
      title: 'Review',
      rules: [
        { id: 'journal', title: 'Journal the trade with a screenshot', required: true },
        { id: 'mistake', title: 'Record one lesson without judging the outcome', required: false },
      ],
    },
  ],
  sessions: 6,
  requirements: ['Must pass', 'Optional'],
};

export const DEFAULT_TRADING_PLAN_LAYOUT = {
  sections: [
    {
      id: 'checklist',
      type: 'checklist',
      title: 'Trading Checklist',
      enabled: true,
      subsections: [
        { id: 'pre-market', title: 'Pre-Market', enabled: true },
        { id: 'entry-criteria', title: 'Entry Criteria', enabled: true },
        { id: 'review', title: 'Review', enabled: true },
      ],
    },
    { id: 'scheduler', type: 'scheduler', title: 'Scheduler', enabled: true },
    {
      id: 'conditions',
      type: 'conditions',
      title: 'Conditions to Assess',
      enabled: true,
      items: [
        { id: 'trend-bias', title: 'Trend & bias', enabled: true },
        { id: 'volatility', title: 'Volatility', enabled: true },
        { id: 'key-levels', title: 'Key levels', enabled: true },
        { id: 'risk-limit', title: 'Risk limit', enabled: true },
      ],
    },
    { id: 'weekly-calendar', type: 'weekly-calendar', title: 'Weekly Calendar', enabled: true, zoom: 100, view: 'fit' },
  ],
};

export const DEFAULT_USER_PREFERENCES = {
  'routine-tasks': DEFAULT_ROUTINE_TASKS,
  'routine-done': {},
  'routine-auto-done': {},
  'routine-categories': DEFAULT_ROUTINE_CATEGORIES,
  'routine-accent': '#0f766e',
  'routine-theme': 'auto',
  'reminder-settings': DEFAULT_REMINDER_SETTINGS,
  'economic-news-alert-settings': DEFAULT_ECONOMIC_NEWS_ALERT_SETTINGS,
  'reminder-acknowledged': [],
  'trading-plan-checklist': DEFAULT_TRADING_PLAN_CHECKLIST,
  'trading-plan-layout': DEFAULT_TRADING_PLAN_LAYOUT,
  'economic-news-order': [],
};