// Content script injecté sur rewards.bing.com / account.microsoft.com.
//
// - Attend que la page (SPA) affiche le solde, puis le remonte au background
//   (POINTS_UPDATE) — c'est ce message qui déclenche le lancement des recherches.
// - Point d'accroche pour piloter le daily set et les quiz (TODO).

import { MSG } from '../lib/constants.js';
import { on, send } from '../lib/messaging.js';
import { parsePoints } from '../lib/rewards.js';

// Repères DOM. La page Rewards est une SPA : le solde apparaît après le 1er rendu.
// On localise le <p> "Points disponibles", puis la valeur dans la même carte.
const LABEL_TEXT = 'Points disponibles';
const VALUE_SELECTOR = 'p.text-pageHeader';
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 20000;

// Au chargement : attend l'apparition du solde puis le remonte.
waitForPoints().then((points) => {
  if (points !== null) send(MSG.POINTS_UPDATE, { points }).catch(() => {});
});

// Sur demande explicite (ex. rafraîchissement).
on(MSG.SCRAPE_POINTS, () => ({ points: readPointsBalance() }));

/**
 * Extrait le solde de points affiché.
 * Cherche le <p> "Points disponibles", remonte à la carte qui le contient, puis y
 * lit la valeur (p.text-pageHeader).
 * @returns {number|null}
 */
function readPointsBalance() {
  const label = Array.from(document.querySelectorAll('p'))
    .find((p) => p.textContent.trim().startsWith(LABEL_TEXT));
  if (!label) return null;

  // label -> div (ligne du titre) -> div (carte contenant aussi la valeur).
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

// TODO: détecter les cartes du daily set, les ouvrir, répondre aux quiz/sondages,
//       puis remonter la progression au background.
