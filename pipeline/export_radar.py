#!/usr/bin/env python3
"""
Export des stats "radar" avancees (facon FIFA) depuis fotmob.db, par 90 min.

bareme_events.json ne contient QUE les evenements de points (buts, passes,
trophees...). Les stats brutes FotMob (xG, dribbles, pressing, tacles...) sont
dans fotmob.db. Ce script les agrege par joueur, les ramene a 90 minutes, et
ecrit src/data/radar_stats.json.

Des que ce fichier existe et contient des joueurs, le site bascule
AUTOMATIQUEMENT le radar sur ces vrais axes (voir src/lib/radar.ts).

Par defaut on ne compte que les matchs de CHAMPIONNAT (comme le radar de
reference), tous championnats confondus : chaque joueur est donc mesure sur son
championnat domestique.

Usage :
    py export_radar.py                 # championnats domestiques (defaut)
    py export_radar.py --all           # toutes competitions
    py export_radar.py --champ 53      # un championnat precis (Ligue 1)
    py export_radar.py --list-keys     # affiche les stat_key disponibles

Sortie : ../src/data/radar_stats.json
"""

import json
import pathlib
import sqlite3
import sys
from collections import defaultdict

DB_PATH = pathlib.Path("fotmob.db")
SORTIE = pathlib.Path("../src/data/radar_stats.json")

# Les cinq grands + championnats hors top 5 presents dans la base (memes id
# que bareme.py). Sert au filtre "championnats domestiques" par defaut.
CHAMPIONNATS = {47, 87, 55, 54, 53, 57, 61, 71, 130}

# Axe du radar -> stat_key(s) FotMob a sommer (verifiees via --list-keys).
# Chaque valeur exportee est deja ramenee a 90 minutes.
AXES = {
    "buts": ["goals"],
    "xg": ["expected_goals"],
    "xa": ["expected_assists"],
    "occasions_creees": ["chances_created"],
    "dribbles": ["dribbles_succeeded"],
    # Proxy de pressing haut : recuperations de balle (pas de cle "dernier
    # tiers" isolee dans v_stat). Remplace par la bonne cle si tu l'ajoutes.
    "pressing_haut": ["recoveries"],
    "tacles_int": ["matchstats.headers.tackles", "interceptions"],
    "buts_passes": ["goals", "assists"],
}

MIN_MINUTES = 600  # ~7 matchs, pour eviter les /90 aberrants sur petit volume


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit("fotmob.db introuvable (lance depuis le dossier pipeline/).")
    conn = sqlite3.connect(DB_PATH)

    if "--list-keys" in sys.argv:
        for k, n in conn.execute(
            "SELECT stat_key, COUNT(*) FROM v_stat GROUP BY stat_key ORDER BY 2 DESC"
        ):
            print(f"  {k:<34} {n}")
        return

    if "--all" in sys.argv:
        filtre, params = "", ()
    elif "--champ" in sys.argv:
        filtre = "AND m.parent_league_id = ?"
        params = (int(sys.argv[sys.argv.index("--champ") + 1]),)
    else:  # defaut : championnats domestiques
        filtre = "AND m.parent_league_id IN (%s)" % ",".join(map(str, CHAMPIONNATS))
        params = ()

    voulues = {k for cles in AXES.values() for k in cles} | {"minutes_played"}
    minutes = defaultdict(float)
    brut = defaultdict(lambda: defaultdict(float))
    noms = {}

    q = f"""SELECT s.player_id, s.player_name, s.stat_key, s.value
            FROM v_stat s JOIN v_match m ON m.match_id = s.match_id
            WHERE s.value != 0 {filtre}"""
    for pid, nom, cle, val in conn.execute(q, params):
        if cle not in voulues:
            continue
        noms[pid] = nom
        if cle == "minutes_played":
            minutes[pid] += val
        else:
            brut[pid][cle] += val
    conn.close()

    joueurs = []
    for pid, mins in minutes.items():
        if mins < MIN_MINUTES:
            continue
        axes = {
            axe: round(sum(brut[pid].get(c, 0.0) for c in cles) / mins * 90, 3)
            for axe, cles in AXES.items()
        }
        joueurs.append({"id": pid, "nom": noms[pid], "minutes": round(mins), **axes})

    joueurs.sort(key=lambda j: -j["buts_passes"])
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(
        json.dumps({"par": "90min", "joueurs": joueurs}, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"{len(joueurs)} joueurs -> {SORTIE}")


if __name__ == "__main__":
    main()
