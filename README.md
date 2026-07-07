# AutoMicrosoftRewards

Extension Firefox (Manifest V3) pour automatiser Microsoft Rewards : recherches Bing
(desktop + mobile), tâches quotidiennes / quiz, et dashboard de suivi des points.

> ⚠️ **Avertissement** — L'automatisation de Microsoft Rewards enfreint les conditions
> d'utilisation de Microsoft et peut entraîner la suspension du compte. Ce projet est
> fourni à titre éducatif. Utilisation à vos propres risques.

## Stack

- **JavaScript** (ES modules) + **Vite**
- **Manifest V3** (event page background, Firefox 109+)
- **Preact** pour le popup et la page d'options
- **Vitest** pour les tests unitaires
- `webextension-polyfill` pour une API `browser.*` promisifiée

## Structure

```
src/
├── manifest.js       # Définition du manifest MV3 (objet JS)
├── background/       # Orchestrateur (alarms, routeur de messages, machine à états)
├── content/          # Scripts injectés (recherches Bing, page Rewards)
├── popup/            # Dashboard Preact
├── options/          # Écran de réglages Preact
└── lib/              # Modules partagés (storage, messaging, constants, rewards)
public/icons/         # Icônes (copiées telles quelles dans dist/)
tests/                # Tests Vitest des modules lib
```

## Démarrage

```bash
npm install
npm run build        # Produit dist/ (build unique)
npm run watch        # Reconstruit dist/ à chaque modification (dev)
npm test             # Lance les tests Vitest
```

### Charger l'extension dans TON Firefox (avec ta session Microsoft)

On ne lance **pas** un Firefox « dev » jetable : on charge l'extension dans ton
Firefox habituel, pour bénéficier de ta session Microsoft déjà connectée.

1. `npm run build` (ou `npm run watch` pendant le dev)
2. Dans ton Firefox, ouvrir `about:debugging#/runtime/this-firefox`
3. « Charger un module complémentaire temporaire… »
4. Sélectionner **`dist/manifest.json`**

Après une modif de code (avec `npm run watch` qui a reconstruit `dist/`), il suffit
de cliquer **« Recharger »** sur l'extension dans `about:debugging` — pas besoin de
la re-sélectionner.

> ℹ️ Un module « temporaire » disparaît au **redémarrage** de Firefox : il faut
> refaire l'étape 3-4. C'est normal — Firefox standard n'installe pas d'extension
> non signée de façon permanente. Pour une install permanente, il faut signer
> l'extension (compte AMO) ou utiliser Firefox Developer Edition / Nightly / ESR.

## État du projet

Squelette / scaffold. Les stubs marqués `// TODO` (sélecteurs DOM, timings des
recherches, logique complète des quiz) restent à implémenter.
