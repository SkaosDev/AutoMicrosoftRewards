<h1 align="center">AutoMicrosoftRewards</h1>

<p align="center">
  Extension Firefox pour automatiser l'accumulation de points Microsoft Rewards :
  recherches Bing, lecture du solde et suivi depuis un popup.
</p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-blue">
  <img alt="Firefox" src="https://img.shields.io/badge/Firefox-109%2B-orange">
  <img alt="Stack" src="https://img.shields.io/badge/JS-Vite%20%2B%20Preact-yellow">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green">
</p>

---

> [!WARNING]
> **Avertissement.** L'automatisation de Microsoft Rewards est **contraire aux
> [conditions d'utilisation de Microsoft](https://www.microsoft.com/servicesagreement)**
> et peut entraîner la **suspension ou la fermeture de votre compte**, ainsi que la
> perte de vos points. Ce projet est publié à **titre éducatif**, pour illustrer le
> développement d'une extension WebExtension. Vous l'utilisez **à vos propres risques**.

## Fonctionnalités

- 🔎 **Recherches Bing automatiques** — ouvre des onglets de recherche en arrière-plan
  avec des requêtes aléatoires, puis les referme, à un rythme configurable.
- 🗓️ **Ensemble du jour** — après les recherches, ouvre et « clique » les 3 cartes du
  daily set.
- ➕ **Continuer à gagner** — parcourt la page *Continuer à gagner* et n'ouvre que les
  cartes qui rapportent encore des points (badge `+xx`), en ignorant celles déjà faites.
- 💰 **Lecture du solde** — lit le nombre de points disponibles sur le dashboard Rewards
  (au démarrage puis en fin de run) et l'affiche dans le popup (`…` tant qu'il est inconnu).
- ⏰ **Planification quotidienne** — option pour lancer automatiquement l'automatisation
  chaque jour à une heure locale de votre choix.
- ⏹️ **Arrêt à tout moment** — un bouton stoppe le run, réinitialise l'affichage
  (hors points) et relit le score courant.
- 📊 **Popup de suivi** — solde de points, statut du run et progression des recherches.
- ⚙️ **Page de réglages** — nombre de recherches, délais, planification, et
  réinitialisation complète de l'extension.
- 🧩 **Manifest V3** — pensé pour Firefox (109+), sans dépendance à un service externe.

