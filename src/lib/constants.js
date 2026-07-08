// Constantes partagées : messages, clés de stockage, réglages, état, URLs.

export const MSG = {
  // popup/options -> background
  START: 'start',
  STOP: 'stop',
  GET_STATE: 'get-state',
  // background -> content
  SCRAPE_POINTS: 'scrape-points',
  // content -> background
  POINTS_UPDATE: 'points-update',
  DAILY_SET_DONE: 'daily-set-done',
  EARN_DONE: 'earn-done',
  // background -> popup
  STATE_UPDATE: 'state-update',
};

export const STATUS = {
  IDLE: 'idle',
  SEARCHING: 'searching',
  TASKS: 'tasks',
  EARN: 'earn',
  FINALIZING: 'finalizing',
  DONE: 'done',
  ERROR: 'error',
};

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  STATE: 'state',
};

export const DEFAULT_SETTINGS = {
  desktopSearches: 35,
  minDelayMs: 7000, // temps entre deux recherches (ms)
  maxDelayMs: 10000,
  closeMinMs: 4000, // temps avant fermeture d'un onglet (ms)
  closeMaxMs: 6000,
  enableSearches: true,
  enableDailyTasks: true,
  dailyScheduleEnabled: false,
  dailyScheduleTime: '10:00', // heure locale
};

export const DEFAULT_STATE = {
  status: STATUS.IDLE,
  points: null, // null = solde inconnu (affiché « … »)
  searchesDone: 0,
  lastRun: null,
  error: null,
};

export const URLS = {
  REWARDS_DASHBOARD: 'https://rewards.bing.com/dashboard',
  REWARDS_EARN: 'https://rewards.bing.com/earn',
};
