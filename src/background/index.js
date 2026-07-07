// Background event page — orchestrateur + moteur de recherche Bing.
//
// Le moteur fonctionne "par onglets" : pour chaque recherche, on ouvre un onglet Bing
// en arrière-plan sur l'URL de résultats, puis on le referme après un court délai.
// Ces API (browser.tabs / browser.alarms) ne sont disponibles QUE dans le background —
// c'est pourquoi cette logique vit ici et non dans un content script.
//
// Responsabilités :
//   - Initialiser les valeurs par défaut à l'installation.
//   - Router les messages venant du popup / des content scripts.
//   - Piloter une machine à états simple : idle -> searching -> tasks -> done.
//   - Enchaîner les recherches via l'alarme ALARM_SEARCH.

import browser from 'webextension-polyfill';
import { MSG, STATUS, URLS, STORAGE_KEYS } from '../lib/constants.js';
import { on } from '../lib/messaging.js';
import { ensureDefaults, getState, setState, getSettings } from '../lib/storage.js';
import { totalSearches } from '../lib/rewards.js';

const ALARM_DAILY = 'daily-run';
const ALARM_SEARCH = 'openTabAlarm';

// --- Constantes de recherche ------------------------------------------------

const BING_SEARCH_URL = 'https://www.bing.com/search?q=';
const BING_SEARCH_PARAMS = '&qs=n&form=QBLH&sp=-1&pq=';
// Délai de fermeture d'onglet par défaut (ms) si les réglages n'en fournissent pas.
const FALLBACK_CLOSE_MS = 5000;

// Démarrage : pause après lecture du solde avant de lancer les recherches, et filet
// de sécurité si la lecture du solde n'aboutit pas.
const START_AFTER_POINTS_MS = 3000;
const SCRAPE_TIMEOUT_MS = 15000;

// État de démarrage (en mémoire ; le run reste actif tant que la page vit).
let dashboardTabId = null;
let searchesStarted = false;
let startFallbackTimer = null;
// Onglet Rewards ouvert juste pour relire le solde (à l'arrêt).
let refreshTabId = null;

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

// Au démarrage du navigateur, on (re)cale l'alarme quotidienne.
browser.runtime.onStartup.addListener(() => scheduleDailyAlarm().catch(reportError));

// Quand les réglages changent (page d'options), on replanifie l'alarme quotidienne.
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
    scheduleDailyAlarm().catch(reportError);
  }
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_DAILY) startRun().catch(reportError);
  else if (alarm.name === ALARM_SEARCH) searchTick().catch(reportError);
});

// --- Planification quotidienne ----------------------------------------------

/** (Re)planifie le lancement quotidien selon les réglages, en heure locale. */
async function scheduleDailyAlarm() {
  await browser.alarms.clear(ALARM_DAILY);
  const settings = await getSettings();
  if (!settings.dailyScheduleEnabled) return;
  await browser.alarms.create(ALARM_DAILY, {
    when: nextDailyTime(settings.dailyScheduleTime || '10:00'),
    periodInMinutes: 24 * 60,
  });
}

/**
 * Prochain instant (timestamp ms) correspondant à l'heure locale "HH:MM" : aujourd'hui
 * si c'est encore à venir, sinon demain.
 * @param {string} hhmm
 * @returns {number}
 */
function nextDailyTime(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime();
}

// --- Routeur de messages ----------------------------------------------------

on(MSG.START, () => startRun());
on(MSG.STOP, () => stopRun());
on(MSG.GET_STATE, () => getState());

on(MSG.POINTS_UPDATE, async (payload) => {
  const points = Number(payload?.points);
  if (!Number.isNaN(points)) await broadcastState({ points });

  // Si on avait ouvert Rewards juste pour relire le solde (à l'arrêt), on referme.
  closeRefreshTab();

  // Pendant le démarrage : dès que le solde arrive, on lance les recherches après une pause.
  if (!searchesStarted) {
    const state = await getState();
    if (state.status === STATUS.SEARCHING && (state.searchesDone || 0) === 0) {
      if (startFallbackTimer) { clearTimeout(startFallbackTimer); startFallbackTimer = null; }
      setTimeout(() => beginSearches().catch(reportError), START_AFTER_POINTS_MS);
    }
  }
});

