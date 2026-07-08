// Content script Rewards : lit le solde et clique les cartes selon la phase du run.

import { MSG, STATUS } from '../lib/constants.js';
import { on, send } from '../lib/messaging.js';
import { parsePoints } from '../lib/rewards.js';
import { getState, getSettings } from '../lib/storage.js';

const LABEL_TEXT = 'Points disponibles';
const VALUE_SELECTOR = 'p.text-pageHeader';
const DAILY_SET_TITLE = 'Ensemble du jour';
const EARN_TITLE = 'Continuer à gagner';
const CARD_SELECTOR = '.react-aria-DisclosurePanel a[target="_blank"][href]';
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 20000;

init();
on(MSG.SCRAPE_POINTS, () => ({ points: readPointsBalance() }));

async function init() {
  const state = await getState();

  if (state.status === STATUS.EARN) {
    await runCards(EARN_TITLE, STATUS.EARN, true);
    send(MSG.EARN_DONE, {}).catch(() => {});
    return;
  }

  const points = await waitForPoints();
  if (points !== null) send(MSG.POINTS_UPDATE, { points }).catch(() => {});

  if (state.status === STATUS.TASKS) {
    await runCards(DAILY_SET_TITLE, STATUS.TASKS, false);
    send(MSG.DAILY_SET_DONE, {}).catch(() => {});
  }
}

// --- Solde ------------------------------------------------------------------

// <p> "Points disponibles" -> carte parente -> valeur (p.text-pageHeader).
function readPointsBalance() {
  const label = Array.from(document.querySelectorAll('p'))
    .find((p) => p.textContent.trim().startsWith(LABEL_TEXT));
  if (!label) return null;
  const card = label.parentElement?.parentElement ?? label.parentElement;
  const valueEl = card?.querySelector(VALUE_SELECTOR) ?? document.querySelector(VALUE_SELECTOR);
  return parsePoints(valueEl?.textContent ?? '');
}

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

// --- Cartes (Ensemble du jour / Continuer à gagner) -------------------------

// Clique les cartes d'une section, avec les mêmes délais que les recherches.
// requireBadge : ne cliquer que les cartes affichant un badge "+xx".
async function runCards(title, expectedStatus, requireBadge) {
  const cards = await waitForCards(title, requireBadge);
  const settings = await getSettings();

  for (const a of cards) {
    const st = await getState();
    if (st.status !== expectedStatus) break;

    // Sans noopener, l'onglet ouvert est rattaché à celui-ci (le background le referme).
    a.rel = '';
    a.target = '_blank';
    a.click();

    const closeMs = randBetween(settings.closeMinMs, settings.closeMaxMs);
    const delayMs = randBetween(settings.minDelayMs, settings.maxDelayMs);
    await sleep(closeMs + delayMs);
  }
}

function findCards(title, requireBadge) {
  const h2 = findSectionHeading(title);
  if (!h2) return [];
  const container = h2.closest('.react-aria-Disclosure') ?? h2.parentElement;
  if (!container) return [];
  const cards = Array.from(container.querySelectorAll(CARD_SELECTOR));
  return requireBadge ? cards.filter(hasPointsBadge) : cards;
}

// Badge de points à gagner ("+15", "+10"…). Les cartes déjà faites affichent "5" sans "+".
function hasPointsBadge(a) {
  return Array.from(a.querySelectorAll('p'))
    .some((p) => /^\+\s*\d+/.test(p.textContent.trim()));
}

function findSectionHeading(title) {
  return Array.from(document.querySelectorAll('h2'))
    .find((h) => h.textContent.trim().startsWith(title));
}

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
