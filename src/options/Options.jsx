import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_SETTINGS } from '../lib/constants.js';
import { getSettings, saveSettings } from '../lib/storage.js';

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
          Activer les recherches automatiques
        </label>
        <NumberField label="Nombre de recherches" value={settings.desktopSearches}
          onInput={(v) => update('desktopSearches', v)} />
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
