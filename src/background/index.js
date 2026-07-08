// Background : orchestre le run (recherches + tâches Rewards) et pilote les onglets.
// Les API tabs/alarms ne sont dispo qu'ici, d'où le pilotage centralisé.

import browser from 'webextension-polyfill';
import { MSG, STATUS, URLS, STORAGE_KEYS } from '../lib/constants.js';
import { on } from '../lib/messaging.js';
import { ensureDefaults, getState, setState, getSettings } from '../lib/storage.js';
import { totalSearches } from '../lib/rewards.js';

const ALARM_DAILY = 'daily-run';
const ALARM_SEARCH = 'openTabAlarm';

const BING_SEARCH_URL = 'https://www.bing.com/search?q=';
const BING_SEARCH_PARAMS = '&qs=n&form=QBLH&sp=-1&pq=';
const FALLBACK_CLOSE_MS = 5000;

const START_AFTER_POINTS_MS = 3000;
const SCRAPE_TIMEOUT_MS = 15000;
const DAILY_SET_TIMEOUT_MS = 120000;
const EARN_TIMEOUT_MS = 300000;

let dashboardTabId = null;
let searchesStarted = false;
let startFallbackTimer = null;
let refreshTabId = null;
let tasksTabId = null;
let tasksFallbackTimer = null;
let earnTabId = null;
let earnFallbackTimer = null;
let finalTabId = null;
let finalFallbackTimer = null;

const words = [
  "food", "drink", "restaurant", "cafe", "bar", "pub", "club", "diner", "eatery", "tavern",
  "museum", "bistro", "buffet", "canteen", "coffeehouse", "grill", "inn", "joint", "kitchen",
  "lounge", "pizzeria", "saloon", "steakhouse", "tearoom", "trattoria", "brasserie", "brewery",
  "cafeteria", "chophouse", "gastropub", "roadhouse", "rotisserie", "smorgasbord", "soda",
  "soccer", "basketball", "baseball", "tennis", "cricket", "rugby", "golf", "hockey", "swimming",
  "running", "cycling", "skiing", "snowboarding", "skating", "surfing", "fishing", "hiking",
  "camping", "climbing", "dancing", "singing", "painting", "drawing", "sculpting", "photography",
  "writing", "reading", "knitting", "sewing", "gardening", "cooking", "baking", "gaming", "chess",
  "poker", "bridge", "scrabble", "monopoly", "puzzle", "crossword", "sudoku", "video games",
  "console", "PCgaming", "arcade", "VRgaming", "mobilegaming", "boardgames", "cardgames",
  "television", "computer", "smartphone", "laptop", "tablet", "camera", "headphones", "speaker",
  "monitor", "keyboard", "mouse", "printer", "router", "drone", "microphone", "beach", "mountain",
  "forest", "desert", "island", "ocean", "river", "lake", "park", "doctor", "teacher", "engineer",
  "programmer", "designer", "artist", "chef", "nurse", "architect", "scientist", "collecting",
  "woodworking", "origami", "pottery", "calligraphy", "jewelry", "metalwork", "glassblowing",
  "astronomy", "volunteering", "physics", "chemistry", "biology", "mathematics", "history",
  "geography", "literature", "language", "economics", "philosophy", "yoga", "meditation",
  "fitness", "nutrition", "mindfulness", "stretching", "massage", "aromatherapy", "pilates",
  "therapy", "birthday", "wedding", "graduation", "anniversary", "holiday", "festival", "concert",
  "near", "google", "where", "how", "what", "can", "best", "cheapest", "top", "top10",
  "find", "search", "locate", "discover", "explore", "lookup", "seek", "identify", "track", "uncover",
  "nearby", "closest", "guide", "tutorial", "review", "comparison", "versus", "information",
  "directions", "recommendations", "alternatives", "solutions", "help", "advice", "instructions",
  "tips", "examples", "resources", "techniques", "methods", "how to", "ways to", "places to", "things to do", "restaurants near me", "best time to",
  "cheap", "popular", "famous", "hidden gems", "activities", "events", "today", "tonight",
  "open now", "family friendly", "pet friendly", "with kids", "for couples", "solo travel",
  "budget travel", "luxury", "free", "local", "near me", "what is", "who is", "can I",
  "should I", "when to", "why is", "how much", "how long", "how far", "how many", "does",
  "is it safe", "easy", "quick", "simple", "step by step", "nearby attractions", "must see",
  "reviews", "testimonials", "rating", "map", "price", "schedule", "availability", "book now",
  "tickets", "opening hours", "closed", "weather", "forecast", "cheap flights", "best hotels",
  "cuisine", "menu", "food near me", "best place for", "best way to", "directions to", "get to",
  "how do I", "plan trip", "vacation ideas", "top rated", "most popular", "things to avoid",
  "tips for", "travel guide", "insider tips", "how it works", "learn about", "overview",
  "explained", "definition", "meaning", "origin", "background", "history of", "basics of",
  "beginner guide", "example of", "sample", "template", "walkthrough", "demo"
];