// --- Machine à états --------------------------------------------------------

async function startRun() {
  // Réinitialise l'état de démarrage.
  searchesStarted = false;
  dashboardTabId = null;
  if (startFallbackTimer) { clearTimeout(startFallbackTimer); startFallbackTimer = null; }

  await broadcastState({
    status: STATUS.SEARCHING,
    searchesDone: 0,
    error: null,
    lastRun: nowIso(),
  });

  // 1. Ouvre le dashboard Rewards. Son content script attend le chargement, lit le
  //    solde puis envoie POINTS_UPDATE — ce qui déclenche les recherches (handler ci-dessus).
  try {
    const tab = await browser.tabs.create({ url: URLS.REWARDS_DASHBOARD, active: false });
    dashboardTabId = tab.id;
  } catch (err) {
    // Si l'ouverture échoue, on lance quand même les recherches.
    await beginSearches();
    return getState();
  }

  // 2. Filet de sécurité : si le solde n'arrive pas, on démarre après un délai.
  startFallbackTimer = setTimeout(() => beginSearches().catch(reportError), SCRAPE_TIMEOUT_MS);
  return getState();
}

/**
 * Démarre effectivement les recherches (après lecture du solde + pause), puis ferme le
 * dashboard pendant la première recherche. Idempotent grâce au drapeau searchesStarted.
 */
async function beginSearches() {
  if (searchesStarted) return;
  searchesStarted = true;
  if (startFallbackTimer) { clearTimeout(startFallbackTimer); startFallbackTimer = null; }

  const state = await getState();
  if (state.status !== STATUS.SEARCHING) return;

  const settings = await getSettings();
  if (settings.enableSearches && totalSearches(settings) > 0) {
    await searchTick(); // ouvre la 1re recherche + planifie la suite
  } else {
    await broadcastState({ status: settings.enableDailyTasks ? STATUS.TASKS : STATUS.DONE });
  }

  // Ferme le dashboard pendant la première recherche.
  closeDashboard();
}

function closeDashboard() {
  if (dashboardTabId == null) return;
  const id = dashboardTabId;
  dashboardTabId = null;
  browser.tabs.remove(id).catch(() => {});
}

/**
 * Arrête l'automatisation : coupe les recherches en cours, réinitialise l'affichage du
 * popup (sauf les points), puis rouvre Rewards pour relire le score réel du moment.
 */
async function stopRun() {
  // Empêche tout (re)démarrage en attente et coupe la boucle de recherche.
  searchesStarted = true;
  if (startFallbackTimer) { clearTimeout(startFallbackTimer); startFallbackTimer = null; }
  await browser.alarms.clear(ALARM_SEARCH);
  closeDashboard();

  // Réinitialise l'état affiché, en conservant les points connus.
  await broadcastState({ status: STATUS.IDLE, searchesDone: 0, error: null, lastRun: null });

  // Relit le solde actuel (les recherches déjà faites ont pu rapporter des points).
  await refreshPoints();
  return getState();
}

/** Ouvre Rewards en arrière-plan pour relire le solde, puis referme l'onglet. */
async function refreshPoints() {
  try {
    const tab = await browser.tabs.create({ url: URLS.REWARDS_DASHBOARD, active: false });
    refreshTabId = tab.id;
    // Filet de sécurité : referme même si la lecture n'aboutit pas.
    setTimeout(() => closeRefreshTab(), SCRAPE_TIMEOUT_MS);
  } catch (err) {
    // Ouverture impossible : on ne fait rien de plus.
  }
}

