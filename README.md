# Eldrachess

Application web d’entraînement aux échecs : jouez contre Stockfish au niveau Elo de votre choix, avec une barre d’évaluation en direct, un entraîneur qui commente chaque coup et un bilan de fin de partie.

## Fonctionnalités

- **Adversaire réglable de 400 à 3190 Elo** (préréglages Débutant → Stockfish max), Blancs, Noirs ou au hasard.
- **Échiquier interactif** : glisser-déposer ou clic-clic, promotion, navigation dans les coups (boutons ou ← → Début Fin), reprise du dernier coup, et possibilité de rejouer depuis n’importe quelle position passée (nouvelle suite).
- **Barre d’évaluation** à gauche, animée après chaque coup, avec la valeur numérique (+1,5, −0,8, M3…).
- **Entraîneur** à droite : classe chaque coup (meilleur, excellent, bon, imprécision, mauvais coup, gaffe), explique pourquoi (pièce en prise, tactique manquée, mat concédé ou manqué, roi affaibli, perte positionnelle…) et propose la meilleure alternative avec sa variante et une flèche sur l’échiquier. Il signale aussi les erreurs de l’adversaire à exploiter.
- **Temps de lecture** : après votre coup, l’IA attend que l’analyse s’affiche, puis 3 s, 6 s ou votre clic (réglable). Pendant ce temps : reprendre le coup, mettre en pause ou jouer tout de suite (Espace).
- **Thèmes** (bouton ⚙) : 4 thèmes d’interface (Club, Nuit, Acajou, Craie clair), 7 échiquiers et 6 jeux de pièces, mémorisés dans le navigateur.
- **Mode test** (interrupteur ou touche T) : masque instantanément évaluation, conseils et annotations ; l’analyse continue en arrière-plan.
- **Bilan final** : précision des deux camps, courbe d’évaluation cliquable, répartition des coups, moments clés à revoir, thèmes récurrents, précision par phase de jeu et axes de progression.

## Architecture

```
Navigateur
├── React + TypeScript (Vite)          interface
├── chess.js                           règles, FEN/SAN
├── react-chessboard                   échiquier
├── Worker 1 : Stockfish 18 (WASM)     ADVERSAIRE, bridé à l’Elo choisi
└── Worker 2 : Stockfish 18 (WASM)     ANALYSTE, pleine force, profondeur 12/16/20
```

- **100 % client, aucun serveur ni base de données.** Stockfish tourne dans le navigateur (WebAssembly), donc aucune limite de temps d’exécution Vercel et aucun coût serveur. Le site est un simple build statique.
- **Deux moteurs séparés** : le niveau de l’adversaire n’influence jamais la qualité des conseils.
  - Adversaire ≥ 1320 Elo : bridage natif de Stockfish (`UCI_LimitStrength` + `UCI_Elo`).
  - Adversaire < 1320 Elo : recherche peu profonde en MultiPV 8, puis tirage pondéré par la qualité des coups (température plus élevée = erreurs plus humaines).
  - Analyste : `MultiPV 3`, profondeur fixe, résultats en cache par position, la position affichée est analysée en priorité.
- **Classification** : perte de probabilité de gain (formule Lichess) entre le meilleur coup et le coup joué. Seuils : < 2 % excellent, < 5 % bon, < 10 % imprécision, < 20 % mauvais coup, au-delà gaffe.
- **Explications** : les variantes de Stockfish sont rejouées pour mesurer le matériel gagné ou perdu, identifier la pièce qui tombe, détecter les mats et les faiblesses du roi.
- Version **lite single-thread** de Stockfish (≈ 7 Mo) : aucun en-tête COOP/COEP nécessaire, compatible avec tous les navigateurs modernes et le mobile. Le fichier est mis en cache un an par Vercel.
- Préférences (niveau, couleur, profondeur, mode test) gardées dans le `localStorage`.

```
src/
├── engine/Engine.ts       wrapper UCI (Web Worker)
├── engine/opponent.ts     adversaire à Elo réglable
├── engine/analyst.ts      file d’analyse + cache
├── lib/evaluation.ts      scores, % de gain, format
├── lib/coach.ts           classification et explications
├── lib/review.ts          bilan de partie
├── lib/chessUtils.ts      matériel, SAN française, phases
└── components/            EvalBar, CoachPanel, MoveList, dialogues
```

## Démarrer en local

Node 18+ requis.

```bash
npm install      # copie aussi Stockfish dans public/engine
npm run dev      # http://localhost:5173
npm run build    # build de production dans dist/
```

## Versionner sur GitHub

```bash
git init
git add .
git commit -m "Eldrachess : première version"
git branch -M main
git remote add origin https://github.com/<votre-compte>/eldrachess.git
git push -u origin main
```

Les binaires Stockfish ne sont pas versionnés : `npm install` les recopie depuis le paquet npm `stockfish`.

## Déployer sur Vercel

1. Sur vercel.com : **Add New → Project**, importez le dépôt GitHub.
2. Vercel détecte Vite ; `vercel.json` fixe déjà la commande de build (`npm run build`) et le dossier de sortie (`dist`). Aucune variable d’environnement n’est nécessaire.
3. Cliquez **Deploy**. Chaque `git push` sur `main` redéploie automatiquement, chaque branche obtient une URL de prévisualisation.

Ou en ligne de commande : `npx vercel` puis `npx vercel --prod`.

## Raccourcis

| Touche | Action |
| --- | --- |
| ← / → | Coup précédent / suivant |
| Début / Fin | Début de partie / position actuelle |
| T | Basculer conseils / mode test |
| F | Retourner l’échiquier |
| Espace | Laisser l’adversaire jouer tout de suite |
| Échap | Fermer le bilan |

## Licence

Les jeux de pièces proviennent du projet Lichess ; leurs licences (GPLv2+, Apache 2.0, MIT, CC0) sont listées dans `public/pieces/LICENSES.md`.

Stockfish est distribué sous licence GPLv3 (stockfish.js © Chess.com, LLC, d’après le projet Stockfish). L’application le charge comme un fichier séparé ; si vous redistribuez le projet, respectez les obligations de la GPLv3 (mise à disposition du code source).
