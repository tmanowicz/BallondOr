# 🏆 Ballon d'Or — Stats avancées (saison 2025/2026)

Site web qui affiche le classement Ballon d'Or calculé par le barème 2026 :
classement des 60 meilleurs joueurs, fiches détaillées avec progression des
points sur la saison, répartition par catégorie, timeline des faits marquants,
comparateur, et documentation du barème.

Construit avec **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
et **Recharts**.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de production (60 fiches générées en statique)
```

## Architecture

```
pipeline/                     # LE MOTEUR (Python) — hors du site
├── bareme.py                 # calcule les points depuis fotmob.db
├── bareme_ballondor_2026.txt # spécification du barème
└── bareme_manuel.json        # distinctions saisies à la main (UEFA/FIFA)

src/
├── data/
│   └── bareme_events.json    # 👉 SORTIE du pipeline, consommée par le site
├── app/
│   ├── page.tsx              # Classement (podium + tableau)
│   ├── players/[id]/         # Fiche joueur (courbe cumulée, donut, faits marquants)
│   ├── compare/              # Comparateur (progression + points par catégorie)
│   └── bareme/               # Documentation du barème 2026
├── components/
│   ├── CumulChart.tsx        # Courbe des points cumulés
│   └── RepartitionDonut.tsx  # Répartition par catégorie
├── lib/
│   ├── data.ts               # Lecture / agrégation des événements
│   └── events.ts             # Catégorisation des libellés (12 familles)
└── types.ts
```

## Le flux de données

1. Le **pipeline Python** (`pipeline/bareme.py`) lit la base FotMob
   (`fotmob.db`, non versionnée) et le fichier manuel, applique le barème, et
   écrit `bareme_events.json`.
2. Le **site** lit ce JSON. Format :

```jsonc
{
  "saison": "2025/2026",
  "joueurs": [
    { "id": 692984, "nom": "Ousmane Dembélé", "club": "Paris Saint-Germain",
      "team_id": 9847, "minutes": 2663, "total": 314 }
  ],
  "evenements": [
    ["2026-05-30", 692984, 30.0, "homme du match LDC finale"]
    // [date, id joueur, points, libellé]
  ]
}
```

### Mettre à jour les données

Régénère `bareme_events.json` avec le pipeline, puis remplace le fichier dans
`src/data/` — aucun changement de code nécessaire tant que le format est
respecté :

```bash
cd pipeline && py bareme.py --pool 60
cp bareme_events.json ../src/data/bareme_events.json
```

Les 12 catégories d'événements (buts, passes, bonus de phase finale, parcours,
titres, distinctions, hommes du match, meilleure défense, clean sheet…) sont
déduites automatiquement du libellé dans `src/lib/events.ts`. Si le pipeline
introduit un nouveau type de libellé, ajoute-le à `classerEvenement()`.

## Le radar (type FIFA)

Chaque joueur a un **radar** (fiche joueur + comparateur, jusqu'à 5 joueurs
superposés). Faute de stats brutes FotMob dans `bareme_events.json`, les axes
sont un **profil barème par 90 min** (Buts, Passes, Phase finale, Homme du
match, Parcours, Trophées, Distinctions, Défense), chacun normalisé sur 0-100
par rapport au meilleur du vivier. Logique dans `src/lib/radar.ts`.

### Brancher les vrais axes FotMob (xG, dribbles, pressing…)

Pour reproduire exactement un radar façon FIFA (xG/90, xA/90, occasions créées,
dribbles, pressing haut, tacles+int), exporte ces stats depuis `fotmob.db` :

```bash
cd pipeline
py export_radar.py --list-keys      # voir les stat_key réellement dispo
py export_radar.py --champ 53       # ex. Ligue 1, par 90 min
# → écrit src/data/radar_stats.json
```

Une fois `radar_stats.json` en place, adapte les `AXES` de `src/lib/radar.ts`
pour lire ce fichier (les clés d'axes sont déjà prévues côté script).

## Pistes d'évolution

- Graphe de relations entre joueurs (réseau clubs / coéquipiers / nationalités)
- Filtres par club, compétition, période
- Comparaison multi-saisons
- Détail match par match d'un événement (lien vers la source FotMob)