> 🚧 Les quiz/sondages ouverts par les cartes ne sont **pas encore résolus
> automatiquement** (seule l'ouverture est faite) — voir [Feuille de route](#feuille-de-route).

## Stack technique

| Élément      | Choix                                             |
|--------------|---------------------------------------------------|
| Langage      | JavaScript (ES modules)                           |
| Build        | [Vite](https://vitejs.dev/) + `vite-plugin-web-extension` |
| UI           | [Preact](https://preactjs.com/) (popup & options) |
| API navigateur | `webextension-polyfill`                         |
| Tests        | [Vitest](https://vitest.dev/)                     |

## Installation

### Prérequis

- [Node.js](https://nodejs.org/) 18+ et npm
- Firefox 109 ou plus récent

### Build

```bash
git clone https://github.com/SkaosDev/AutoMicrosoftRewards.git
cd AutoMicrosoftRewards
npm install
npm run build      # génère le dossier dist/
```

### Charger l'extension dans Firefox

L'extension se charge dans **votre** Firefox habituel (celui où vous êtes connecté à
votre compte Microsoft) :

1. Ouvrez `about:debugging#/runtime/this-firefox`
2. Cliquez sur **« Charger un module complémentaire temporaire… »**
3. Sélectionnez le fichier **`dist/manifest.json`**

> ℹ️ Un module « temporaire » disparaît au redémarrage de Firefox : il faut refaire
> l'opération. C'est une limite de Firefox pour les extensions non signées. Pour une
> installation permanente, il faut signer l'extension (compte
> [AMO](https://addons.mozilla.org/)) ou utiliser Firefox Developer Edition / Nightly / ESR.

## Utilisation

1. Cliquez sur l'icône de l'extension pour ouvrir le popup.
2. (Optionnel) Ouvrez **Réglages…** pour ajuster le nombre de recherches, les délais
   et la planification.
3. Cliquez sur **Démarrer**. Le run enchaîne alors :
   1. ouverture du dashboard Rewards et lecture du solde (affiché dans le popup) ;
   2. **recherches Bing** (après une courte pause, le dashboard est refermé) ;
   3. **Ensemble du jour** : ouverture des 3 cartes du daily set ;
   4. **Continuer à gagner** : ouverture des cartes restantes qui rapportent des points ;
   5. **finalisation** : relecture du **score final**, puis statut **Terminé**.
4. Pour interrompre, cliquez sur **Arrêter** : le run s'arrête, l'affichage est
   réinitialisé (les points sont conservés) et le score courant est relu.

Le popup suit l'avancement : *Recherches en cours…* → *Tâches quotidiennes…* →
*Continuer à gagner…* → *Finalisation…* → *Terminé*.

### Lancement automatique

Dans **Réglages → Planification**, cochez **« Lancer automatiquement chaque jour »** et
choisissez une heure (**heure locale**, `10:00` par défaut). L'automatisation se
déclenchera seule chaque jour à cette heure.

> ℹ️ Le déclenchement repose sur les alarmes de Firefox : si le navigateur est fermé à
> l'heure prévue, le run démarre au prochain lancement de Firefox.

## Réglages

| Réglage                          | Défaut       | Description                                    |
|----------------------------------|--------------|------------------------------------------------|
| Activer les recherches Bing      | activé       | Active/désactive la partie recherche           |
| Nombre de recherches             | `35`         | Nombre de recherches Bing par run              |
| Temps entre les recherches (min/max) | `7000` / `10000` ms | Délai aléatoire entre deux recherches   |
| Temps avant fermeture (min/max)  | `4000` / `6000` ms  | Délai aléatoire avant de fermer un onglet |
| Lancer automatiquement chaque jour | désactivé  | Planifie un run quotidien à heure fixe         |
| Heure (locale)                   | `10:00`      | Heure du run quotidien (si planification activée) |
| Tâches quotidiennes              | activées     | Ensemble du jour + Continuer à gagner          |

Le bouton **« Réinitialiser l'extension »** (section *Zone de danger*) efface tout le
stockage — réglages, progression et points — et rétablit les valeurs par défaut.

## Développement

```bash
npm run watch      # reconstruit dist/ à chaque modification (sans lancer de navigateur)
npm test           # lance les tests Vitest
```

Pendant le dev, après un changement, cliquez sur **« Recharger »** sur l'extension dans
`about:debugging` — inutile de la re-sélectionner.

### Structure du projet

```
src/
├── manifest.js       # Définition du manifest MV3
├── background/       # Orchestrateur : recherches, alarmes, machine à états
├── content/          # Script Rewards : lecture du solde + clic des cartes (tâches)
├── popup/            # Dashboard Preact
├── options/          # Écran de réglages Preact
└── lib/              # Modules partagés (storage, messaging, constants, rewards)
public/icons/         # Icônes de l'extension
tests/                # Tests unitaires (Vitest)
```

## Feuille de route

- [x] Ouverture automatique de l'Ensemble du jour et de *Continuer à gagner*
- [ ] Résolution automatique des quiz / sondages (pour l'instant seulement ouverts)
- [ ] Signature de l'extension pour une installation permanente
- [ ] Robustesse des sélecteurs face aux évolutions du site Rewards

## Avertissement de fragilité

L'extension s'appuie sur la structure HTML actuelle du site Microsoft Rewards : libellés
(« Points disponibles », « Ensemble du jour », « Continuer à gagner »), badge de points
`+xx` et certaines classes CSS (`react-aria-DisclosurePanel`, `text-pageHeader`…).
Microsoft peut modifier son site à tout moment et **casser la lecture du solde ou le clic
des cartes** ; les sélecteurs concernés sont regroupés en tête des fichiers
`src/content/rewards-page.js` et `src/background/index.js` pour faciliter les corrections.

De plus, les cartes sont ouvertes via un clic **synthétique** (`isTrusted = false`) :
selon les évolutions de Microsoft, certaines activités pourraient ne pas être créditées.

## Licence

Distribué sous licence **MIT**. Voir le fichier [`LICENSE`](./LICENSE).
