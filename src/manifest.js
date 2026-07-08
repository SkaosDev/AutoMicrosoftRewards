// Manifest V3 (Firefox).

export default {
  manifest_version: 3,
  name: 'AutoMicrosoftRewards',
  version: '0.1.0',
  description: 'Automatise Microsoft Rewards : recherches Bing, tâches quotidiennes, suivi des points.',

  browser_specific_settings: {
    gecko: {
      id: 'auto-microsoft-rewards@local',
      strict_min_version: '109.0',
    },
  },

  permissions: ['storage', 'alarms', 'tabs', 'scripting'],

  host_permissions: [
    'https://www.bing.com/*',
    'https://rewards.bing.com/*',
    'https://account.microsoft.com/*',
  ],

  background: {
    scripts: ['src/background/index.js'],
    type: 'module',
  },

  action: {
    default_title: 'AutoMicrosoftRewards',
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },

  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },

  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },

  content_scripts: [
    {
      matches: ['https://rewards.bing.com/*', 'https://account.microsoft.com/*'],
      js: ['src/content/rewards-page.js'],
      run_at: 'document_idle',
    },
  ],
};
