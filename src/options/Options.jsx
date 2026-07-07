import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_SETTINGS } from '../lib/constants.js';
import { getSettings, saveSettings, resetAll } from '../lib/storage.js';

export function Options() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  function update(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function onSave(e) {
    e.preventDefault();
    await saveSettings(settings);
    setSaved(true);
  }

  async function onReset() {
    const ok = window.confirm(
      'Réinitialiser complètement l\'extension ?\n\n'
      + 'Tout le stockage (réglages + progression + points) sera effacé.',
    );
    if (!ok) return;
    await resetAll();
    setSettings({ ...DEFAULT_SETTINGS });
    setSaved(false);
  }

  return (
    <form onSubmit={onSave}>
      <h1>Réglages</h1>

      <fieldset style={fieldset}>
        <legend>Recherches</legend>
        <label style={row}>
          <input
            type="checkbox"
            checked={settings.enableSearches}
            onChange={(e) => update('enableSearches', e.target.checked)}
          />
          Activer les recherches Bing
        </label>
        <NumberField label="Nombre de recherches" value={settings.desktopSearches}
          onInput={(v) => update('desktopSearches', v)} />
      </fieldset>

      <fieldset style={fieldset}>
        <legend>Planification</legend>
        <label style={row}>
          <input
            type="checkbox"
            checked={settings.dailyScheduleEnabled}
            onChange={(e) => update('dailyScheduleEnabled', e.target.checked)}
          />
          Lancer automatiquement chaque jour
        </label>
        {settings.dailyScheduleEnabled && (
          <label style={row}>
            <span style={{ flex: 1 }}>Heure (locale)</span>
            <input
              type="time"
              value={settings.dailyScheduleTime}
              onInput={(e) => update('dailyScheduleTime', e.target.value)}
            />
          </label>
        )}
      </fieldset>

      <fieldset style={fieldset}>
        <legend>Temps entre les recherches (ms)</legend>
        <NumberField label="Minimum" value={settings.minDelayMs}
          onInput={(v) => update('minDelayMs', v)} />
        <NumberField label="Maximum" value={settings.maxDelayMs}
          onInput={(v) => update('maxDelayMs', v)} />
      </fieldset>

      <fieldset style={fieldset}>
        <legend>Temps avant fermeture de l'onglet (ms)</legend>
        <NumberField label="Minimum" value={settings.closeMinMs}
          onInput={(v) => update('closeMinMs', v)} />
        <NumberField label="Maximum" value={settings.closeMaxMs}
          onInput={(v) => update('closeMaxMs', v)} />
      </fieldset>

      <fieldset style={fieldset}>
        <legend>Tâches</legend>
        <label style={row}>
          <input
            type="checkbox"
            checked={settings.enableDailyTasks}
            onChange={(e) => update('enableDailyTasks', e.target.checked)}
          />
          Compléter les tâches quotidiennes / quiz
        </label>
      </fieldset>

      <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
        Enregistrer
      </button>
      {saved && <span style={{ marginLeft: '12px', color: '#16a34a' }}>Enregistré ✓</span>}

      <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #0002' }} />

      <fieldset style={{ ...fieldset, borderColor: '#dc262655' }}>
        <legend style={{ color: '#dc2626' }}>Zone de danger</legend>
        <p style={{ margin: '0 0 12px', opacity: 0.8 }}>
          Efface tout le stockage de l'extension (réglages, progression et points) et
          rétablit les valeurs par défaut.
        </p>
        <button type="button" onClick={onReset}
          style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>
          Réinitialiser l'extension
        </button>
      </fieldset>
    </form>
  );
}

function NumberField({ label, value, onInput }) {
  return (
    <label style={row}>
      <span style={{ flex: 1 }}>{label}</span>
      <input
        type="number"
        min="0"
        value={value}
        onInput={(e) => onInput(Number(e.target.value))}
        style={{ width: '90px' }}
      />
    </label>
  );
}

const fieldset = { border: '1px solid #0002', borderRadius: '8px', margin: '0 0 16px', padding: '12px 16px' };
const row = { display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' };
