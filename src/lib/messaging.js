// Message passing : chaque message est { type, payload }.

import browser from 'webextension-polyfill';

export function send(type, payload) {
  return browser.runtime.sendMessage({ type, payload });
}

// Enregistre un handler pour un type de message ; retourne une fonction de désinscription.
export function on(type, handler) {
  const listener = (message, sender) => {
    if (!message || message.type !== type) return undefined;
    return Promise.resolve(handler(message.payload, sender));
  };
  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}
