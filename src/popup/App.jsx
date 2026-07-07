import { useEffect, useState } from 'preact/hooks';
import browser from 'webextension-polyfill';
import { MSG, STATUS, DEFAULT_STATE } from '../lib/constants.js';
import { send } from '../lib/messaging.js';
import { progressPercent, totalSearches } from '../lib/rewards.js';
import { getSettings } from '../lib/storage.js';

const STATUS_LABEL = {
  [STATUS.IDLE]: 'En attente',
  [STATUS.SEARCHING]: 'Recherches en cours…',
  [STATUS.TASKS]: 'Tâches quotidiennes…',
  [STATUS.DONE]: 'Terminé',
  [STATUS.ERROR]: 'Erreur',
};

export function App() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    send(MSG.GET_STATE).then(setState).catch(() => {});
    getSettings().then((s) => setTotal(totalSearches(s))).catch(() => {});

    // Écoute les diffusions d'état du background.
    const listener = (message) => {
      if (message?.type === MSG.STATE_UPDATE) setState(message.payload);
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  const running = state.status === STATUS.SEARCHING || state.status === STATUS.TASKS;
  const pct = progressPercent(state.searchesDone || 0, total);

  return (
    <div>
      <h1 style={{ fontSize: '16px', margin: '0 0 12px' }}>AutoMicrosoftRewards</h1>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '28px', fontWeight: 700 }}>
          {(state.points ?? 0).toLocaleString('fr-FR')}
        </div>
        <div style={{ opacity: 0.7 }}>points</div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        Statut : <strong>{STATUS_LABEL[state.status] || state.status}</strong>
      </div>

      <div style={{ marginBottom: '12px' }}>
        Recherches : {state.searchesDone || 0} / {total} ({pct}%)
        <div style={{ height: '6px', background: '#0002', borderRadius: '3px', marginTop: '4px' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', borderRadius: '3px' }} />
        </div>
      </div>

      {state.error && (
        <div style={{ color: '#dc2626', marginBottom: '8px' }}>⚠️ {state.error}</div>
      )}

      <button
        onClick={() => send(MSG.START).then(setState)}
        disabled={running}
        style={btnStyle(!running)}
      >
        {running ? 'En cours…' : 'Démarrer'}
      </button>

      <button
        onClick={() => browser.runtime.openOptionsPage()}
        style={{ marginTop: '12px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0 }}
      >
        Réglages…
      </button>
    </div>
  );
}

function btnStyle(enabled) {
  return {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: 'none',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.5,
    background: '#3b82f6',
    color: '#fff',
    fontWeight: 600,
  };
}
