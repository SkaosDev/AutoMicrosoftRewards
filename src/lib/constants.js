// Constantes partagées : types de messages, clés de stockage, réglages par défaut, URLs.

/** Types de messages échangés entre popup, background et content scripts. */
export const MSG = {
  // popup/options -> background
  START: 'start',
  GET_STATE: 'get-state',
  // background -> content
  SCRAPE_POINTS: 'scrape-points',
  // content -> background
  POINTS_UPDATE: 'points-update',
  // background -> popup (broadcast)
  STATE_UPDATE: 'state-update',
};

/** États de la machine à états de l'orchestrateur. */
export const STATUS = {
  IDLE: 'idle',
  SEARCHING: 'searching',
  TASKS: 'tasks',
  DONE: 'done',
  ERROR: 'error',
};

/** Clés utilisées dans browser.storage.local. */
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  STATE: 'state',
};

/** Réglages par défaut, fusionnés avec ce qui est persisté. */
export const DEFAULT_SETTINGS = {
  desktopSearches: 35,
  // Temps entre deux recherches (délai aléatoire dans cet intervalle), en ms.
  minDelayMs: 7000,
  maxDelayMs: 10000,
  // Temps avant fermeture d'un onglet de recherche (aléatoire dans cet intervalle), en ms.
  closeMinMs: 4000,
  closeMaxMs: 6000,
  enableSearches: true,
  enableDailyTasks: true,
};

/** État runtime par défaut. */
export const DEFAULT_STATE = {
  status: STATUS.IDLE,
  points: 0,
  searchesDone: 0,
  lastRun: null,
  error: null,
};

/** URLs cibles. */
export const URLS = {
  BING_SEARCH: 'https://www.bing.com/search',
  REWARDS: 'https://rewards.bing.com/',
  REWARDS_DASHBOARD: 'https://rewards.bing.com/dashboard',
};
