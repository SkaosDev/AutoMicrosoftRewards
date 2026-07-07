// Helpers de message passing pour éviter le boilerplate runtime.onMessage / sendMessage.
//
// Convention : chaque message est { type, payload }. Les handlers enregistrés via `on`
// reçoivent (payload, sender) et peuvent renvoyer une valeur (ou une Promise) qui sera
// retournée à l'appelant de `send`.

import browser from 'webextension-polyfill';

/**
 * Envoie un message et attend la réponse.
 * @param {string} type
 * @param {any} [payload]
 * @returns {Promise<any>}
 */
export function send(type, payload) {
  return browser.runtime.sendMessage({ type, payload });
}

/**
 * Envoie un message à un onglet précis (background -> content script).
 * @param {number} tabId
 * @param {string} type
 * @param {any} [payload]
 * @returns {Promise<any>}
 */
export function sendToTab(tabId, type, payload) {
  return browser.tabs.sendMessage(tabId, { type, payload });
}

/**
 * Enregistre un handler pour un type de message donné.
 * Retourne une fonction de désinscription.
 * @param {string} type
 * @param {(payload: any, sender: any) => any} handler
 * @returns {() => void}
 */
export function on(type, handler) {
  const listener = (message, sender) => {
    if (!message || message.type !== type) return undefined;
    // Retourner une Promise indique à l'API qu'une réponse asynchrone suit.
    return Promise.resolve(handler(message.payload, sender));
  };
  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}
