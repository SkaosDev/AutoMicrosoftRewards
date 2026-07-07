// Wrapper au-dessus de browser.storage.local avec fusion des valeurs par défaut.

import browser from 'webextension-polyfill';
import {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
} from './constants.js';

/**
 * Lit les réglages persistés, fusionnés avec DEFAULT_SETTINGS.
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function getSettings() {
  const stored = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.SETTINGS] || {}) };
}

/**
 * Persiste (partiellement) les réglages.
 * @param {Partial<typeof DEFAULT_SETTINGS>} patch
 * @returns {Promise<typeof DEFAULT_SETTINGS>} les réglages résultants
 */
export async function saveSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: next });
  return next;
}

/**
 * Lit l'état runtime, fusionné avec DEFAULT_STATE.
 * @returns {Promise<typeof DEFAULT_STATE>}
 */
export async function getState() {
  const stored = await browser.storage.local.get(STORAGE_KEYS.STATE);
  return { ...DEFAULT_STATE, ...(stored[STORAGE_KEYS.STATE] || {}) };
}

/**
 * Met à jour (partiellement) l'état runtime.
 * @param {Partial<typeof DEFAULT_STATE>} patch
 * @returns {Promise<typeof DEFAULT_STATE>} l'état résultant
 */
export async function setState(patch) {
  const current = await getState();
  const next = { ...current, ...patch };
  await browser.storage.local.set({ [STORAGE_KEYS.STATE]: next });
  return next;
}

/** Initialise les valeurs par défaut si absentes (appelé à l'installation). */
export async function ensureDefaults() {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.SETTINGS,
    STORAGE_KEYS.STATE,
  ]);
  const patch = {};
  if (!stored[STORAGE_KEYS.SETTINGS]) patch[STORAGE_KEYS.SETTINGS] = DEFAULT_SETTINGS;
  if (!stored[STORAGE_KEYS.STATE]) patch[STORAGE_KEYS.STATE] = DEFAULT_STATE;
  if (Object.keys(patch).length) await browser.storage.local.set(patch);
}

/** Réinitialise complètement l'extension : vide tout le storage et réécrit les défauts. */
export async function resetAll() {
  await browser.storage.local.clear();
  await ensureDefaults();
}
