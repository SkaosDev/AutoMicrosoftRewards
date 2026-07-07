// Fonctions pures de parsing / calcul liées aux points Rewards.
// Aucune dépendance au DOM ou au navigateur -> testables unitairement.

/**
 * Extrait un nombre de points depuis un texte brut.
 * Gère les séparateurs de milliers ("1,234", "1 234", "1.234") et le texte parasite
 * ("1,234 points"). Retourne null si aucun entier n'est trouvé.
 * @param {string} text
 * @returns {number|null}
 */
export function parsePoints(text) {
  if (typeof text !== 'string') return null;
  // Retire tout sauf chiffres et séparateurs, puis supprime les séparateurs.
  const match = text.match(/\d[\d.,\s ]*/);
  if (!match) return null;
  const digits = match[0].replace(/[.,\s ]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isNaN(value) ? null : value;
}

/**
 * Calcule le pourcentage de progression (0..100, arrondi).
 * @param {number} done
 * @param {number} total
 * @returns {number}
 */
export function progressPercent(done, total) {
  if (!total || total <= 0) return 0;
  const pct = (done / total) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/**
 * Nombre total de recherches attendues d'après les réglages.
 * @param {{ desktopSearches?: number }} settings
 * @returns {number}
 */
export function totalSearches(settings) {
  return Number(settings?.desktopSearches) || 0;
}
