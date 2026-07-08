// Accès à browser.storage.local, avec fusion des valeurs par défaut.

import browser from 'webextension-polyfill';
import { STORAGE_KEYS, DEFAULT_SETTINGS, DEFAULT_STATE } from './constants.js';

export async function getSettings() {
  const stored = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.SETTINGS] || {}) };
}

export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: next });
  return next;
}

export async function getState() {
  const stored = await browser.storage.local.get(STORAGE_KEYS.STATE);
  return { ...DEFAULT_STATE, ...(stored[STORAGE_KEYS.STATE] || {}) };
}

export async function setState(patch) {
  const next = { ...(await getState()), ...patch };
  await browser.storage.local.set({ [STORAGE_KEYS.STATE]: next });
  return next;
}

// Écrit les défauts manquants (à l'installation).
export async function ensureDefaults() {
  const stored = await browser.storage.local.get([STORAGE_KEYS.SETTINGS, STORAGE_KEYS.STATE]);
  const patch = {};
  if (!stored[STORAGE_KEYS.SETTINGS]) patch[STORAGE_KEYS.SETTINGS] = DEFAULT_SETTINGS;
  if (!stored[STORAGE_KEYS.STATE]) patch[STORAGE_KEYS.STATE] = DEFAULT_STATE;
  if (Object.keys(patch).length) await browser.storage.local.set(patch);
}

export async function resetAll() {
  await browser.storage.local.clear();
  await ensureDefaults();
}
