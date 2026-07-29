#!/usr/bin/env python3
"""
Export des stats "radar" avancees depuis fotmob.db, par 90 minutes.

Le site sait afficher un radar type FIFA. Par defaut il le construit sur le
PROFIL BAREME (buts, passes, parcours, trophees...) parce que les statistiques
brutes FotMob (xG, dribbles, pressing haut, tacles+interceptions...) ne sont
PAS dans bareme_events.json.

Ce script comble ce manque : il agrege v_stat par joueur, ramene les valeurs a
90 minutes, et ecrit src/data/radar_stats.json. Il suffit ensuite de brancher
ce fichier dans le radar (voir README).

Usage :
    py export_radar.py                 # tous les matchs
    py export_radar.py --champ 53      # un championnat precis (ex. Ligue 1)
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

# Axes du radar FIFA -> stat_key(s) FotMob a sommer. Adapte les cles a droite
# a ce que `--list-keys` te montre reellement dans ta base.
AXES = {
    "buts": ["goals"],
    "xg": ["expected_goals", "xg"],
    "xa": ["expected_assists", "xa"],
    "occasions_creees": ["chances_created", "big_chances_created"],
    "dribbles": ["dribbles_succeeded", "successful_dribbles"],
    "pressing_haut": ["ball_recoveries_final_third", "high_turnovers_won"],
    "tacles_int": ["tackles_won", "interceptions"],
    "buts_passes": ["goals", "assists"],
}


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit("fotmob.db introuvable (lance depuis le dossier pipeline/).")
    conn = sqlite3.connect(DB_PATH)

    if "--list-keys" in sys.argv:
        rows = conn.execute(
            "SELECT stat_key, COUNT(*) FROM v_stat GROUP BY stat_key ORDER BY 2 DESC"
        ).fetchall()
        print("stat_key disponibles dans v_stat :")
        for k, n in rows:
            print(f"  {k:<32} {n}")
        return

    champ = None
    if "--champ" in sys.argv:
        champ = int(sys.argv[sys.argv.index("--champ") + 1])

    # Minutes par joueur (pour le /90) et somme de chaque stat_key utile.
    voulues = {k for cles in AXES.values() for k in cles} | {"minutes_played"}
    minutes = defaultdict(float)
    brut = defaultdict(lambda: defaultdict(float))
    noms = {}

    q = """SELECT s.player_id, s.player_name, s.stat_key, s.value
           FROM v_stat s JOIN v_match m ON m.match_id = s.match_id
           WHERE s.value > 0"""
    params: tuple = ()
    if champ is not None:
        q += " AND m.parent_league_id = ?"
        params = (champ,)

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
        if mins < 450:  # au moins ~5 matchs
            continue
        axes = {}
        for axe, cles in AXES.items():
            somme = sum(brut[pid].get(c, 0.0) for c in cles)
            axes[axe] = round(somme / mins * 90, 3)
        joueurs.append({"id": pid, "nom": noms[pid], "minutes": round(mins), **axes})

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(
        json.dumps({"par": "90min", "champ": champ, "joueurs": joueurs},
                   ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"{len(joueurs)} joueurs -> {SORTIE}")


if __name__ == "__main__":
    main()
