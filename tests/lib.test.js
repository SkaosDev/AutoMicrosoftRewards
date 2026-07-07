import { describe, it, expect } from 'vitest';
import { parsePoints, progressPercent, totalSearches } from '../src/lib/rewards.js';

describe('parsePoints', () => {
  it('extrait un entier simple', () => {
    expect(parsePoints('1234')).toBe(1234);
  });

  it('gère les séparateurs de milliers', () => {
    expect(parsePoints('1,234')).toBe(1234);
    expect(parsePoints('1 234')).toBe(1234);
    expect(parsePoints('1.234')).toBe(1234);
  });

  it('ignore le texte parasite', () => {
    expect(parsePoints('Vous avez 5 678 points')).toBe(5678);
  });

  it('retourne null sans chiffre', () => {
    expect(parsePoints('aucun point')).toBeNull();
    expect(parsePoints('')).toBeNull();
    expect(parsePoints(null)).toBeNull();
    expect(parsePoints(undefined)).toBeNull();
  });
});

describe('progressPercent', () => {
  it('calcule un pourcentage arrondi', () => {
    expect(progressPercent(1, 4)).toBe(25);
    expect(progressPercent(1, 3)).toBe(33);
  });

  it('borne entre 0 et 100', () => {
    expect(progressPercent(5, 4)).toBe(100);
    expect(progressPercent(-1, 4)).toBe(0);
  });

  it('gère un total nul ou invalide', () => {
    expect(progressPercent(3, 0)).toBe(0);
    expect(progressPercent(3, -2)).toBe(0);
  });
});

describe('totalSearches', () => {
  it('retourne le nombre de recherches desktop', () => {
    expect(totalSearches({ desktopSearches: 30 })).toBe(30);
  });

  it('tolère des champs manquants', () => {
    expect(totalSearches({})).toBe(0);
    expect(totalSearches(undefined)).toBe(0);
  });
});