// --- Cycle de vie -----------------------------------------------------------

browser.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  await scheduleDailyAlarm();
});

browser.runtime.onStartup.addListener(() => scheduleDailyAlarm().catch(reportError));

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
    scheduleDailyAlarm().catch(reportError);
  }
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_DAILY) startRun().catch(reportError);
  else if (alarm.name === ALARM_SEARCH) searchTick().catch(reportError);
});

// Referme les onglets ouverts par les cartes (Ensemble du jour / Continuer à gagner).
browser.tabs.onCreated.addListener((tab) => {
  const opener = tab.openerTabId;
  if (opener == null || (opener !== tasksTabId && opener !== earnTabId)) return;
  const id = tab.id;
  getSettings().then((s) => {
    const closeMs = getRandomNumber(s.closeMinMs, s.closeMaxMs);
    setTimeout(() => browser.tabs.remove(id).catch(() => {}), closeMs);
  }).catch(() => {});
});

// --- Planification quotidienne ----------------------------------------------

async function scheduleDailyAlarm() {
  await browser.alarms.clear(ALARM_DAILY);
  const settings = await getSettings();
  if (!settings.dailyScheduleEnabled) return;
  await browser.alarms.create(ALARM_DAILY, {
    when: nextDailyTime(settings.dailyScheduleTime || '10:00'),
    periodInMinutes: 24 * 60,
  });
}

// Prochain "HH:MM" en heure locale (aujourd'hui si à venir, sinon demain).
function nextDailyTime(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime();
}

// --- Messages ---------------------------------------------------------------

on(MSG.START, () => startRun());
on(MSG.STOP, () => stopRun());
on(MSG.GET_STATE, () => getState());
on(MSG.DAILY_SET_DONE, () => finishDailySet());
on(MSG.EARN_DONE, () => finishEarn());

on(MSG.POINTS_UPDATE, async (payload) => {
  const points = Number(payload?.points);
  if (!Number.isNaN(points)) await broadcastState({ points });

  closeRefreshTab();

  const state = await getState();

  if (state.status === STATUS.FINALIZING) {
    await finishFinalize();
    return;
  }

  // Au démarrage, le solde lu déclenche les recherches après une courte pause.
  if (!searchesStarted && state.status === STATUS.SEARCHING && (state.searchesDone || 0) === 0) {
    if (startFallbackTimer) { clearTimeout(startFallbackTimer); startFallbackTimer = null; }
    setTimeout(() => beginSearches().catch(reportError), START_AFTER_POINTS_MS);
  }
});

// --- Déroulé du run ---------------------------------------------------------

async function startRun() {
  searchesStarted = false;
  dashboardTabId = null;
  if (startFallbackTimer) { clearTimeout(startFallbackTimer); startFallbackTimer = null; }

  await broadcastState({
    status: STATUS.SEARCHING,
    searchesDone: 0,
    error: null,
    lastRun: nowIso(),
  });

  // Ouvre le dashboard ; son content script lit le solde puis envoie POINTS_UPDATE.
  try {
    const tab = await browser.tabs.create({ url: URLS.REWARDS_DASHBOARD, active: false });
    dashboardTabId = tab.id;
  } catch (err) {
    await beginSearches();
    return getState();
  }

  startFallbackTimer = setTimeout(() => beginSearches().catch(reportError), SCRAPE_TIMEOUT_MS);
  return getState();
}

