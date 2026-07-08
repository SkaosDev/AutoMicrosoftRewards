// Fonctions pures liées aux points (testables sans DOM ni navigateur).

// Extrait un entier d'un texte, en gérant les séparateurs de milliers ("1 234", "1,234").
export function parsePoints(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/\d[\d.,\s ]*/);
  if (!match) return null;
  const digits = match[0].replace(/[.,\s ]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isNaN(value) ? null : value;
}

// Progression en pourcentage (0..100, arrondi).
export function progressPercent(done, total) {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

export function totalSearches(settings) {
  return Number(settings?.desktopSearches) || 0;
}
