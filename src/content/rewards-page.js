// Content script injecté sur rewards.bing.com / account.microsoft.com.
//
// Selon le statut du run :
//   - EARN  (page /earn)      : clique les cartes "Continuer à gagner" avec un badge +xx.
//   - TASKS (page /dashboard) : lit le solde puis clique les 3 cartes "Ensemble du jour".
//   - autre (dashboard)       : lit simplement le solde (démarrage, arrêt, finalisation).

import { MSG, STATUS } from '../lib/constants.js';
import { on, send } from '../lib/messaging.js';
import { parsePoints } from '../lib/rewards.js';
import { getState, getSettings } from '../lib/storage.js';

// Repères DOM (la page Rewards est une SPA : tout apparaît après le 1er rendu).
const LABEL_TEXT = 'Points disponibles';
const VALUE_SELECTOR = 'p.text-pageHeader';
const DAILY_SET_TITLE = 'Ensemble du jour';
const EARN_TITLE = 'Continuer à gagner';
// Cartes cliquables d'une section (exclut les boutons type « Gagner plus », href=/earn).
const CARD_SELECTOR = '.react-aria-DisclosurePanel a[target="_blank"][href]';
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 20000;

init();

// Sur demande explicite (ex. rafraîchissement).
on(MSG.SCRAPE_POINTS, () => ({ points: readPointsBalance() }));

async function init() {
  const state = await getState();

  // Page "Continuer à gagner" : on ne clique que les cartes qui rapportent des points.
  if (state.status === STATUS.EARN) {
    await runCards(EARN_TITLE, STATUS.EARN, true);
    send(MSG.EARN_DONE, {}).catch(() => {});
    return;
  }

  // Sinon on est sur le dashboard : on lit le solde...
  const points = await waitForPoints();
  if (points !== null) send(MSG.POINTS_UPDATE, { points }).catch(() => {});

  // ...puis, en phase "tâches", on effectue l'Ensemble du jour.
  if (state.status === STATUS.TASKS) {
    await runCards(DAILY_SET_TITLE, STATUS.TASKS, false);
    send(MSG.DAILY_SET_DONE, {}).catch(() => {});
  }
}

// --- Lecture du solde -------------------------------------------------------

/**
 * Extrait le solde de points affiché : <p> "Points disponibles" -> carte parente ->
 * valeur (p.text-pageHeader).
 * @returns {number|null}
 */
function readPointsBalance() {
  const label = Array.from(document.querySelectorAll('p'))
    .find((p) => p.textContent.trim().startsWith(LABEL_TEXT));
  if (!label) return null;
  const card = label.parentElement?.parentElement ?? label.parentElement;
  const valueEl = card?.querySelector(VALUE_SELECTOR) ?? document.querySelector(VALUE_SELECTOR);
  return parsePoints(valueEl?.textContent ?? '');
}

/**
 * Attend que le solde soit lisible (rendu de la SPA), en réessayant jusqu'au timeout.
 * @returns {Promise<number|null>}
 */
function waitForPoints() {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const points = readPointsBalance();
      if (points !== null) return resolve(points);
      if (Date.now() - start >= POLL_TIMEOUT_MS) return resolve(null);
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  });
}

// --- Clic des cartes (Ensemble du jour / Continuer à gagner) ----------------

/**
 * Clique successivement les cartes d'une section (repérée par son <h2>), avec les mêmes
 * délais que les recherches. Si requireBadge, ne clique que les cartes avec un badge "+xx".
 * @param {string} title            libellé du <h2> de section
 * @param {string} expectedStatus   statut attendu (on s'arrête si l'utilisateur stoppe)
 * @param {boolean} requireBadge    n'ouvrir que les cartes qui rapportent des points
 */
async function runCards(title, expectedStatus, requireBadge) {
  const cards = await waitForCards(title, requireBadge);
  const settings = await getSettings();

  for (const a of cards) {
    // Stop demandé entre-temps ?
    const st = await getState();
    if (st.status !== expectedStatus) break;

    // Retire noopener pour que l'onglet ouvert soit rattaché à cet onglet (le background
    // peut alors le refermer), puis effectue un vrai clic sur le lien.
    a.rel = '';
    a.target = '_blank';
    a.click();

    // Laisse la page ouverte, puis pause avant la suivante (mêmes bornes que les recherches).
    const closeMs = randBetween(settings.closeMinMs, settings.closeMaxMs);
    const delayMs = randBetween(settings.minDelayMs, settings.maxDelayMs);
    await sleep(closeMs + delayMs);
  }
}

/** Cartes <a> de la section repérée par son <h2> (filtrées sur le badge "+xx" si demandé). */
function findCards(title, requireBadge) {
  const h2 = findSectionHeading(title);
  if (!h2) return [];
  const container = h2.closest('.react-aria-Disclosure') ?? h2.parentElement;
  if (!container) return [];
  const cards = Array.from(container.querySelectorAll(CARD_SELECTOR));
  return requireBadge ? cards.filter(hasPointsBadge) : cards;
}

/** Vrai si la carte affiche un badge de points à gagner ("+15", "+10", …). */
function hasPointsBadge(a) {
  return Array.from(a.querySelectorAll('p'))
    .some((p) => /^\+\s*\d+/.test(p.textContent.trim()));
}

function findSectionHeading(title) {
  return Array.from(document.querySelectorAll('h2'))
    .find((h) => h.textContent.trim().startsWith(title));
}

/** Attend que la section soit rendue (≥ 1 carte), puis renvoie les cartes filtrées. */
function waitForCards(title, requireBadge) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const h2 = findSectionHeading(title);
      const container = h2 ? (h2.closest('.react-aria-Disclosure') ?? h2.parentElement) : null;
      if (container?.querySelector(CARD_SELECTOR)) return resolve(findCards(title, requireBadge));
      if (Date.now() - start >= POLL_TIMEOUT_MS) return resolve(findCards(title, requireBadge));
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  });
}

// --- Utilitaires ------------------------------------------------------------

function randBetween(min, max) {
  const lo = Number(min) || 0;
  const hi = Number(max) || lo;
  return Math.floor(Math.random() * (hi - lo + 1) + lo);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// TODO: répondre automatiquement aux quiz/sondages ouverts par les cartes.