// Lance les recherches (idempotent) puis ferme le dashboard.
async function beginSearches() {
  if (searchesStarted) return;
  searchesStarted = true;
  if (startFallbackTimer) { clearTimeout(startFallbackTimer); startFallbackTimer = null; }

  const state = await getState();
  if (state.status !== STATUS.SEARCHING) return;

  const settings = await getSettings();
  if (settings.enableSearches && totalSearches(settings) > 0) {
    await searchTick();
  } else {
    await broadcastState({ status: settings.enableDailyTasks ? STATUS.TASKS : STATUS.DONE });
  }

  closeDashboard();
}

function closeDashboard() {
  if (dashboardTabId == null) return;
  const id = dashboardTabId;
  dashboardTabId = null;
  browser.tabs.remove(id).catch(() => {});
}

// Stoppe le run, réinitialise l'affichage (sauf les points) et relit le solde courant.
async function stopRun() {
  searchesStarted = true;
  if (startFallbackTimer) { clearTimeout(startFallbackTimer); startFallbackTimer = null; }
  if (tasksFallbackTimer) { clearTimeout(tasksFallbackTimer); tasksFallbackTimer = null; }
  if (earnFallbackTimer) { clearTimeout(earnFallbackTimer); earnFallbackTimer = null; }
  if (finalFallbackTimer) { clearTimeout(finalFallbackTimer); finalFallbackTimer = null; }
  await browser.alarms.clear(ALARM_SEARCH);
  closeDashboard();
  closeTasksTab();
  closeEarnTab();
  closeFinalTab();

  await broadcastState({ status: STATUS.IDLE, searchesDone: 0, error: null, lastRun: null });
  await refreshPoints();
  return getState();
}

async function refreshPoints() {
  try {
    const tab = await browser.tabs.create({ url: URLS.REWARDS_DASHBOARD, active: false });
    refreshTabId = tab.id;
    setTimeout(() => closeRefreshTab(), SCRAPE_TIMEOUT_MS);
  } catch (err) { /* ignore */ }
}

function closeRefreshTab() {
  if (refreshTabId == null) return;
  const id = refreshTabId;
  refreshTabId = null;
  browser.tabs.remove(id).catch(() => {});
}

// --- Ensemble du jour -------------------------------------------------------

async function startDailySet() {
  await broadcastState({ status: STATUS.TASKS });
  try {
    const tab = await browser.tabs.create({ url: URLS.REWARDS_DASHBOARD, active: false });
    tasksTabId = tab.id;
  } catch (err) {
    await broadcastState({ status: STATUS.DONE });
    return;
  }
  tasksFallbackTimer = setTimeout(() => finishDailySet().catch(reportError), DAILY_SET_TIMEOUT_MS);
}

async function finishDailySet() {
  if (tasksFallbackTimer) { clearTimeout(tasksFallbackTimer); tasksFallbackTimer = null; }
  closeTasksTab();
  const state = await getState();
  if (state.status === STATUS.TASKS) await startEarn();
}

function closeTasksTab() {
  if (tasksTabId == null) return;
  const id = tasksTabId;
  tasksTabId = null;
  browser.tabs.remove(id).catch(() => {});
}

// --- Continuer à gagner -----------------------------------------------------

async function startEarn() {
  await broadcastState({ status: STATUS.EARN });
  try {
    const tab = await browser.tabs.create({ url: URLS.REWARDS_EARN, active: false });
    earnTabId = tab.id;
  } catch (err) {
    await readFinalScore();
    return;
  }
  earnFallbackTimer = setTimeout(() => finishEarn().catch(reportError), EARN_TIMEOUT_MS);
}

async function finishEarn() {
  if (earnFallbackTimer) { clearTimeout(earnFallbackTimer); earnFallbackTimer = null; }
  closeEarnTab();
  const state = await getState();
  if (state.status === STATUS.EARN) await readFinalScore();
}