function closeRefreshTab() {
  if (refreshTabId == null) return;
  const id = refreshTabId;
  refreshTabId = null;
  browser.tabs.remove(id).catch(() => {});
}

/**
 * Une "étape" de recherche : ouvre un onglet de recherche tant que le quota n'est pas
 * atteint, puis planifie l'étape suivante via l'alarme ALARM_SEARCH.
 * Tout est recalculé depuis le storage car l'event page peut être déchargée entre deux
 * déclenchements d'alarme (pas d'état gardé en mémoire).
 */
async function searchTick() {
  const state = await getState();
  if (state.status !== STATUS.SEARCHING) return; // stoppé entre-temps

  const settings = await getSettings();
  const total = totalSearches(settings);
  const done = state.searchesDone || 0;

  if (done >= total) {
    await browser.alarms.clear(ALARM_SEARCH);
    await broadcastState({ status: settings.enableDailyTasks ? STATUS.TASKS : STATUS.DONE });
    return;
  }

  // Temps avant fermeture de l'onglet : aléatoire entre closeMinMs et closeMaxMs.
  const closeMs = getRandomNumber(settings.closeMinMs, settings.closeMaxMs);
  await performSearch(undefined, closeMs);
  await broadcastState({ searchesDone: done + 1 });

  // Temps entre les recherches : délai aléatoire entre minDelayMs et maxDelayMs.
  const delayMs = getRandomNumber(settings.minDelayMs, settings.maxDelayMs);
  await browser.alarms.create(ALARM_SEARCH, { delayInMinutes: Math.max(delayMs / 60000, 0.1) });
}

// --- Moteur de recherche (par onglets) -------------------------------------

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomElement(array) {
  return array[getRandomNumber(0, array.length - 1)];
}

/** Génère une requête aléatoire : 2-4 mots, ou une courte chaîne aléatoire. */
function randomQuery(useWords = true) {
  if (!useWords) return Math.random().toString(36).substring(2, getRandomNumber(5, 8));
  const count = getRandomNumber(2, 4);
  let s = '';
  for (let i = 0; i < count; i++) s += `${getRandomElement(words)} `;
  return s.trim();
}

/**
 * Effectue une recherche Bing pour la requête donnée en ouvrant un onglet en
 * arrière-plan (puis en le refermant) — même mécanique que openTab, mais avec un
 * texte imposé plutôt qu'aléatoire.
 * @param {string} [query]  texte à rechercher ; si vide, une requête aléatoire est générée
 * @param {number} [closeTime]  délai avant fermeture de l'onglet, en ms
 */
async function performSearch(query, closeTime = FALLBACK_CLOSE_MS) {
  const text = query && query.trim() ? query.trim() : randomQuery(true);
  // Préfixe d'un caractère aléatoire, comme openTab (variété / contournement du cache).
  const prefixed = `${Math.random().toString(36).charAt(2)}${text}`;
  const url = `${BING_SEARCH_URL}${encodeURIComponent(prefixed)}${BING_SEARCH_PARAMS}`;
  openAndClose(url, closeTime);
}

/** Variante à requête aléatoire, conservée pour compatibilité avec le reste du code. */
async function openTab(useWords, closeTime) {
  return performSearch(randomQuery(useWords), closeTime);
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

/** Met à jour l'état persisté puis le diffuse au popup (best-effort). */
async function broadcastState(patch) {
  const next = await setState(patch);
  browser.runtime.sendMessage({ type: MSG.STATE_UPDATE, payload: next }).catch(() => {});
  return next;
}

async function reportError(err) {
  // eslint-disable-next-line no-console
  console.error('[AutoMicrosoftRewards] run error:', err);
  await broadcastState({ status: STATUS.ERROR, error: String(err?.message || err) });
}

// new Date().toISOString() est OK ici (contexte runtime réel, pas un test/workflow).
function nowIso() {
  return new Date().toISOString();
}
