# 🏆 Ballon d'Or — Stats avancées

Site web de statistiques avancées pour le Ballon d'Or : classement calculé
selon un barème paramétrable, fiches joueurs détaillées, comparateur avec
graphiques (radars, barres).

Construit avec **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
et **Recharts**.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de production
```

## Structure

```
src/
├── app/
│   ├── page.tsx                 # Classement (podium + tableau)
│   ├── players/[id]/page.tsx    # Fiche joueur (stats, radar, détail du score)
│   └── compare/                 # Comparateur interactif
├── components/
│   ├── RadarStats.tsx           # Graphique radar
│   └── CompareBars.tsx          # Graphiques en barres
├── data/
│   └── players.json             # 👉 TES DONNÉES (voir ci-dessous)
├── lib/
│   ├── data.ts                  # Accès aux données
│   └── scoring.ts               # 👉 TON BARÈME (voir ci-dessous)
└── types.ts                     # Modèle de données
```

## 1. Brancher tes données

Remplace `src/data/players.json` par tes vraies données. Chaque joueur suit
ce format (voir `src/types.ts`) :

```json
{
  "id": "identifiant-unique",
  "name": "Nom du joueur",
  "club": "Club",
  "nationality": "Nationalité",
  "position": "Poste",
  "age": 25,
  "season": "2023-24",
  "stats": {
    "appearances": 40, "goals": 25, "assists": 12, "minutes": 3500,
    "xG": 20.1, "xA": 9.4, "keyPasses": 80, "shots": 110,
    "dribblesCompleted": 60, "passAccuracy": 82.5,
    "tackles": 30, "interceptions": 12, "rating": 7.8
  },
  "trophies": [
    { "name": "Champions League", "scope": "international" },
    { "name": "Ligue 1", "scope": "club" }
  ]
}
```

Si tes données ont un format différent (autres colonnes, CSV, dump SQL...),
donne-moi un échantillon et j'écris le script de conversion.

## 2. Régler ton barème

Tout le calcul des points est dans `src/lib/scoring.ts`, dans l'objet
`DEFAULT_WEIGHTS`. Modifie les poids pour coller à ton barème :

```ts
export const DEFAULT_WEIGHTS: ScoringWeights = {
  perGoal: 2.5,          // points par but
  perAssist: 1.5,        // points par passe décisive
  perKeyPass: 0.1,
  perDribble: 0.15,
  perRatingPointAbove6: 8,
  perExpectedContribution: 0.4,   // par (xG + xA)
  trophyPoints: { club: 6, international: 20, individual: 4 },
  namedTrophyBonus: { "champions league": 15, "world cup": 30, ... },
};
```

Si ton barème repose sur des règles plus complexes (paliers, multiplicateurs
par poste, votes...), colle-le-moi et je réécris la fonction `computeScore`.

## Prochaines étapes possibles

- Graphe de relations entre joueurs (réseau clubs / coéquipiers / nationalités)
- Filtres par saison, poste, championnat
- Historique multi-saisons par joueur
- Import automatique depuis une API de stats