function closeEarnTab() {
  if (earnTabId == null) return;
  const id = earnTabId;
  earnTabId = null;
  browser.tabs.remove(id).catch(() => {});
}

// --- Finalisation (score final) ---------------------------------------------

async function readFinalScore() {
  await broadcastState({ status: STATUS.FINALIZING });
  try {
    const tab = await browser.tabs.create({ url: URLS.REWARDS_DASHBOARD, active: false });
    finalTabId = tab.id;
  } catch (err) {
    await broadcastState({ status: STATUS.DONE });
    return;
  }
  finalFallbackTimer = setTimeout(() => finishFinalize().catch(reportError), SCRAPE_TIMEOUT_MS);
}

async function finishFinalize() {
  if (finalFallbackTimer) { clearTimeout(finalFallbackTimer); finalFallbackTimer = null; }
  closeFinalTab();
  const state = await getState();
  if (state.status === STATUS.FINALIZING) await broadcastState({ status: STATUS.DONE });
}

function closeFinalTab() {
  if (finalTabId == null) return;
  const id = finalTabId;
  finalTabId = null;
  browser.tabs.remove(id).catch(() => {});
}

// Une recherche par appel ; l'état est relu depuis le storage car l'event page peut être
// déchargée entre deux alarmes.
async function searchTick() {
  const state = await getState();
  if (state.status !== STATUS.SEARCHING) return;

  const settings = await getSettings();
  const total = totalSearches(settings);
  const done = state.searchesDone || 0;

  if (done >= total) {
    await browser.alarms.clear(ALARM_SEARCH);
    if (settings.enableDailyTasks) await startDailySet();
    else await readFinalScore();
    return;
  }

  const closeMs = getRandomNumber(settings.closeMinMs, settings.closeMaxMs);
  await performSearch(undefined, closeMs);
  await broadcastState({ searchesDone: done + 1 });

  const delayMs = getRandomNumber(settings.minDelayMs, settings.maxDelayMs);
  await browser.alarms.create(ALARM_SEARCH, { delayInMinutes: Math.max(delayMs / 60000, 0.1) });
}

// --- Recherche (par onglets) ------------------------------------------------

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomElement(array) {
  return array[getRandomNumber(0, array.length - 1)];
}

function randomQuery() {
  const count = getRandomNumber(2, 4);
  let s = '';
  for (let i = 0; i < count; i++) s += `${getRandomElement(words)} `;
  return s.trim();
}

async function performSearch(query, closeTime = FALLBACK_CLOSE_MS) {
  const text = query && query.trim() ? query.trim() : randomQuery();
  // Préfixe aléatoire pour varier les requêtes.
  const prefixed = `${Math.random().toString(36).charAt(2)}${text}`;
  const url = `${BING_SEARCH_URL}${encodeURIComponent(prefixed)}${BING_SEARCH_PARAMS}`;
  openAndClose(url, closeTime);
}

function openAndClose(url, closeTime) {
  browser.tabs.create({ url, active: false }).then((tab) => {
    const tabId = tab.id;
    function listener(updatedId, changeInfo) {
      if (updatedId === tabId && changeInfo.status === 'complete') {
        browser.tabs.onUpdated.removeListener(listener);
        waitAndClose(tabId, closeTime);
      }
    }
    browser.tabs.onUpdated.addListener(listener);
  });
}

function waitAndClose(id, timeout = FALLBACK_CLOSE_MS) {
  if (timeout <= 0) timeout = 500;
  setTimeout(() => {
    browser.tabs.get(id).then(() => browser.tabs.remove(id)).catch(() => {});
  }, timeout);
}

// --- Utilitaires ------------------------------------------------------------

async function broadcastState(patch) {
  const next = await setState(patch);
  browser.runtime.sendMessage({ type: MSG.STATE_UPDATE, payload: next }).catch(() => {});
  return next;
}

async function reportError(err) {
  console.error('[AutoMicrosoftRewards]', err);
  await broadcastState({ status: STATUS.ERROR, error: String(err?.message || err) });
}

function nowIso() {
  return new Date().toISOString();
}
